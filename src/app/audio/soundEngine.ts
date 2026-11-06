/**
 * All the site's sound: one AudioContext, its buses, loading, one-shots and the two beds. Nothing is
 * created or fetched until the visitor asks for sound, and any failure stays silent and leaves the site
 * as it was. The levels are baked into the files: every bus sits at 1.
 */
const BASE = `${import.meta.env.BASE_URL}sound/`;

export type Bus = 'music' | 'ambience' | 'bird' | 'island' | 'ui';

interface ManifestFile {
  webm: string;
  m4a: string;
  duration: number;
}

export interface ManifestSound {
  category: Bus;
  loop?: boolean;
  loopLength?: number;
  crossfade?: number;
  variants?: string[];
  files: Record<string, ManifestFile>;
}

interface Manifest {
  sounds: Record<string, ManifestSound>;
}

export interface PlayOptions {
  gainDb?: number;
  x?: number; // where it happens on screen, in viewport pixels
  pan?: number; // or the pan itself
  delay?: number; // seconds
}

interface Voice {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

export type SoundLog = (event: { name: string; variant?: string; gainDb?: number; pan?: number; skipped?: string }) => void;

const FADE_OFF_S = 0.6;
const MUSIC_IN_S = 2.5;
const WATERFALL_IN_S = 1.5;
const BED_EASE_S = 0.6;
const ANNOUNCE_LATE_MS = 700; // the first pop is dropped if it would come this long after the click
const MAX_VOICES = 8;
const VOICE_DROP_S = 0.012;
const RATE_SPREAD = 0.025;
const GAIN_SPREAD_DB = 1.5;
const PAN_RANGE = 0.5;
const BED_CHECK_MS = 1000;
const BED_LOOKAHEAD_S = 3;
const AUTOPLAY_ANSWER_MS = 300; // a browser that will not start sound leaves resume() waiting for good

/**
 * Past the hero the music keeps playing, heard from far away: quieter, and with its highs gone, which
 * is what distance does to a sound. It eases slowly so a scroll never sounds like a fader.
 */
const MUSIC_FAR_DB = -14;
const MUSIC_FAR_HZ = 520;
const MUSIC_NEAR_HZ = 20000;
const MUSIC_EASE_S = 0.8;

/**
 * A DynamicsCompressorNode adds fixed make-up gain worked out from its own settings. With the settings
 * below that is 6.41 dB under the threshold (measured), and nothing here may add gain, so it comes
 * straight off again after the limiter.
 */
const LIMITER_MAKEUP_DB = 6.41;

const MIN_GAP_MS: Record<string, number> = { 'wing-flap': 120, 'bird-tweet': 6000, 'bird-song': 4000, 'die-knock': 60, 'pawn-tap': 100 };

/** Loaded first on phones. The music and the waterfall come before these. */
const CORE = ['touch-tap', 'bird-flinch', 'bird-squawk', 'feather-poof', 'bird-scold', 'bird-song', 'bird-tweet', 'wing-flap', 'wing-takeoff', 'wing-landing', 'feet', 'peck'];

const decibels = (db: number) => 10 ** (db / 20);
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
const spread = (amount: number) => (Math.random() * 2 - 1) * amount;

function whenIdle(run: () => void) {
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 3000 });
  else setTimeout(run, 800);
}

/** Half a cosine, so two beds crossing keep the same power. */
function equalPower(rising: boolean) {
  const curve = new Float32Array(64);
  for (let i = 0; i < 64; i += 1) {
    const u = i / 63;
    curve[i] = rising ? Math.sin((u * Math.PI) / 2) : Math.cos((u * Math.PI) / 2);
  }
  return curve;
}

class SoundEngine {
  /** Set by ?sound=debug. */
  log: SoundLog | null = null;
  /** Read by the debug panel. */
  buses: Partial<Record<Bus, GainNode>> = {};
  manifest: Manifest | null = null;

  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private wanted = false;
  private format: 'webm' | 'm4a' = 'webm';
  private buffers = new Map<string, AudioBuffer>();
  private pending = new Map<string, Promise<void>>();
  private groupOf = new Map<string, string>();
  private lastVariant = new Map<string, string>();
  private lastPlayed = new Map<string, number>();
  private voices: Voice[] = [];
  private touchScreen = false;

  private music: AudioBufferSourceNode | null = null;
  private musicGain: GainNode | null = null;
  private musicFilter: BiquadFilterNode | null = null;
  private musicCloseness = 1;
  private bedGain: GainNode | null = null;
  private bedPan: StereoPannerNode | null = null;
  private bedNext = -1;
  private bedTimer = 0;
  private bedLevel = 0;
  private bedPanning = 0;

  private suspendTimer = 0;
  private loading: Promise<void> | null = null;

  /** Has to run inside the visitor's gesture. */
  turnOn({ announce }: { announce: boolean }) {
    this.wanted = true;
    window.clearTimeout(this.suspendTimer);
    try {
      this.ensureContext();
      void this.ctx?.resume().catch(() => {});
      this.setAudioSession();
    } catch {
      return;
    }
    const clickedAt = performance.now();
    if (this.music) this.fadeBus('music', 1, MUSIC_IN_S);
    if (this.bedNext >= 0) this.fadeBus('ambience', 1, WATERFALL_IN_S);
    for (const bus of ['bird', 'island', 'ui'] as const) this.fadeBus(bus, 1, 0.05);
    this.watchBed();

    this.loading ??= this.load();
    if (announce) void this.announce(clickedAt);
  }

  turnOff() {
    this.wanted = false;
    window.clearInterval(this.bedTimer);
    this.bedTimer = 0;
    (Object.keys(this.buses) as Bus[]).forEach((bus) => this.fadeBus(bus, 0, FADE_OFF_S));
    window.clearTimeout(this.suspendTimer);
    this.suspendTimer = window.setTimeout(() => {
      if (!this.wanted) void this.ctx?.suspend().catch(() => {});
    }, FADE_OFF_S * 1000 + 50);
  }

  /** Whether the context is really producing sound yet. A touch that was only a scroll does not start it. */
  get running() {
    return this.ctx?.state === 'running';
  }

  /**
   * Asks whether the browser will play sound with no gesture at all. Most refuse a new visitor, some
   * allow a site the visitor uses a lot or has allowed in its settings. Nothing is downloaded either way.
   */
  async allowedWithoutGesture() {
    try {
      const policy = (navigator as unknown as { getAutoplayPolicy?: (type: string) => string }).getAutoplayPolicy?.('audiocontext');
      if (policy === 'disallowed') return false;
      this.ensureContext();
      const answer = new Promise((resolve) => setTimeout(resolve, AUTOPLAY_ANSWER_MS));
      await Promise.race([this.ctx?.resume(), answer]);
      return this.running;
    } catch {
      return false;
    }
  }

  /** Tried again on each gesture until it takes. */
  nudge() {
    void this.ctx?.resume().catch(() => {});
  }

  // -------------------------------------------------------------------- setting up

  private ensureContext() {
    if (this.ctx) return;
    const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) throw new Error('No Web Audio');
    const ctx = new Context({ latencyHint: 'interactive' });
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -20;
    limiter.knee.value = 12;
    limiter.ratio.value = 4;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;
    const trim = ctx.createGain();
    trim.gain.value = decibels(-LIMITER_MAKEUP_DB);
    const master = ctx.createGain();
    master.connect(limiter).connect(trim).connect(ctx.destination);
    for (const bus of ['music', 'ambience', 'bird', 'island', 'ui'] as const) {
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(master);
      this.buses[bus] = gain;
    }
    this.ctx = ctx;
    this.master = master;
    this.touchScreen = window.matchMedia('(pointer: coarse)').matches;
    this.format = new Audio().canPlayType('audio/webm; codecs="opus"') ? 'webm' : 'm4a';
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  /** Respects the iPhone's silent switch, and mixes with whatever else is playing. */
  private setAudioSession() {
    try {
      const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
      if (session) session.type = 'ambient';
    } catch {
      // Only some browsers have it.
    }
  }

  private onVisibility = () => {
    if (document.hidden) void this.ctx?.suspend().catch(() => {});
    else if (this.wanted) void this.ctx?.resume().catch(() => {});
  };

  private fadeBus(bus: Bus, to: number, seconds: number) {
    const gain = this.buses[bus]?.gain;
    const { ctx } = this;
    if (!gain || !ctx) return;
    const now = ctx.currentTime;
    const from = gain.value;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(from, now);
    gain.linearRampToValueAtTime(to, now + seconds);
  }

  // -------------------------------------------------------------------- loading

  private async load() {
    try {
      const response = await fetch(`${BASE}sound-manifest.json`);
      if (!response.ok) throw new Error('No manifest');
      const manifest = (await response.json()) as Manifest;
      this.manifest = manifest;
      for (const [group, sound] of Object.entries(manifest.sounds)) for (const file of Object.keys(sound.files)) this.groupOf.set(file, group);
      await this.loadGroup('ui-sound-on');
      await this.loadGroup('music');
      if (this.wanted) this.startMusic();
      await this.loadGroup('waterfall');
      if (this.wanted) this.startBed();
      const rest = Object.keys(manifest.sounds).filter((name) => !CORE.includes(name) && !this.pending.has(name));
      whenIdle(() => {
        void this.loadAll(CORE).then(() => (this.touchScreen ? whenIdle(() => void this.loadAll(rest)) : this.loadAll(rest)));
      });
    } catch {
      // Silent: the site stays exactly as it is without sound.
    }
  }

  private async loadAll(groups: string[]) {
    for (const group of groups) await this.loadGroup(group);
  }

  private loadGroup(group: string) {
    let done = this.pending.get(group);
    if (!done) {
      const sound = this.manifest?.sounds[group];
      done = sound ? Promise.all(Object.entries(sound.files).map(([id, file]) => this.loadFile(id, file))).then(() => {}) : Promise.resolve();
      this.pending.set(group, done);
    }
    return done;
  }

  private async loadFile(id: string, file: ManifestFile) {
    for (const format of this.format === 'webm' ? (['webm', 'm4a'] as const) : (['m4a'] as const)) {
      try {
        const response = await fetch(BASE + file[format]);
        if (!response.ok) continue;
        const buffer = await this.ctx!.decodeAudioData(await response.arrayBuffer());
        this.buffers.set(id, buffer);
        return;
      } catch {
        // Some browsers say they play WebM but cannot decode it here. One failure settles it for them all.
        this.format = 'm4a';
      }
    }
    this.log?.({ name: id, skipped: 'could not load' });
  }

  /** The click's small pop. It is the one sound that waits for its file, and only for a moment. */
  private async announce(clickedAt: number) {
    while (!this.pending.has('ui-sound-on')) {
      if (!this.loading || performance.now() - clickedAt > ANNOUNCE_LATE_MS) return;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    await this.pending.get('ui-sound-on');
    if (this.wanted && performance.now() - clickedAt < ANNOUNCE_LATE_MS) this.play('ui-sound-on');
  }

  // -------------------------------------------------------------------- the beds

  private startMusic() {
    const { ctx, buses } = this;
    const sound = this.manifest?.sounds.music;
    const buffer = this.buffers.get('music-oud-loop');
    if (!ctx || this.music || !sound || !buffer || !buses.music) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = 0;
    source.loopEnd = sound.loopLength ?? buffer.duration;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.5;
    filter.frequency.value = this.musicHz();
    const gain = ctx.createGain();
    gain.gain.value = this.musicLevel();
    source.connect(filter).connect(gain).connect(buses.music);
    source.start();
    this.music = source;
    this.musicFilter = filter;
    this.musicGain = gain;
    this.fadeBus('music', 1, MUSIC_IN_S);
  }

  private startBed() {
    const { ctx, buses } = this;
    if (!ctx || this.bedNext >= 0 || !this.buffers.has('ambience-waterfall') || !buses.ambience) return;
    this.bedGain = ctx.createGain();
    this.bedGain.gain.value = this.bedLevel;
    this.bedPan = ctx.createStereoPanner();
    this.bedPan.pan.value = this.bedPanning;
    this.bedGain.connect(this.bedPan).connect(buses.ambience);
    this.bedCopy(ctx.currentTime, false);
    this.fadeBus('ambience', 1, WATERFALL_IN_S);
    this.watchBed();
  }

  /** Each copy starts 2 s before the last one ends, so codec padding can never show as a gap. */
  private bedCopy(at: number, fadeIn: boolean) {
    const { ctx, bedGain } = this;
    const sound = this.manifest?.sounds.waterfall;
    const buffer = this.buffers.get('ambience-waterfall');
    if (!ctx || !bedGain || !sound || !buffer) return;
    const length = sound.loopLength ?? buffer.duration;
    const overlap = sound.crossfade ?? 2;
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    source.connect(gain).connect(bedGain);
    if (fadeIn) gain.gain.setValueCurveAtTime(equalPower(true), at, overlap);
    gain.gain.setValueCurveAtTime(equalPower(false), at + length - overlap, overlap);
    source.start(at, 0, length);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
    this.bedNext = at + length - overlap;
  }

  private watchBed() {
    if (this.bedTimer || this.bedNext < 0) return;
    this.bedTimer = window.setInterval(() => {
      const { ctx } = this;
      if (!ctx || ctx.currentTime < this.bedNext - BED_LOOKAHEAD_S) return;
      this.bedCopy(Math.max(this.bedNext, ctx.currentTime + 0.05), true);
    }, BED_CHECK_MS);
  }

  /** Level and cut-off between the two distances. The cut-off moves evenly in pitch, not in hertz. */
  private musicLevel() {
    return decibels(MUSIC_FAR_DB * (1 - this.musicCloseness));
  }

  private musicHz() {
    return MUSIC_FAR_HZ * (MUSIC_NEAR_HZ / MUSIC_FAR_HZ) ** this.musicCloseness;
  }

  /** 1 close by, 0 far away. Works before the music has started. */
  setMusicCloseness(closeness: number) {
    this.musicCloseness = closeness;
    const { ctx, musicGain, musicFilter } = this;
    if (!ctx || !musicGain || !musicFilter) return;
    musicGain.gain.setTargetAtTime(this.musicLevel(), ctx.currentTime, MUSIC_EASE_S);
    musicFilter.frequency.setTargetAtTime(this.musicHz(), ctx.currentTime, MUSIC_EASE_S);
  }

  /** How much of the island is showing, 0 to 1, and where the fall is. Works before the bed has started. */
  setBed(level: number, x?: number) {
    this.bedLevel = level;
    if (x !== undefined) this.bedPanning = clamp(this.panFor(x), -0.35, 0.35);
    const { ctx, bedGain, bedPan } = this;
    if (!ctx || !bedGain) return;
    bedGain.gain.setTargetAtTime(level, ctx.currentTime, BED_EASE_S);
    bedPan?.pan.setTargetAtTime(this.bedPanning, ctx.currentTime, BED_EASE_S);
  }

  // -------------------------------------------------------------------- one-shots

  private panFor(x: number) {
    const middle = window.innerWidth / 2;
    const pan = clamp(((x - middle) / middle) * PAN_RANGE, -PAN_RANGE, PAN_RANGE);
    return window.matchMedia('(pointer: coarse)').matches ? pan / 2 : pan;
  }

  /** `name` is a sound from the manifest, or one of its files. A sound that is not ready is skipped. */
  play(name: string, { gainDb = 0, x, pan, delay = 0 }: PlayOptions = {}) {
    const { ctx, manifest, buses } = this;
    if (!this.wanted || !ctx || !manifest) {
      this.log?.({ name, skipped: 'sound is off' });
      return;
    }
    const group = manifest.sounds[name] ? name : (this.groupOf.get(name) ?? name);
    const sound = manifest.sounds[group];
    const bus = sound && buses[sound.category];
    if (!sound || !bus) return;
    const nowMs = performance.now();
    const gap = MIN_GAP_MS[group] ?? 0;
    if (gap && nowMs - (this.lastPlayed.get(group) ?? -Infinity) < gap) {
      this.log?.({ name, skipped: 'too soon' });
      return;
    }
    const variant = name === group ? this.pickVariant(group, sound) : name;
    const buffer = variant && this.buffers.get(variant);
    if (!variant || !buffer) {
      this.log?.({ name, skipped: 'not loaded' });
      return;
    }
    this.lastPlayed.set(group, nowMs);
    this.lastVariant.set(group, variant);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = 1 + spread(RATE_SPREAD);
    const level = gainDb + spread(GAIN_SPREAD_DB);
    const gain = ctx.createGain();
    gain.gain.value = decibels(level);
    const panner = ctx.createStereoPanner();
    const position = pan ?? (x === undefined ? 0 : this.panFor(x));
    panner.pan.value = position;
    source.connect(gain).connect(panner).connect(bus);
    source.start(ctx.currentTime + delay);

    const voice = { source, gain };
    this.voices.push(voice);
    if (this.voices.length > MAX_VOICES) this.dropVoice(this.voices[0]);
    source.onended = () => {
      this.voices = this.voices.filter((other) => other !== voice);
      source.disconnect();
      gain.disconnect();
      panner.disconnect();
    };
    this.log?.({ name: group, variant, gainDb: +level.toFixed(1), pan: +position.toFixed(2) });
  }

  private pickVariant(group: string, sound: ManifestSound) {
    const all = sound.variants ?? Object.keys(sound.files);
    const last = this.lastVariant.get(group);
    const others = all.filter((id) => id !== last && this.buffers.has(id));
    const choices = others.length ? others : all.filter((id) => this.buffers.has(id));
    return choices[Math.floor(Math.random() * choices.length)];
  }

  private dropVoice(voice: Voice) {
    const { ctx } = this;
    if (!ctx) return;
    this.voices = this.voices.filter((other) => other !== voice);
    const now = ctx.currentTime;
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
    voice.gain.gain.linearRampToValueAtTime(0, now + VOICE_DROP_S);
    voice.source.stop(now + VOICE_DROP_S);
  }

  /** For the debug panel and the checks. */
  get context() {
    return this.ctx;
  }

  get liveVoices() {
    return this.voices.length;
  }

  get currentFormat() {
    return this.format;
  }
}

export const soundEngine = new SoundEngine();
