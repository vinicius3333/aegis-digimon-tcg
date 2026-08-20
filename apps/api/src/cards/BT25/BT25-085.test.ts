import { CardKind, EffectTiming, digivolutionRequirementsFor, requireCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

const CARD_ID = "BT25-085";

describe("BT25-085 BeelStarmon", () => {
  it("preserves both alternate evolution requirements and its DUAL Option identity (Q6404)", () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toEqual(
      expect.arrayContaining([
        { level: 5, texts: ["Three Musketeers"], cost: 3, isAlternate: true },
        { level: 5, traits: ["TS"], cost: 3, isAlternate: true },
      ]),
    );
    const definition = requireCardDefinition(CARD_ID);
    expect(definition.kinds).toEqual(expect.arrayContaining([CardKind.Digimon, CardKind.Option]));
    expect(definition.types).toEqual(expect.arrayContaining(["Three Musketeers", "TS"]));
  });

  it("uses exactly one eligible Option from hand for free and resolves the DUAL Option face", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "beel" }],
          hand: [{ card: CARD_ID, as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-013", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const memory = s.state.memory;
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("beel"));
    expect(s.state.memory).toBe(memory);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("trashes one Option link card from any own Digimon and then unsuspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "beel", suspended: true },
            { card: "BT1-013", as: "other", linked: [{ card: CARD_ID, as: "link" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("beel"));
    expect(s.perm("beel").isSuspended).toBe(false);
    expect(s.perm("other").linked).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("link").instanceId)).toBe(true);
  });

  it("does not pay the unsuspend cost from a non-Digimon's linked cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "beel", suspended: true },
            { card: "BT25-086", as: "tamer", linked: [{ card: CARD_ID, as: "link" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("beel"));
    expect(s.perm("beel").isSuspended).toBe(true);
    expect(s.perm("tamer").linked).toHaveLength(1);
  });
});
