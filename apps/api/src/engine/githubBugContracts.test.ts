import { expect, it } from "vitest";
import "../cards/index.js";
import { observe } from "./testkit/observe.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

it.each([true, false])("GitHub #5047 Richard's placement is self-only when accepted=%s", async (accept) => {
  const s = setupEngine({
    0: {
      battleArea: [{ card: "EX13-071", as: "old" }],
      hand: [{ card: "EX13-071", as: "new" }],
      deck: ["BT1-009", "BT1-010"],
    },
    1: { battleArea: ["BT1-009"] },
  });
  s.state.memory = 8;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("new").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "optional");
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: s.state.pendingDecision!.decisionId,
      response: { kind: "optional", accept },
    }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "EX13-071") && !s.state.pendingDecision,
  );
  expect(s.perm("old").stack).toHaveLength(0);
  expect(s.perm("new").stack).toHaveLength(accept ? 1 : 0);
  expect(s.state.memory).toBe(5);
});

it.each([
  ["ST20-10", "ST20-11"],
  ["ST21-10", "ST21-11"],
])("GitHub #5059 Angewomon uses %s's granted warp into %s for free", async (base, into) => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: base, as: "base" }],
        hand: [
          { card: "ST20-06", as: "ange" },
          { card: into, as: "into" },
        ],
      },
      1: { battleArea: [{ card: "BT1-024" }], security: ["BT1-009"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: true },
  );
  s.state.memory = 10;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ange").instanceId })).toEqual({ ok: true });
  await settle(() => s.perm("base").topCard.cardId === into);
  expect(s.perm("base").topCard.cardId).toBe(into);
  expect(s.state.memory).toBe(3);
});

it("GitHub #5049 may decline DNA with legal materials and still attack", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "AD1-009", as: "blitz" },
          { card: "AD1-012", as: "cres" },
        ],
        hand: ["EX9-021"],
      },
      1: { security: ["BT1-009", "BT1-009", "BT1-009"] },
    },
    { autoSelectCards: true, autoChooseOption: true },
  );
  const turn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(0);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "optional");
  expect(s.state.pendingDecision?.promptText).toMatch(/DNA/i);
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: s.state.pendingDecision!.decisionId,
      response: { kind: "optional", accept: false },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "optional");
  expect(s.state.pendingDecision?.promptText).toMatch(/attack/i);
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: s.state.pendingDecision!.decisionId,
      response: { kind: "optional", accept: true },
    }),
  ).toEqual({ ok: true });
  for (let i = 0; i < 4; i++) {
    await new Promise((resolve) => setImmediate(resolve));
    await advance(s.engine).finishAttack();
  }
  await turn;
  expect(s.perm("blitz").topCard.cardId).toBe("AD1-009");
  expect(s.perm("cres").topCard.cardId).toBe("AD1-012");
  expect(s.state.players[1]!.security).toHaveLength(2);
});

it("GitHub #5050 Gallantmon Counter cannot delete Vortexdramon after its own suspension grants immunity", async () => {
  const s = setupEngine({
    0: {
      battleArea: [{ card: "EX13-015", as: "gallant" }],
      security: ["BT1-009", "BT1-009"],
    },
    1: {
      battleArea: [
        { card: "EX11-074", as: "vortex" },
        { card: "BT1-009", as: "ally" },
      ],
      security: ["BT1-009", "BT1-009"],
    },
  });
  await s.ready();
  s.state.turnSeat = 1;
  const vortexId = s.perm("vortex").permanentId;
  expect(
    s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: vortexId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });

  // Suspend its own ally through the printed When Attacking effect, and decline
  // both optional clauses of the separate All Turns suspension watcher.
  for (let i = 0; i < 8; i += 1) {
    await settle(() => !!s.state.pendingDecision || s.events.some((e) => e.kind === "counterWindowOpened"));
    const pending = s.state.pendingDecision;
    if (!pending) break;
    const d = s.decisions.find((x) => x.req.decisionId === pending.decisionId)!.req;
    const response =
      d.kind === "optional"
        ? { kind: "optional" as const, accept: d.options?.timing === "WhenAttacking" }
        : d.kind === "chooseTargets"
          ? {
              kind: "chooseTargets" as const,
              instanceIds: d.options?.timing === "WhenAttacking" ? [s.perm("ally").permanentId] : [],
            }
          : undefined;
    if (!response) throw new Error(`Unexpected ${d.kind}`);
    expect(
      s.engine.applyIntent(d.seat, {
        type: "respondDecision",
        decisionId: d.decisionId,
        response,
      }),
    ).toEqual({ ok: true });
  }
  await settle(() => s.events.some((e) => e.kind === "counterWindowOpened"));
  expect(s.perm("ally").isSuspended).toBe(true);
  expect(observe(s.engine).isRestrictedByEffect(s.perm("vortex"), "beAffected", "Digimon")).toBe(true);
  const opened = s.events.find((e) => e.kind === "counterWindowOpened");
  if (opened?.kind !== "counterWindowOpened") throw new Error("Missing Counter");
  const counter = opened.eligibleCounters.find((c) => c.instanceId === s.inst("gallant").instanceId);
  expect(counter).toBeDefined();
  expect(
    s.engine.applyIntent(0, {
      type: "respondCounter",
      sourceInstanceId: counter!.instanceId,
      effectKey: counter!.effectKey,
    }),
  ).toEqual({ ok: true });

  // A singleton mandatory delete target is chosen automatically. Wait for the
  // completed Counter, rather than assuming it must ask another decision.
  await settle(() => s.events.some((e) => e.kind === "effectActivated" && e.sourceCardId === "EX13-015"));
  expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === vortexId)).toBe(true);
  expect(s.state.players[1]!.security).toHaveLength(1);
  expect(
    s.events.some((e) => e.kind === "cardsMoved" && e.deletedPermanents?.some((p) => p.permanentId === vortexId)),
  ).toBe(false);
  await advance(s.engine).finishAttack();
});

it.each([
  { tamers: ["BT1-085", "BT1-086", "BT1-087"], allowed: true },
  { tamers: ["BT1-085", "BT1-086"], allowed: false },
  { tamers: [], allowed: false },
])(
  "GitHub #5059 starter warp checks Tamer colors without a high-DP opponent: $allowed",
  async ({ tamers, allowed }) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST20-10", as: "base" }, ...tamers],
          hand: [{ card: "ST20-06", as: "ange" }, "ST20-11"],
        },
        1: { battleArea: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, declinePrompts: ["Attack"] },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ange").instanceId })).toEqual({ ok: true });
    if (allowed) await settle(() => s.perm("base").topCard.cardId === "ST20-11" && !s.state.pendingDecision);
    await settle();
    expect(s.perm("base").topCard.cardId).toBe(allowed ? "ST20-11" : "ST20-10");
    expect(s.state.memory).toBe(3);
  },
);
