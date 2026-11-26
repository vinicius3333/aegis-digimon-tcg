import { ArenaZone } from "@/game/arena3d/ArenaZone";

export function getArenaZoneDomWidth({
  zone,
  pileWidth,
  raisingWidth,
}: {
  zone: ArenaZone;
  pileWidth: number;
  raisingWidth: number;
}): number {
  return zone === ArenaZone.RAISING.value || zone === ArenaZone.EGGS.value ? raisingWidth : pileWidth;
}
