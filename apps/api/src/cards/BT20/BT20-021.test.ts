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

  it("publicly plays GX, pays its Royal Knight placement, and deletes at the 16000-DP boundary", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT20-021", as: "gx" },
            { card: "BT20-017", as: "royalKnightCost" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT20-014", dp: 16000, as: "boundary" },
            { card: "BT20-014", dp: 16001, as: "tooLarge" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const boundaryId = s.perm("boundary").permanentId;
    const knightId = s.inst("royalKnightCost").instanceId;
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gx").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("gx").stack.some((card) => card.instanceId === knightId));
    expect(s.perm("gx").stack.map((card) => card.instanceId)).toEqual([knightId]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === knightId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === boundaryId)).toBe(false);
    expect(s.perm("tooLarge").currentDP).toBe(16001);
    expect(s.state.memory).toBe(1);
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
          security: ["BT1-010", "BT1-010", "BT1-010", "BT1-010"],
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
      1: { security: ["BT1-010", "BT1-010"] },
    });
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("gx"));
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
  it.each(["hand", "trash"] as const)(
    "publicly evolves Jesmon X into GX and places a Royal Knight from %s at stack bottom",
    async (sourceZone) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT20-019", as: "xAntibody", under: ["BT20-017"] }],
            hand: [
              { card: "BT20-021", as: "gx" },
              ...(sourceZone === "hand" ? [{ card: "BT20-017", as: "royalKnightCost" }] : []),
            ],
            ...(sourceZone === "trash" ? { trash: [{ card: "BT20-017", as: "royalKnightCost" }] } : {}),
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
      expect(s.perm("xAntibody").stack[0]?.cardId).toBe("BT20-017");
      expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("royalKnightCost").instanceId)).toBe(
        false,
      );
      expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("royalKnightCost").instanceId)).toBe(
        false,
      );
      expect(s.state.memory).toBe(0);
    },
  );

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
        1: { battleArea: [{ card: "BT20-014", dp: 12000, as: "target" }], security: ["BT1-010", "BT1-010"] },
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
          security: ["BT1-010", "BT1-010", "BT1-010", "BT1-010"],
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

  it("publicly shares entry and attack placement Once Per Turn, then resets on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-019", under: ["BT20-017"], as: "host" }],
          hand: [
            { card: "BT20-021", as: "gx" },
            { card: "BT20-056", as: "entryKnight" },
            { card: "BT20-017", as: "nextKnight" },
          ],
          deck: ["BT20-047", "BT20-047", "BT20-047"],
        },
        1: {
          battleArea: [
            { card: "BT20-014", dp: 16000, as: "boundary" },
            { card: "BT20-014", dp: 16001, as: "retained" },
          ],
          security: Array.from({ length: 6 }, () => "BT1-010"),
          deck: ["BT20-047", "BT20-047"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 6;
    const firstOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("gx").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT20-021");
    const stackAfterEntry = s.perm("host").stack.map((card) => card.cardId);
    expect(
      s.state.players[1]!.battleArea.some((perm) => perm.topCard.cardId === "BT20-014" && perm.currentDP === 16001),
    ).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length < 6);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(stackAfterEntry);

    advance(s.engine).endMainPhaseIfOpen(0);
    await firstOwnTurn;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.some((card) => card.instanceId === s.inst("nextKnight").instanceId));
    expect(s.perm("host").stack.map((card) => card.cardId)).toContain("BT20-017");
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });

  it("publicly Blast Digivolves from hand over Jesmon X and resolves the placement cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-019", under: ["BT20-017"], as: "host" }],
          hand: [
            { card: "BT20-021", as: "gx" },
            { card: "BT20-056", as: "royalKnight" },
          ],
          deck: ["BT20-047", "BT20-047"],
        },
        1: {
          battleArea: [{ card: "BT20-010", as: "attacker" }],
          security: ["BT1-010"],
          deck: ["BT20-047", "BT20-047"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.findLast((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const choice = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("gx").instanceId);
    expect(choice).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: choice!.instanceId,
        effectKey: choice!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT20-021");
    expect(s.perm("host").stack[0]?.cardId).toBe("BT20-056");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("royalKnight").instanceId)).toBe(false);
  });
});
