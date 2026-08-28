import { DIGIMON_WORLD_AVATARS, type DigimonWorldAvatarId } from "@aegis/shared";

export { DIGIMON_WORLD_AVATARS };
export type { DigimonWorldAvatarId };

export function digimonAvatarUrl(avatarId: DigimonWorldAvatarId): string {
  return `/avatars/digimon-world-1/${avatarId}.png`;
}
