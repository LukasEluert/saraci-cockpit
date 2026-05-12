const KEY_AKQUISE = "saraci-show-akquise";
const KEY_PROJEKTE = "saraci-show-projekte";

export const NAV_PREFS_EVENT = "saraci-nav-prefs-changed";

function readBool(key: string, defaultTrue: boolean): boolean {
  if (typeof window === "undefined") return defaultTrue;
  const v = localStorage.getItem(key);
  if (v === null) return defaultTrue;
  return v === "1" || v === "true";
}

export function readShowAkquise(): boolean {
  return readBool(KEY_AKQUISE, true);
}

export function readShowProjekte(): boolean {
  return readBool(KEY_PROJEKTE, true);
}

export function writeShowAkquise(show: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_AKQUISE, show ? "1" : "0");
  window.dispatchEvent(new CustomEvent(NAV_PREFS_EVENT));
}

export function writeShowProjekte(show: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_PROJEKTE, show ? "1" : "0");
  window.dispatchEvent(new CustomEvent(NAV_PREFS_EVENT));
}
