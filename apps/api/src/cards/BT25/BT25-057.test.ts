import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { irNode } from "../../engine/testkit/irNode.js";
import { advance } from "../../engine/testkit/advance.js";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT25-057.js";

const CARD_ID = "BT25-057";

describe("BT25-057 Monarchlizamon / Final Judgment", () => {
  it("matches catalog, erratum, alternate evolution, and the shared physical OPT", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Green", "Black"],
      kinds: ["Digimon", "Option"],
      level: 5,
      playCost: 4,
      dp: 8000,
      types: ["Cyborg", "Glowing Dawn", "BEATBREAK"],
      optionColorRequirements: ["Green"],
    });
    expect(digivolutionRequirementsFor(CARD_ID)).toContainEqual({
      level: 4,
      traits: ["Glowing Dawn"],
      cost: 3,
      isAlternate: true,
    });
    const shared = compiled.effects.filter(
      (effect) =>
        ["WhenDigivolving", "WhenAttacking"].includes(effect.trigger) && effect.sharedUseKey === "ir-shared-0",
    );
    expect(shared).toHaveLength(2);
    expect(shared.every((effect) => effect.frequency === "OncePerTurn")).toBe(true);
  });

  it("evolves for 3 from an off-color Glowing Dawn Lv.4 and rejects a plain Lv.4", async () => {
    const legal = setupEngine({
      0: { breeding: { card: "BT25-035", as: "base" }, hand: [{ card: CARD_ID, as: "monarch" }], deck: ["BT1-009"] },
    });
    legal.state.memory = 3;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("monarch").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("base").topCard.cardId === CARD_ID);
    expect(legal.state.memory).toBe(0);

    const invalid = setupEngine({
      0: { breeding: { card: "BT1-010", as: "plain" }, hand: [{ card: CARD_ID, as: "monarch" }] },
    });
    invalid.state.memory = 3;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("plain").permanentId,
        instanceId: invalid.inst("monarch").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("supports both ordinary color routes at cost 4 and rejects the wrong color", async () => {
    for (const [source, as] of [
      ["BT1-069", "greenBase"],
      ["BT10-061", "blackBase"],
    ] as const) {
      const s = setupEngine({ 0: { battleArea: [{ card: source, as }], hand: [{ card: CARD_ID, as: "monarch" }] } });
      s.state.memory = 5;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm(as).permanentId,
          instanceId: s.inst("monarch").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm(as).topCard?.cardId === CARD_ID);
      expect(s.state.memory).toBe(1);
    }
    const wrong = setupEngine({
      0: { battleArea: [{ card: "BT1-015", as: "redBase" }], hand: [{ card: CARD_ID, as: "monarch" }] },
    });
    wrong.state.memory = 5;
    expect(
      wrong.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrong.perm("redBase").permanentId,
        instanceId: wrong.inst("monarch").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("pays the true bottom face-down Tamer source, De-Digivolves, then performs a rules battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-088", as: "tamer", under: [{ card: "BT1-009", faceUp: false, as: "cost" }] },
            { card: "BT25-035", as: "base" },
          ],
          hand: [{ card: CARD_ID, as: "monarch" }],
          deck: ["BT1-013"],
        },
        1: { battleArea: [{ card: "BT25-041", as: "opponent", under: ["BT25-035"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("monarch").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const orderDecision = s.state.pendingDecision!;
    const orderRequest = s.decisions.find(({ req }) => req.decisionId === orderDecision.decisionId)!.req;
    const keys = orderRequest.options?.triggerKeys ?? [];
    expect(keys).toHaveLength(2);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: orderDecision.decisionId,
        response: { kind: "orderTriggers", order: [keys[0]!] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0, 1200);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT25-041", "BT25-035"]),
    );
    expect(s.decisions.some(({ req }) => req.kind === "orderTriggers")).toBe(true);
  });

  it("uses Final Judgment only with Glowing Dawn and applies all errata grants to one target", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-049", as: "requirement" },
            { card: "BT1-010", as: "target" },
          ],
          hand: [{ card: CARD_ID, as: "option" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 9000);
    expect(s.state.memory).toBe(0);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Rush")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(1);

    const denied = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "plain" }], hand: [{ card: CARD_ID, as: "option" }] },
    });
    denied.state.memory = 4;
    expect(
      denied.engine.applyIntent(0, {
        type: "playCard",
        instanceId: denied.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual(expect.objectContaining({ ok: false, reason: "color-requirement-unmet" }));
  });

  it("fires When Attacking once, pays its bottom face-down Tamer cost, then shares the budget", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "monarch" },
            { card: "BT25-088", as: "tamer", under: [{ card: "BT1-009", faceUp: false, as: "cost" }] },
          ],
        },
        1: {
          battleArea: [
            { card: "BT24-017", as: "first", under: ["BT1-020"], suspended: true },
            { card: "BT24-017", as: "second", under: ["BT1-020"], suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("monarch").permanentId,
        target: { kind: "permanent", permanentId: s.perm("first").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length < 2, 1200);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);

    await advance(s.engine).verb.unsuspend([s.perm("monarch").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("monarch").permanentId,
        target: { kind: "permanent", permanentId: s.perm("second").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 120);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("second").permanentId),
    ).toBe(true);
  });

  it("expires Final Judgment's grants at the end of the turn and refuses without an eligible target", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-049", as: "requirement" },
            { card: "BT1-010", as: "target" },
          ],
          hand: [{ card: CARD_ID, as: "option" }],
        },
        1: { deck: ["BT1-001"], security: ["BT1-001"] },
      },
      { autoSelectCards: true, autoDeclineOptional: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 9000);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Rush")).toBe(true);
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    expect(s.perm("target").currentDP).toBe(2000);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Rush")).toBe(false);

    const denied = setupEngine(
      { 0: { battleArea: [{ card: "BT1-010", as: "plain" }], hand: [{ card: CARD_ID, as: "option" }] } },
      { autoAcceptOptional: true },
    );
    denied.state.memory = 4;
    expect(
      denied.engine.applyIntent(0, {
        type: "playCard",
        instanceId: denied.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("keeps Final Judgment's buffs and optional attack on the same target for the turn", () => {
    const main = compiled.effects.find((effect) => effect.trigger === "Main")!;
    expect(main.actions).toHaveLength(4);
    expect(main.actions.slice(1).every((action) => irNode(action).target?.sameTarget === true)).toBe(true);
    expect(main.actions.slice(0, 3).every((action) => irNode(action).duration === "forTheTurn")).toBe(true);
    expect(main.actions[3]).toMatchObject({ kind: "Attack", optional: true });
  });
});
