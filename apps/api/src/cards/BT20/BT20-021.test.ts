import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-021.js";
import "./index.js";

describe("BT20-021 Jesmon GX", () => {
  it("shares the once-per-turn Royal Knight placement cost across entry and attack triggers", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "Delete",
            cost: {
              kind: "place",
              target: {
                from: ["hand", "trash"],
                filter: { nameOrTrait: [{ tokens: ["Royal Knight"], match: "trait" }] },
              },
              destination: "digivolutionStack",
              position: "bottom",
              host: "self",
            },
            optional: true,
          },
        ],
      });
    }
    const attack = compiled.effects.filter((entry) => entry.trigger === "WhenAttacking")[1];
    expect(attack).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        { kind: "Unsuspend", target: { isSelf: true } },
        {
          kind: "Trash",
          target: { filter: { controller: "opponent", zone: "security", position: "top" } },
          scaling: {
            per: 2,
            unit: "digivolutionCards",
            filter: { nameOrTrait: [{ tokens: ["Royal Knight"], match: "trait" }] },
          },
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.trigger === "Counter")).toMatchObject({
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve" }],
    });
  });

  it("places a Royal Knight from hand at stack bottom, deletes at 16000 DP, and shares the use across timings", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-021", as: "gx", under: ["BT20-010"] }],
          hand: [{ card: "BT20-017", as: "royalKnightCost" }],
        },
        1: {
          battleArea: [
            { card: "BT20-014", dp: 16000, as: "boundary" },
            { card: "BT20-014", dp: 17000, as: "tooLarge" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const boundaryId = s.perm("boundary").permanentId;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("gx"));
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === boundaryId));
    expect(s.perm("gx").stack[0]?.cardId).toBe("BT20-017");
    expect(s.perm("gx").stack.map((card) => card.cardId)).toContain("BT20-010");
    expect(s.perm("tooLarge")).toBeDefined();

    const stackLength = s.perm("gx").stack.length;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("gx"));
    expect(s.perm("gx").stack).toHaveLength(stackLength);
  });

  it("with 4 Royal Knight sources unsuspends and trashes the top 2 security cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT20-021",
              suspended: true,
              as: "gx",
              under: ["BT20-017", "BT20-019", "BT20-056", "BT20-060"],
            },
          ],
        },
        1: {
          battleArea: [{ card: "BT20-010", dp: 1000, as: "low" }],
          security: ["BT20-001", "BT20-002", "BT20-003", "BT20-004"],
        },
      },
      { autoOrderTriggers: true },
    );
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("gx"));
    await settle(() => !s.perm("gx").isSuspended && s.state.players[1]!.security.length === 2);
    expect(s.perm("gx").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("counts a Royal Knight Option in the evolution stack for security scaling", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT20-021", suspended: true, as: "gx", under: ["BT20-017", "BT20-019", "BT10-110"] }],
      },
      1: { security: ["BT20-001", "BT20-002"] },
    });
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("gx"));
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
  it("publicly evolves Jesmon X into GX and optionally places a Royal Knight at stack bottom", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-019", as: "xAntibody", under: ["BT20-017"] }],
          hand: [
            { card: "BT20-021", as: "gx" },
            { card: "BT20-017", as: "royalKnightCost" },
          ],
        },
        1: { battleArea: [{ card: "BT20-014", dp: 12000, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("xAntibody").permanentId,
        instanceId: s.inst("gx").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("xAntibody").topCard.cardId === "BT20-021");
    expect(s.perm("xAntibody").stack.map((card) => card.cardId)).toContain("BT20-017");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("royalKnightCost").instanceId)).toBe(
      false,
    );
  });

  it("allows the optional Royal Knight placement and deletion to be refused", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-021", as: "gx" }], hand: [{ card: "BT20-017", as: "royalKnightCost" }] },
        1: { battleArea: [{ card: "BT20-014", dp: 12000, as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("gx"));
    await settle(() => false, 20);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("royalKnightCost").instanceId)).toBe(
      true,
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("naturally resolves the attack trigger placement at bottom and source-DP deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-021", as: "gx", under: ["BT20-019", "BT20-017"] }],
          hand: [{ card: "BT20-056", as: "royalKnight" }],
        },
        1: { battleArea: [{ card: "BT20-014", dp: 12000, as: "target" }], security: ["BT20-001", "BT20-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gx").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-014"));
    expect(s.perm("gx").stack[0]?.cardId).toBe("BT20-056");
    expect(s.state.players[1]!.security.length).toBeLessThan(2);
  });

  it.each([
    ["placement first", 0, 2],
    ["unsuspend first", 1, 3],
  ] as const)("manually orders simultaneous attack effects (%s)", async (_label, firstIndex, expectedSecurity) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-021", as: "gx", under: ["BT20-019"] }],
          hand: [{ card: "BT20-017", as: "royalKnight" }],
        },
        1: {
          battleArea: [{ card: "BT20-010", dp: 1000, as: "low" }],
          security: ["BT20-001", "BT20-002", "BT20-003", "BT20-004"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gx").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const firstRequest = s.decisions.find(({ req }) => req.decisionId === s.state.pendingDecision?.decisionId)!.req;
    if (firstRequest.kind !== "orderTriggers") throw new Error("attack trigger order decision missing");
    expect(firstRequest.options?.triggerKeys).toHaveLength(2);
    const keys = firstRequest.options?.triggerKeys ?? [];
    const firstKey = keys[firstIndex]!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: firstRequest.decisionId,
        response: { kind: "orderTriggers", order: [firstKey] },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.perm("gx").isSuspended).toBe(false);
    expect(s.perm("gx").stack.map((card) => card.cardId)).toEqual(["BT20-017", "BT20-019"]);
    expect(s.state.players[1]!.security).toHaveLength(expectedSecurity);
  });
});
