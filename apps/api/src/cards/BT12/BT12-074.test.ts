import { digiXrosRequirementFor, digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-074.js";

describe("BT12-074 Gumdramon", () => {
  it("digivolves for 0 from a level-2 Save card and rejects a plain level 2", async () => {
    expect(digivolutionRequirementsFor("BT12-074")).toContainEqual({
      level: 2,
      texts: ["Save"],
      cost: 0,
      isAlternate: true,
    });
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT12-005", as: "saveBase" }],
        hand: [{ card: "BT12-074", as: "gum" }],
        deck: ["BT1-009"],
      },
    });
    legal.state.memory = 0;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("saveBase").permanentId,
        instanceId: legal.inst("gum").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("saveBase").topCard.cardId === "BT12-074");
    expect(legal.state.memory).toBe(0);
    expect(legal.perm("saveBase").stack.map(({ cardId }) => cardId)).toEqual(["BT12-005"]);

    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT12-001", as: "plain" }], hand: [{ card: "BT12-074", as: "gum" }] },
    });
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("plain").permanentId,
        instanceId: illegal.inst("gum").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("uses one Save material for DigiXros -2", () => {
    expect(digiXrosRequirementFor("BT12-074")).toEqual([{ materials: [{ texts: ["Save"] }], count: 2 }]);
  });

  it("publicly DigiXroses with one Save material for the exact reduction", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT12-074", as: "gum" },
          { card: "BT10-008", as: "material" },
        ],
      },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("gum").instanceId,
        digiXros: { materialInstanceIds: [s.inst("material").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea[0]!.stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("material").instanceId,
    ]);
  });

  it("places a Save Digimon under a Tamer to draw on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-094", as: "tamer" }],
          hand: [
            { card: "BT12-074", as: "gum" },
            { card: "BT10-008", as: "save" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gum").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT1-009"));
    expect(s.perm("tamer").stack.map(({ cardId }) => cardId)).toContain("BT10-008");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-009");
  });

  it("may decline the On Play cost and therefore draws nothing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-074", as: "gum" },
            { card: "BT12-094", as: "tamer" },
          ],
          hand: [{ card: "BT10-008", as: "save" }],
          deck: [{ card: "BT1-009", as: "draw" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const handBefore = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
    const deckBefore = s.state.players[0]!.deck.map(({ instanceId }) => instanceId);
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("gum"));
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(handBefore);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual(deckBefore);
    expect(s.perm("tamer").stack).toHaveLength(0);
  });

  it("saves itself under a Tamer when deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-074", as: "gum" },
            { card: "BT12-094", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const sourceId = s.perm("gum").topCard.instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("gum").permanentId]);
    await settle(() => s.perm("tamer").stack.some(({ instanceId }) => instanceId === sourceId));
    expect(s.perm("tamer").stack.some(({ instanceId }) => instanceId === sourceId)).toBe(true);
  });

  it("may decline Save and remains in trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-074", as: "gum" },
            { card: "BT12-094", as: "tamer" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const sourceId = s.inst("gum").instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("gum").permanentId]);
    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(sourceId);
  });

  it("draws from the inherited Save attack effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-077", as: "host", under: ["BT12-074"] }], deck: ["BT1-010"] },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-010");
  });

  it("does not draw from the inherited effect on a non-Save host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT12-074"] }], deck: ["BT1-010"] },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("draws from the inherited attack effect at most once per turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-077", as: "host", under: ["BT12-074"] }], deck: ["BT1-010", "BT1-011"] },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[0]!.hand.filter(({ cardId }) => cardId === "BT1-010" || cardId === "BT1-011")).toHaveLength(
      1,
    );
  });
});
