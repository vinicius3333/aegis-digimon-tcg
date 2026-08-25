import { describe, expect, it } from "vitest";
import { getCardDefinition, type ServerEvent } from "@aegis/shared";
import type { DigivolveMechanic } from "@aegis/shared";
import { CUT_IN_MIN_LEVEL, cutInFromEvent } from "./cutIn";

const MEGA = "ST1-11";
const MEGA_ON_PLAY = "AD1-004";
const XROS_MEGA = "AD1-006";
const ROOKIE = "ST1-03";

function digivolved(cardId: string, mechanic: DigivolveMechanic = "normal"): ServerEvent {
  return { kind: "digivolved", seat: 0, permanentId: "p1", cardId, mechanic };
}

describe("cutInFromEvent", () => {
  it("plays nothing while the setting is off", () => {
    expect(cutInFromEvent(digivolved(MEGA), 1, false)).toBeNull();
  });

  it("announces a digivolution at the cut-in level", () => {
    expect(getCardDefinition(MEGA)?.level).toBeGreaterThanOrEqual(CUT_IN_MIN_LEVEL);
    expect(cutInFromEvent(digivolved(MEGA), 7, true)).toMatchObject({
      key: 7,
      cardId: MEGA,
      seat: 0,
      tier: "base",
    });
  });

  it("tiers by the mechanic the server named, not by the card's own data", () => {
    // XROS_MEGA prints a DigiXros requirement, but this play was an ordinary digivolve.
    expect(cutInFromEvent(digivolved(XROS_MEGA), 1, true)).toMatchObject({ tier: "base" });
  });

  it("gives Burst its own tier and its own word", () => {
    expect(cutInFromEvent(digivolved(MEGA, "burst"), 1, true)).toMatchObject({
      tier: "burst",
      label: "game.cutInWordBurst",
    });
  });

  it("renames Blast without moving it off the base tier", () => {
    expect(cutInFromEvent(digivolved(MEGA, "blast"), 1, true)).toMatchObject({
      tier: "base",
      label: "game.cutInWordBlast",
    });
  });

  it("keeps every other mechanic on the base tier", () => {
    for (const mechanic of ["normal", "alternate", "baseGranted"] as const) {
      expect(cutInFromEvent(digivolved(MEGA, mechanic), 1, true)).toMatchObject({ tier: "base" });
    }
  });

  it("gives a DigiXros play its own tier", () => {
    const played: ServerEvent = {
      kind: "cardPlayed",
      seat: 0,
      cardId: XROS_MEGA,
      permanentId: "p9",
      mechanic: "digiXros",
    };
    expect(cutInFromEvent(played, 1, true)).toMatchObject({ tier: "digiXros" });
  });

  it("gives a DNA play its own tier and the two cards that merged", () => {
    const played: ServerEvent = {
      kind: "cardPlayed",
      seat: 0,
      cardId: MEGA,
      permanentId: "p9",
      mechanic: "dna",
      sourceCardIds: [ROOKIE, ROOKIE],
    };
    expect(cutInFromEvent(played, 1, true)).toMatchObject({
      tier: "dna",
      sourceCardIds: [ROOKIE, ROOKIE],
    });
  });

  it("announces a mechanic play even with no On Play clause", () => {
    // MEGA prints no [On Play], so only the mechanic earns it the cut-in.
    const played: ServerEvent = { kind: "cardPlayed", seat: 0, cardId: MEGA, permanentId: "p9", mechanic: "dna" };
    expect(cutInFromEvent(played, 1, true)).not.toBeNull();
  });

  it("leaves a low-level digivolution alone", () => {
    expect(getCardDefinition(ROOKIE)?.level).toBeLessThan(CUT_IN_MIN_LEVEL);
    expect(cutInFromEvent(digivolved(ROOKIE), 1, true)).toBeNull();
  });

  it("ignores an event that is not a landing", () => {
    expect(cutInFromEvent({ kind: "turnEnded", endingSeat: 0, nextSeat: 1, turnCount: 3 }, 1, true)).toBeNull();
  });

  it("announces a played card that fires on arrival", () => {
    const played: ServerEvent = { kind: "cardPlayed", seat: 1, cardId: MEGA_ON_PLAY, permanentId: "p2" };
    expect(cutInFromEvent(played, 2, true)).toMatchObject({ cardId: MEGA_ON_PLAY, seat: 1 });
  });

  it("leaves a played card with no On Play clause alone", () => {
    const played: ServerEvent = { kind: "cardPlayed", seat: 0, cardId: MEGA, permanentId: "p3" };
    expect(cutInFromEvent(played, 2, true)).toBeNull();
  });

  it("never announces an Option play, which has no permanent", () => {
    expect(cutInFromEvent({ kind: "cardPlayed", seat: 0, cardId: MEGA_ON_PLAY }, 1, true)).toBeNull();
  });
});
