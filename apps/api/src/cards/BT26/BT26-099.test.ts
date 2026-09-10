import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-099.js";
import "../EX9/EX9-035.js";
import "../index.js";

describe("BT26-099 compiled fidelity", () => {
  it("encodes the DM requirement, reveal/add/bottom flow, Delay watcher, and Security Main", () => {
    expect(getCardDefinition("BT26-099")).toMatchObject({
      nameEn: "Training Manual",
      colors: ["Green"],
      kinds: ["Option"],
      playCost: 3,
      types: ["DM"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Static",
          actions: [expect.objectContaining({ kind: "WaiveColorRequirement" })],
        }),
        expect.objectContaining({
          trigger: "Main",
          actions: [
            expect.objectContaining({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" }),
            { kind: "PlaceInBattleAreaSelf" },
          ],
        }),
        expect.objectContaining({ trigger: "AllTurns", keywords: [{ keyword: "Delay", raw: "＜Delay＞" }] }),
        expect.objectContaining({ trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] }),
      ]),
    );
  });

  it("waives the green Use Req only with a field DM card and adds a revealed DM card", async () => {
    const withoutDm = setupEngine({ 0: { hand: [{ card: "BT26-099", as: "manual" }] } });
    withoutDm.state.memory = 3;
    await withoutDm.ready();
    expect(
      withoutDm.engine.applyIntent(0, { type: "playCard", instanceId: withoutDm.inst("manual").instanceId }),
    ).toEqual({ ok: false, reason: "color-requirement-unmet" });

    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-077", as: "dm" }],
          hand: [{ card: "BT26-099", as: "manual" }],
          deck: [{ card: "BT26-048", as: "revealedDm" }, "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("manual").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT26-099"));
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT26-048");
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("activates the Main effect from Security through the public security flow", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "BT26-099", as: "manual", faceUp: true }], deck: ["BT26-048", "BT1-009", "BT1-010"] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("manual"));
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT26-099"));
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT26-048");
  });

  it("Delay activates after a public face-down placement under a Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-099", as: "manual" },
            { card: "EX9-064", as: "host" },
          ],
          hand: [
            { card: "EX9-035", as: "placer" },
            { card: "BT26-077", as: "dm" },
          ],
          deck: ["BT26-077", "EX9-035", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("placer").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect({
      top: s.perm("host").topCard.cardId,
      stack: s.perm("host").stack.map((card) => [card.cardId, card.faceUp]),
      hand: s.state.players[0]!.hand.map((card) => card.cardId),
      deck: s.state.players[0]!.deck.map((card) => card.cardId),
    }).toEqual({
      top: "BT26-077",
      stack: [
        ["EX9-035", false],
        ["EX9-064", true],
      ],
      hand: ["BT26-077", "BT1-009"],
      deck: [],
    });
  });
});
