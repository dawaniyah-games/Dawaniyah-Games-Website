/** ?sound=debug: logs every event, and shows a panel with a play button per sound and the bus meters. */
import { soundEngine, type Bus } from './soundEngine';

const BUSES: Bus[] = ['music', 'ambience', 'bird', 'island', 'ui'];

export function showSoundDebug() {
  const events: unknown[] = [];
  soundEngine.log = (event) => {
    events.push({ ...event, at: Math.round(performance.now()) });
    console.info('[sound]', event);
  };
  (window as unknown as { __sound: unknown }).__sound = { engine: soundEngine, events };

  const panel = document.createElement('div');
  panel.style.cssText =
    'position:fixed;left:8px;bottom:8px;z-index:9999;max-height:60vh;width:230px;overflow:auto;padding:8px;border-radius:8px;background:rgb(20 10 40 / .9);color:#fff;font:11px/1.4 ui-monospace,monospace';
  panel.dir = 'ltr';
  const meters = document.createElement('div');
  const list = document.createElement('div');
  panel.append(meters, list);
  document.body.append(panel);

  const analysers = new Map<Bus, { node: AnalyserNode; bar: HTMLElement }>();
  const data = new Float32Array(1024);
  let listed = false;

  const update = () => {
    requestAnimationFrame(update);
    const { manifest, context, buses } = soundEngine;
    if (manifest && !listed) {
      listed = true;
      for (const name of Object.keys(manifest.sounds)) {
        const button = document.createElement('button');
        button.textContent = `▶ ${name}`;
        button.style.cssText = 'display:block;width:100%;text-align:left;cursor:pointer';
        button.onclick = () => soundEngine.play(name);
        list.append(button);
      }
    }
    if (context && !analysers.size && buses.music) {
      for (const bus of BUSES) {
        const node = context.createAnalyser();
        node.fftSize = 2048;
        buses[bus]?.connect(node);
        const row = document.createElement('div');
        row.textContent = bus;
        const bar = document.createElement('div');
        bar.style.cssText = 'height:4px;width:0;background:#7fe0a0';
        row.append(bar);
        meters.append(row);
        analysers.set(bus, { node, bar });
      }
    }
    analysers.forEach(({ node, bar }) => {
      node.getFloatTimeDomainData(data);
      const rms = Math.sqrt(data.reduce((sum, v) => sum + v * v, 0) / data.length);
      const db = 20 * Math.log10(rms + 1e-6);
      bar.style.width = `${Math.max(0, Math.min(100, ((db + 70) / 60) * 100))}%`;
    });
  };
  update();
}
