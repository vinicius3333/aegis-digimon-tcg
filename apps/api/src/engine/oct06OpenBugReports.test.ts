import { expect, it } from "vitest";
import "../cards/index.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { advance } from "./testkit/advance.js";
import { observe } from "./testkit/observe.js";

it("GitHub bug #5031 allows declining Examon's Raid through the public decision", async () => {
  const s = setupEngine(
    {
      0: { battleArea: [{ card: "EX13-045", as: "examon" }], deck: Array(6).fill("BT1-009") },
      1: { battleArea: [{ card: "BT1-013", as: "target" }], security: ["BT1-009"] },
    },
    { autoSelectCards: false },
  );
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("examon").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "selectCards");
  const req = s.decisions.at(-1)!.req;
  expect(req.promptText).toContain("Raid");
  expect(req.options).toMatchObject({ min: 0, max: 1 });
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: req.decisionId,
      response: { kind: "selectCards", instanceIds: [] },
    }),
  ).toEqual({ ok: true });
  await advance(s.engine).finishAttack();
  expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("target").permanentId)).toBe(true);
  expect(s.state.players[1]!.security).toHaveLength(0);
  expect(s.state.pendingDecision).toBeUndefined();
});

it.each(["none", "barrier", "grademon"])(
  "GitHub bug #5026 spends security only after choosing %s protection",
  async (protection) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-056", as: "alpha", under: ["EX13-057"] }],
          security: ["BT1-009", "BT1-013", "BT1-014"],
          deck: Array(6).fill("BT1-009"),
        },
        1: { security: ["BT1-084"] },
      },
      { autoSelectCards: true, autoAcceptOptional: false },
    );
    await s.ready();
    const id = s.perm("alpha").permanentId;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: id, target: { kind: "player" } })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(s.decisions.at(-1)!.req.sourceCardId).toBe("EX13-057");
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: protection === "grademon" },
      }),
    ).toEqual({ ok: true });
    if (protection !== "grademon") {
      await settle(() => s.events.some((e) => e.kind === "barrierPrompt"));
      expect(s.state.players[0]!.security).toHaveLength(3);
      expect(
        s.engine.applyIntent(0, { type: "respondBarrier", permanentId: id, accept: protection === "barrier" }),
      ).toEqual({ ok: true });
    }
    await advance(s.engine).finishAttack();
    expect(s.state.players[0]!.security).toHaveLength(protection === "none" ? 3 : 2);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === id)).toBe(protection !== "none");
    expect(s.state.pendingDecision).toBeUndefined();
  },
);

it("GitHub bug #5024 keeps suspended zero-DP Larva after LordKnightmon immunity expires", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT18-086", as: "larva", suspended: true },
          { card: "EX6-054", as: "lucemon" },
        ],
        hand: [{ card: "AD1-018", as: "lord" }],
        deck: Array(12).fill("BT1-009"),
        security: Array(4).fill("BT1-009"),
      },
      1: {
        battleArea: [{ card: "EX5-041", as: "ebon" }],
        hand: [{ card: "EX5-041", as: "second" }],
        deck: Array(12).fill("BT1-009"),
        security: Array(4).fill("BT1-009"),
      },
    },
    { autoSelectCards: true, autoAcceptOptional: true, autoChooseOption: true, preferInstanceIds: [] },
  );
  s.state.memory = 10;
  await s.ready();
  const turn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(0);
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lord").instanceId })).toEqual({ ok: true });
  await settle(() => observe(s.engine).isRestrictedByEffect(s.perm("larva"), "beAffected", "Digimon"));
  advance(s.engine).endMainPhaseIfOpen(0);
  await turn;
  s.state.turnSeat = 1;
  s.state.memory = 10;
  const opponent = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(1);
  expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({ ok: true });
  await settle(
    () =>
      s.events.some((e) => e.kind === "effectResolved" && e.sourceInstanceId === s.inst("second").instanceId) &&
      !s.state.pendingDecision,
  );
  expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("larva").instanceId)).toBe(true);
  advance(s.engine).endMainPhaseIfOpen(1);
  await opponent;
  expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("larva").instanceId)).toBe(true);
  expect(s.perm("larva").currentDP).toBe(0);
  expect(observe(s.engine).isRestrictedByEffect(s.perm("larva"), "beAffected", "Digimon")).toBe(false);
});
