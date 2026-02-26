export type SectionPreloadFn = () => void | Promise<unknown>;

const preloaders = new Map<string, SectionPreloadFn>();

function normalizeId(idOrHash: string) {
  return idOrHash.startsWith('#') ? idOrHash.slice(1) : idOrHash;
}

export function registerSectionPreloader(id: string, preload: SectionPreloadFn) {
  preloaders.set(normalizeId(id), preload);
}

export function unregisterSectionPreloader(id: string, preload?: SectionPreloadFn) {
  const normalized = normalizeId(id);
  const existing = preloaders.get(normalized);
  if (!existing) return;
  if (preload && existing !== preload) return;
  preloaders.delete(normalized);
}

export function preloadSection(idOrHash: string) {
  const normalized = normalizeId(idOrHash);
  preloaders.get(normalized)?.();
}
