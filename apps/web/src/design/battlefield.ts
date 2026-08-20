/* Player-selectable board backdrop. The art lives in `public/battlefield/` as
   WebP and is painted underneath the board; every option ships with its own
   scrim because the pieces on top are light-surfaced and their contrast must not
   depend on the art. A scrim is layered *above* the image in the same
   `background-image` stack, so the same board renders legibly on a bone-white
   marble arena and on a near-black sanctum floor. */

import { useSyncExternalStore, type CSSProperties } from "react";

const STORAGE_KEY = "aegis.battlefield";
const CUSTOM_IMAGE_KEY = "aegis.battlefield.custom";

/** The board surface used before any art shipped; still the default. */
const CLASSIC_SURFACE = "radial-gradient(120% 80% at 50% 50%, var(--ds-surface), var(--ds-background))";

export interface Battlefield {
  id: string;
  label: string;
  /** Undefined for the plain-gradient option, which paints no art. */
  src?: string;
  /** CSS gradient layered over `src` to hold the board's contrast budget. */
  scrim?: string;
}

/** The default option, and the fallback whenever a stored id no longer exists. */
export const CLASSIC_BATTLEFIELD: Battlefield = {
  id: "classic",
  label: "Classic",
};

export const BATTLEFIELDS: readonly Battlefield[] = [
  CLASSIC_BATTLEFIELD,
  {
    id: "sanctum",
    label: "Sanctum",
    src: "/battlefield/aegis-arena-sanctum.webp",
    scrim: "radial-gradient(120% 80% at 50% 50%, rgba(12,14,24,0.30), rgba(12,14,24,0.68))",
  },
  {
    id: "skyfall",
    label: "Skyfall",
    src: "/battlefield/aegis-arena-skyfall.webp",
    scrim: "radial-gradient(120% 80% at 50% 50%, rgba(248,246,242,0.62), rgba(248,246,242,0.40))",
  },
  {
    id: "nexus",
    label: "Nexus",
    src: "/battlefield/aegis-arena-nexus.webp",
    scrim: "radial-gradient(120% 80% at 50% 50%, rgba(8,16,26,0.42), rgba(8,16,26,0.72))",
  },
  {
    id: "stone",
    label: "Stone",
    src: "/battlefield/aegis-arena-stone.webp",
    scrim: "radial-gradient(120% 80% at 50% 50%, rgba(250,249,247,0.55), rgba(250,249,247,0.30))",
  },
  {
    id: "void",
    label: "Void",
    src: "/battlefield/aegis-arena-void.webp",
    scrim: "radial-gradient(120% 80% at 50% 50%, rgba(10,12,20,0.30), rgba(10,12,20,0.60))",
  },
  {
    id: "cloth",
    label: "Playmat",
    src: "/battlefield/aegis-arena-cloth.webp",
    scrim: "radial-gradient(120% 80% at 50% 50%, rgba(250,249,247,0.52), rgba(250,249,247,0.28))",
  },
];

const DEFAULT_ID = CLASSIC_BATTLEFIELD.id;

/** The image the player uploaded, kept as a data URL on this device only. */
export const CUSTOM_BATTLEFIELD_ID = "custom";

const CUSTOM_SCRIM = "radial-gradient(120% 80% at 50% 50%, rgba(12,14,24,0.28), rgba(12,14,24,0.62))";

const listeners = new Set<() => void>();

function readCustomSrc(): string | undefined {
  try {
    return localStorage.getItem(CUSTOM_IMAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

let customSrc = readCustomSrc();

export function getCustomBattlefieldSrc(): string | undefined {
  return customSrc;
}

function knownId(id: string | null): boolean {
  if (id === CUSTOM_BATTLEFIELD_ID) return Boolean(customSrc);
  return BATTLEFIELDS.some((b) => b.id === id);
}

function readId(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return knownId(raw) ? (raw as string) : DEFAULT_ID;
  } catch {
    return DEFAULT_ID;
  }
}

let currentId = readId();

export function getBattlefieldId(): string {
  return currentId;
}

export function setBattlefieldId(id: string): void {
  if (!knownId(id)) return;
  currentId = id;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Preference is cosmetic; a blocked storage still applies for this session.
  }
  for (const listener of listeners) listener();
}

/** Stores the uploaded image and selects it. Throws when storage rejects it. */
export function setCustomBattlefield(dataUrl: string): void {
  localStorage.setItem(CUSTOM_IMAGE_KEY, dataUrl);
  customSrc = dataUrl;
  currentId = CUSTOM_BATTLEFIELD_ID;
  try {
    localStorage.setItem(STORAGE_KEY, CUSTOM_BATTLEFIELD_ID);
  } catch {
    // Preference is cosmetic; a blocked storage still applies for this session.
  }
  for (const listener of listeners) listener();
}

export function clearCustomBattlefield(): void {
  try {
    localStorage.removeItem(CUSTOM_IMAGE_KEY);
  } catch {
    // Nothing to clean up when storage is blocked.
  }
  customSrc = undefined;
  if (currentId === CUSTOM_BATTLEFIELD_ID) setBattlefieldId(DEFAULT_ID);
  else for (const listener of listeners) listener();
}

export function subscribeBattlefield(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function battlefieldById(id: string): Battlefield {
  if (id === CUSTOM_BATTLEFIELD_ID && customSrc) {
    return { id, label: "Custom", src: customSrc, scrim: CUSTOM_SCRIM };
  }
  return BATTLEFIELDS.find((b) => b.id === id) ?? CLASSIC_BATTLEFIELD;
}

/** Board-surface style for a battlefield: scrim over art, or the plain gradient. */
export function battlefieldStyle(id: string): CSSProperties {
  const field = battlefieldById(id);
  return {
    backgroundImage: field.src ? `${field.scrim}, url("${field.src}")` : CLASSIC_SURFACE,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}

/** The selected battlefield's board style, re-rendering when the choice changes. */
export function useBattlefieldStyle(): CSSProperties {
  const id = useSyncExternalStore(subscribeBattlefield, getBattlefieldId, () => DEFAULT_ID);
  return battlefieldStyle(id);
}
