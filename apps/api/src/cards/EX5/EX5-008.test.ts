import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-008.js";
import "../index.js";

describe("EX5-008 Firamon", () => {
  it("matches the catalog and encodes both mandatory reveal groups plus inherited DP", () => {
    expect(getCardDefinition("EX5-008")).toMatchObject({
      cardId: "EX5-008",
      nameEn: "Firamon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      types: ["Beast", "Light Fang"],
      effectText:
        "[On Play] [When Digivolving] Reveal the top 3 cards of your deck. Add 1 card with the [Light Fang] trait and 1 card with the [Night Claw]/[Galaxy] trait among them to the hand. Return the rest to the bottom of the deck.",
      inheritedEffectText: "[Your Turn] This Digimon gets +2000 DP.",
    });
    const revealEffects = compiled.effects?.filter(
      (entry) => entry.trigger === "OnPlay" || entry.trigger === "WhenDigivolving",
    );
    expect(revealEffects).toHaveLength(2);
    for (const effect of revealEffects ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "RevealAdd",
        revealCount: 3,
        rest: "deckBottom",
        add: [
          {
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [{ match: "trait", tokens: ["Light Fang"] }],
            },
            count: 1,
            to: "hand",
          },
          {
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [{ match: "trait", tokens: ["Night Claw", "Galaxy"] }],
            },
            count: 1,
            to: "hand",
          },
        ],
      });
    }
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          amount: 2000,
          duration: "permanent",
          target: { filter: { isSelfRef: true }, isSelf: true },
        },
      ],
    });
  });

  it("resolves the On Play reveal publicly and adds both groups, including a Galaxy card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX5-008", as: "firamon" }],
          deck: [
            { card: "EX5-007", as: "lightFang" },
            { card: "EX5-073", as: "galaxy" },
            { card: "BT1-009", as: "filler" },
          ],
        },
        1: { deck: ["BT1-009"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("lightFang").instanceId) &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("galaxy").instanceId),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("lightFang").instanceId,
      s.inst("galaxy").instanceId,
    ]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("filler").instanceId]);
    expect(s.perm("firamon").currentDP).toBe(4000);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("answers Q3529 by adding the sole Light Fang match and preserving ordered remainder", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX5-008", as: "firamon" }],
          deck: [
            { card: "EX5-007", as: "lightFang" },
            { card: "BT1-009", as: "firstFiller" },
            { card: "BT1-010", as: "secondFiller" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("lightFang").instanceId));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("lightFang").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("firstFiller").instanceId,
      s.inst("secondFiller").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("resolves When Digivolving publicly and keeps the inherited DP bonus only on your turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "base" }],
          hand: [
            { card: "EX5-008", as: "firamon" },
            { card: "BT1-020", as: "evolved" },
          ],
          deck: [
            { card: "EX5-016", as: "nightClaw" },
            { card: "EX5-073", as: "galaxy" },
            { card: "BT1-011", as: "filler" },
          ],
        },
        1: { hand: ["BT1-009"], deck: ["BT1-010"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("firamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX5-008");
    expect(s.perm("base").topCard?.cardId).toBe("EX5-008");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("evolved").instanceId,
      s.inst("nightClaw").instanceId,
      s.inst("galaxy").instanceId,
    ]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("filler").instanceId]);
    expect(s.perm("base").currentDP).toBe(4000);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolved").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT1-020");
    expect(s.perm("base").topCard?.cardId).toBe("BT1-020");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-009", "EX5-008"]);
    expect(s.state.memory).toBe(6);
    expect(s.perm("base").currentDP).toBe(8000);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;

    s.state.turnSeat = 1;
    s.state.memory = 10;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("base").currentDP).toBe(6000);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });

  it("rejects a non-level-3 evolution source without changing the stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-014", as: "base" }],
        hand: [{ card: "EX5-008", as: "firamon" }],
      },
    });
    await s.ready();
    s.state.memory = 10;
    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("firamon").instanceId,
    });
    expect(result.ok).toBe(false);
    expect(s.perm("base").topCard?.cardId).toBe("BT1-014");
    expect(s.perm("base").stack).toHaveLength(0);
    expect(s.state.memory).toBe(10);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
