export interface StudioMotion {
  available: boolean;
  revealIntro(intro: HTMLElement, complete: () => void): boolean;
  start(): void;
  refresh(): void;
}

declare global {
  interface Window {
    studioMotion?: StudioMotion;
  }
}
