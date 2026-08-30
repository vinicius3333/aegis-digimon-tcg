import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_069 } from "./BT24-069.js";
import "../index.js";

describe("BT24-069 Vilemon", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("BT24-069")).toMatchObject({
      cardId: "BT24-069",
      nameEn: "Vilemon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Evil"],
      evoCosts: [{ color: "Purple", level: 3, memoryCost: 2 }],
    });
  });

  it("lets the opponent choose their discard and mills only when they decline", () => {
    for (const trigger of ["WhenMoving", "WhenDigivolving"]) {
      const actions = BT24_069.effects?.find((entry) => entry.trigger === trigger)?.actions ?? [];
      expect(actions[1]).toMatchObject({
        kind: "Trash",
        controller: "opponent",
        chooser: "opponent",
        optional: true,
      });
      expect(actions[2]).toMatchObject({
        kind: "TrashTopDeck",
        controller: "opponent",
        amount: 2,
        condition: { kind: "ifThisEffectDidNotAct" },
      });
    }
  });

  it("trashes from both hands without milling when the opponent accepts", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-068", as: "base" }],
          hand: [
            { card: "BT24-069", as: "vilemon" },
            { card: "BT1-001", as: "ownCard" },
          ],
        },
        1: {
          hand: [{ card: "BT1-002", as: "opponentCard" }],
          deck: [
            { card: "BT1-003", as: "firstDeck" },
            { card: "BT1-004", as: "secondDeck" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("vilemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("vilemon").instanceId);
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("opponentCard").instanceId));

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("ownCard").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("opponentCard").instanceId);
    expect(s.state.players[1]!.deck).toHaveLength(2);
  });

  it("mills two opposing cards when the opponent declines the discard", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-069", as: "vilemon" }],
          hand: [{ card: "BT1-001", as: "ownCard" }],
        },
        1: {
          hand: [{ card: "BT1-002", as: "opponentCard" }],
          deck: [
            { card: "BT1-003", as: "firstDeck" },
            { card: "BT1-004", as: "secondDeck" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    const resolving = advance(s.engine).fire(EffectTiming.WhenMoving, s.perm("vilemon"));
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const discardChoice = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: discardChoice.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await resolving;

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("ownCard").instanceId);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("opponentCard").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("firstDeck").instanceId, s.inst("secondDeck").instanceId]),
    );
  });

  it("gains Blocker and 2000 DP at 10 cards in the opponent's trash", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-069", as: "vilemon" }] },
      1: { trash: Array.from({ length: 10 }, () => "BT1-001") },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("vilemon"), "Blocker")).toBe(true);
    expect(s.perm("vilemon").currentDP).toBe(6000);
  });

  it("public attack trashes both players' top cards through the inherited effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["BT24-069"] }],
        deck: ["BT1-001", "BT1-002"],
      },
      1: {
        deck: [
          { card: "BT1-003", as: "theirFirst" },
          { card: "BT1-004", as: "theirSecond" },
        ],
        security: ["BT1-005", "BT1-006"],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 1);
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[1]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("theirFirst").instanceId);
  });
});
