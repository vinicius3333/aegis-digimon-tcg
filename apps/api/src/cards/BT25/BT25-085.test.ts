import { CardKind, EffectTiming, digivolutionRequirementsFor, requireCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT25-085.js";

const CARD_ID = "BT25-085";

describe("BT25-085 BeelStarmon", () => {
  it("places the Option-side Three Musketeers card as the bottom digivolution card", () => {
    const optionMain = compiled.effects.find((effect) => effect.trigger === "Main");
    expect(optionMain?.actions.find((action) => action.kind === "PlaceUnder")).toMatchObject({
      underFilter: { controller: "mine", kind: ["Digimon"] },
      position: "bottom",
    });
  });

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

  it("supports ordinary Purple and Black Lv.5 routes at cost 4 and rejects a wrong color", async () => {
    for (const [source, as] of [
      ["BT10-064", "blackBase"],
      ["BT10-012", "purpleBase"],
    ] as const) {
      const s = setupEngine({ 0: { battleArea: [{ card: source, as }], hand: [{ card: CARD_ID, as: "beel" }] } });
      s.state.memory = 5;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm(as).permanentId,
          instanceId: s.inst("beel").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm(as).topCard?.cardId === CARD_ID);
      expect(s.perm(as).topCard?.cardId).toBe(CARD_ID);
      expect(s.state.memory).toBe(1);
    }
    const wrong = setupEngine({
      0: { battleArea: [{ card: "BT10-056", as: "greenBase" }], hand: [{ card: CARD_ID, as: "beel" }] },
    });
    wrong.state.memory = 5;
    expect(
      wrong.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrong.perm("greenBase").permanentId,
        instanceId: wrong.inst("beel").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
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

  it("uses an Option from this Digimon's sources but not another Digimon's sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "beel", under: [{ card: CARD_ID, as: "ownOption" }] },
            { card: "BT1-009", as: "other", under: [{ card: CARD_ID, as: "otherOption" }] },
          ],
        },
        1: { battleArea: [{ card: "BT1-013", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("beel"));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("ownOption").instanceId);
    expect(s.perm("other").stack.map((card) => card.instanceId)).toContain(s.inst("otherOption").instanceId);
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
