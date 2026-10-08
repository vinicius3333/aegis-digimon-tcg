import type { Intent, Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { advance } from "./testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

const FILLER = Array.from({ length: 12 }, () => "BT1-010");
const PAIRS = [
  ["EX13 Wingdramon/Breakdramon", "EX13-021", "EX13-044"],
  ["EX3 Wingdramon/Groundramon", "EX3-020", "EX3-041"],
] as const;

function accepted(s: ReturnType<typeof setupEngine>, seat: Seat, intent: Intent) {
  expect(s.engine.applyIntent(seat, intent)).toEqual({ ok: true });
}
function assertRewrite(s: ReturnType<typeof setupEngine>, changed: string) {
  expect(observe(s.engine).effectiveColors(s.perm(changed))).toEqual(["White"]);
  expect(observe(s.engine).effectiveNames(s.perm(changed))).toContain("sukamon");
  expect(s.perm(changed).currentDP).toBe(3000);
}
function assertMemory(s: ReturnType<typeof setupEngine>, memory: number) {
  expect(s.state.memory).toBe(memory);
}

async function start(blue: string, green: string, changed?: "blue" | "green", into = "EX13-045") {
  const preferred: string[] = [];
  const s = setupEngine(
    {
      0: {
        hand: [{ card: "BT11-043", as: "king" }],
        trash: ["BT11-040", "BT11-040", "BT11-040"],
        deck: FILLER,
        security: FILLER.slice(0, 5),
      },
      1: {
        battleArea: [
          { card: blue, as: "blue", under: ["EX13-008"] },
          { card: green, as: "green" },
        ],
        hand: [{ card: into, as: "result" }],
        deck: FILLER,
        security: FILLER.slice(0, 5),
      },
    },
    { autoSelectCards: true, autoAcceptOptional: true, declinePrompts: ["Examon"], preferInstanceIds: preferred },
  );
  s.state.memory = 10;
  await s.ready();
  if (changed) {
    preferred.push(s.perm(changed).permanentId);
    accepted(s, 0, { type: "playCard", instanceId: s.inst("king").instanceId });
    await settle(
      () =>
        observe(s.engine).effectiveColors(s.perm(changed)).includes("White") && s.state.pendingDecision === undefined,
    );
    assertRewrite(s, changed);
  }
  s.state.turnSeat = 1;
  const turn = s.engine.runOneTurn();
  try {
    await advance(s.engine).waitForMainPhase(1);
    return { s, turn };
  } catch (error) {
    await finish({ s, turn });
    throw error;
  }
}
async function finish({ s, turn }: Awaited<ReturnType<typeof start>>) {
  if (!s.state.gameOver) {
    accepted(s, s.state.turnSeat, { type: "surrender" });
  }
  await turn;
  assertNoLoudGap(s);
}

describe("Discord 1557631388650315826 / GH5304 — white Sukamon DNA materials", () => {
  for (const [label, blue, green] of PAIRS) {
    it.each(["blue", "green"] as const)(`${label}: rejects a rewritten %s in both material orders`, async (changed) => {
      const run = await start(blue, green, changed);
      const { s } = run;
      try {
        expect(s.inst("result").dnaDigivolveRoutes).toHaveLength(0);
        const ids = [s.perm("blue").permanentId, s.perm("green").permanentId];
        const before = [...s.state.players[1]!.battleArea];
        const hand = [...s.state.players[1]!.hand];
        const memory = s.state.memory;
        for (const order of [ids, [...ids].reverse()]) {
          expect(
            s.engine.applyIntent(1, {
              type: "dnaDigivolve",
              instanceId: s.inst("result").instanceId,
              materialPermanentIds: order,
            }),
          ).toEqual({ ok: false, reason: "invalid-evolution" });
        }
        expect([...s.state.players[1]!.battleArea]).toEqual(before);
        expect([...s.state.players[1]!.hand]).toEqual(hand);
        expect(s.state.memory).toBe(memory);
        expect(s.state.pendingDecision).toBeUndefined();
      } finally {
        await finish(run);
      }
    });
    it.each(["blue", "green"] as const)(
      `${label}: end-turn and inherited DNA cannot consume a rewritten %s`,
      async (changed) => {
        const run = await start(blue, green, changed);
        const { s } = run;
        try {
          expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
          await run.turn;
          expect(s.state.players[1]!.battleArea.map((p) => p.topCard.cardId)).toEqual([blue, green]);
          expect(s.state.players[1]!.hand.some((c) => c.cardId === "EX13-045")).toBe(true);
          expect(s.state.pendingDecision).toBeUndefined();
          expect(observe(s.engine).effectiveColors(s.perm(changed))).not.toContain("White");
        } finally {
          await finish(run);
        }
      },
    );
    it.each([false, true])(`${label}: healthy pair DNA succeeds (end-turn=%s)`, async (effect) => {
      const run = await start(blue, green);
      const { s } = run;
      try {
        expect(s.inst("result").dnaDigivolveRoutes).toHaveLength(1);
        const memory = s.state.memory;
        expect(
          s.engine.applyIntent(
            1,
            effect
              ? { type: "endPhase" }
              : {
                  type: "dnaDigivolve",
                  instanceId: s.inst("result").instanceId,
                  materialPermanentIds: [s.perm("blue").permanentId, s.perm("green").permanentId],
                },
          ),
        ).toEqual({ ok: true });
        await settle(
          () =>
            s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "EX13-045") &&
            s.state.pendingDecision === undefined,
        );
        expect(s.perm("result").stack.map((c) => c.cardId)).toEqual(["EX13-008", blue, green]);
        expect(observe(s.engine).effectiveColors(s.perm("result"))).toEqual(["Green", "Red", "Blue"]);
        if (!effect) assertMemory(s, memory);
      } finally {
        await finish(run);
      }
    });
  }
  it("keeps ordinary Sukamon-name digivolution legal and carries the white rewrite", async () => {
    const run = await start("BT1-037", "BT1-072", "blue", "BT11-041");
    const { s } = run;
    try {
      const id = s.perm("blue").permanentId;
      const memory = s.state.memory;
      expect(
        s.engine.applyIntent(1, {
          type: "digivolve",
          permanentId: id,
          instanceId: s.inst("result").instanceId,
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT11-041") &&
          s.state.pendingDecision === undefined,
      );
      expect(s.perm("result").permanentId).toBe(id);
      expect(s.state.memory).toBe(memory - 3);
      expect(observe(s.engine).effectiveColors(s.perm("result"))).toEqual(["White"]);
      expect(observe(s.engine).effectiveNames(s.perm("result"))).toEqual(["sukamon"]);
      expect(s.perm("result").currentDP).toBe(3000);
    } finally {
      await finish(run);
    }
  });
  it("keeps ordinary trait digivolution legal after a Sukamon rewrite", async () => {
    const run = await start("BT26-071", "BT1-072", "blue", "EX12-032");
    const { s } = run;
    try {
      const memory = s.state.memory;
      expect(observe(s.engine).effectiveNames(s.perm("blue"))).toEqual(["sukamon"]);
      accepted(s, 1, {
        type: "digivolve",
        permanentId: s.perm("blue").permanentId,
        instanceId: s.inst("result").instanceId,
        useAlternateCost: true,
      });
      await settle(
        () =>
          s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "EX12-032") &&
          s.state.pendingDecision === undefined,
      );
      expect(s.state.memory).toBe(memory - 3);
      expect(observe(s.engine).effectiveColors(s.perm("result"))).toEqual(["White"]);
      expect(observe(s.engine).effectiveNames(s.perm("result"))).toEqual(["sukamon"]);
    } finally {
      await finish(run);
    }
  });
  it("allows white Sukamon in Kimeramon's color-free Lv.4 + Lv.4 recipe", async () => {
    const run = await start("BT1-037", "BT1-072", "blue", "BT8-084");
    const { s } = run;
    try {
      expect(s.inst("result").dnaDigivolveRoutes).toHaveLength(1);
      expect(
        s.engine.applyIntent(1, {
          type: "dnaDigivolve",
          instanceId: s.inst("result").instanceId,
          materialPermanentIds: [s.perm("blue").permanentId, s.perm("green").permanentId],
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT8-084") &&
          s.state.pendingDecision === undefined,
      );
      expect(s.perm("result").stack.map((c) => c.cardId)).toEqual(["BT1-072", "EX13-008", "BT1-037"]);
    } finally {
      await finish(run);
    }
  });
});
