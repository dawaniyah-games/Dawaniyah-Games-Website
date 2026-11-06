/**
 * The bird's part in the sound popup: where the popup is, so it can stand on it, and when to leave for
 * the island. The popup and the bird load separately, so either can be ready first.
 */
interface PromptWatcher {
  arrive(card: HTMLElement): void;
  leave(): void;
}

let card: HTMLElement | null = null;
let watcher: PromptWatcher | null = null;
let birdThere = false;
const birdListeners = new Set<() => void>();

/** The popup's perch, while it is open. */
export function setPromptPerch(next: HTMLElement | null) {
  card = next;
  if (next) watcher?.arrive(next);
}

/** The popup has been answered. */
export function leavePrompt() {
  card = null;
  watcher?.leave();
}

export function watchPrompt(next: PromptWatcher) {
  watcher = next;
  if (card) next.arrive(card);
  return () => {
    watcher = null;
  };
}

/** Whether the real bird is on the popup. Until it is, the popup shows a still picture of it. */
export const isBirdOnPrompt = () => birdThere;

export function setBirdOnPrompt(there: boolean) {
  birdThere = there;
  birdListeners.forEach((listener) => listener());
}

export function subscribeBirdOnPrompt(listener: () => void) {
  birdListeners.add(listener);
  return () => {
    birdListeners.delete(listener);
  };
}
