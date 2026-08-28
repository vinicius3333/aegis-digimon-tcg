/* Guests no longer pass through an onboarding form: the first visit lands straight
   on the home screen, so the handle, portrait and accent that the board needs are
   generated here and stored on the device. Both are editable later in the player
   menu and in Settings. */

import { COLOR_KEYS, type ColorName } from "./design/theme";
import type { PlayerIdentity } from "./design/primitives";
import { DIGIMON_WORLD_AVATARS, type DigimonWorldAvatarId } from "./account/avatars";

const ADJECTIVES = [
  "Ashen",
  "Verdant",
  "Cobalt",
  "Gilded",
  "Umbral",
  "Tidal",
  "Ember",
  "Storm",
  "Hollow",
  "Crimson",
  "Pale",
  "Iron",
  "Lunar",
  "Vesper",
  "Onyx",
  "Dawn",
];

const NOUNS = [
  "Warden",
  "Tamer",
  "Herald",
  "Drake",
  "Sentinel",
  "Augur",
  "Knell",
  "Mourner",
  "Vow",
  "Cinder",
  "Reverie",
  "Oathkeeper",
  "Wisp",
  "Sable",
  "Quill",
  "Vane",
];

export function randomGuestName(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)] ?? "Vesper";
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)] ?? "Knell";
  return `${adjective}${noun}`;
}

export function randomAvatarId(): DigimonWorldAvatarId {
  const avatar = DIGIMON_WORLD_AVATARS[Math.floor(Math.random() * DIGIMON_WORLD_AVATARS.length)];
  return (avatar ?? DIGIMON_WORLD_AVATARS[0]!).id;
}

/** The board still needs an accent color; it is derived from the portrait instead
    of being a separate choice the player has to make. */
export function accentForAvatar(avatarId: DigimonWorldAvatarId | null, fallback: ColorName): ColorName {
  if (!avatarId) return fallback;
  let hash = 0;
  for (const char of avatarId) hash = (hash * 31 + char.charCodeAt(0)) % 100_000;
  return COLOR_KEYS[hash % COLOR_KEYS.length] ?? fallback;
}

export function newGuestIdentity(base: PlayerIdentity): PlayerIdentity {
  const avatarId = randomAvatarId();
  return {
    ...base,
    name: randomGuestName(),
    color: accentForAvatar(avatarId, "Blue"),
    guestAvatarId: avatarId,
  };
}
