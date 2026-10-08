import { getCardDefinition, type Intent, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { advance } from "./testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

const FILLER = Array.from({ length: 12 }, () => "BT1-010");

type Setup = ReturnType<typeof setupEngine>;
function accepted(s: Setup, seat: Seat, intent: Intent) {
  expect(s.engine.applyIntent(seat, intent)).toEqual({ ok: true });
}
async function rewrite(s: Setup, changed: string) {
  accepted(s, 0, { type: "playCard", instanceId: s.inst("king").instanceId });
  await settle(() => observe(s.engine).effectiveColors(s.perm(changed)).includes("White") && !s.state.pendingDecision);
  expect(observe(s.engine).effectiveNames(s.perm(changed))).toContain("sukamon");
  expect(s.perm(changed).currentDP).toBe(3000);
}
function assertUnmerged(s: Setup) {
  expect(s.state.players[1]!.hand).toContain(s.inst("result"));
}
function assertExpired(s: Setup, changed: string) {
  expect(observe(s.engine).effectiveColors(s.perm(changed))).not.toContain("White");
}
function assertSources(s: Setup, sources: string[]) {
  expect(s.perm("result").stack.map((c) => c.cardId)).toEqual(sources);
}
function assertFreshMastemon(s: Setup) {
  expect(observe(s.engine).effectiveNames(s.perm("result"))).toEqual(["mastemon"]);
  expect(observe(s.engine).effectiveColors(s.perm("result"))).toEqual(["Yellow", "Purple"]);
}
function assertMemory(s: Setup, memory: number) {
  expect(s.state.memory).toBe(memory);
}

async function start(host: string, partner: string, into: string, under: string[], changed?: "host" | "partner") {
  const preferred: string[] = [];
  const s = setupEngine(
    {
      0: {
        hand: [{ card: "BT11-043", as: "king" }],
        trash: ["BT11-040", "BT11-040", "BT11-040"],
        deck: FILLER,
        security: 5,
      },
      1: {
        battleArea: [
          { card: host, as: "host", under },
          { card: partner, as: "partner" },
        ],
        hand: [{ card: into, as: "result" }],
        deck: FILLER,
        security: 5,
      },
    },
    {
      autoSelectCards: true,
      autoAcceptOptional: true,
      declinePrompts: ["Examon", "Mastemon"],
      preferInstanceIds: preferred,
    },
  );
  s.state.memory = 10;
  await s.ready();
  if (changed) {
    preferred.push(s.perm(changed).permanentId);
    await rewrite(s, changed);
  }
  s.state.turnSeat = 1;
  const turn = s.engine.runOneTurn();
  const run = { s, turn };
  try {
    await advance(s.engine).waitForMainPhase(1);
    return run;
  } catch (error) {
    await finish(run);
    throw error;
  }
}
async function finish({ s, turn }: { s: ReturnType<typeof setupEngine>; turn: Promise<void> }) {
  if (!s.state.gameOver) accepted(s, s.state.turnSeat, { type: "surrender" });
  await turn;
  assertNoLoudGap(s);
}

const OWN_END_TURN = [
  ["EX3-020", "EX13-044", "Sky Dragon"],
  ["EX3-041", "EX3-024", "Earth Dragon"],
] as const;

describe("Discord 1557631388650315826 — isolated Sukamon DNA interaction routes", () => {
  for (const [host, partner, trait] of OWN_END_TURN) {
    it.each([undefined, "host", "partner"] as const)(
      `${host} own end-turn DNA without inherited enabler (rewrite=%s)`,
      async (changed) => {
        const run = await start(host, partner, "EX13-045", [], changed);
        const { s } = run;
        try {
          expect(s.perm("host").stack).toHaveLength(0);
          expect(getCardDefinition(host)!.level).toBe(5);
          expect(observe(s.engine).hasEffectiveTrait(s.perm("host"), trait)).toBe(true);
          expect(s.inst("result").dnaDigivolveRoutes).toHaveLength(changed ? 0 : 1);
          // Examon-specific DNA level treatment must never authorize ordinary Lv.6 evolution.
          const memory = s.state.memory;
          expect(
            s.engine.applyIntent(1, {
              type: "digivolve",
              permanentId: s.perm("host").permanentId,
              instanceId: s.inst("result").instanceId,
            }),
          ).toEqual({ ok: false, reason: "invalid-evolution" });
          expect(s.state.memory).toBe(memory);
          expect(s.inst("result").digivolveTargetPermanentIds).not.toContain(s.perm("host").permanentId);
          const before = s.decisions.length;
          expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
          await run.turn;
          expect(s.state.pendingDecision).toBeUndefined();
          expect(s.decisions.slice(before).some(({ req }) => req.sourceCardId === "EX13-008")).toBe(false);
          expect(s.state.players[1]!.battleArea.map((p) => p.topCard.cardId)).toEqual(
            changed ? [host, partner] : ["EX13-045"],
          );
          expect(s.decisions.slice(before).some(({ req }) => req.sourceCardId === host)).toBe(!changed);
          if (changed) {
            assertUnmerged(s);
            assertExpired(s, changed);
          } else {
            assertSources(s, host === "EX3-020" ? [host, partner] : [partner, host]);
          }
        } finally {
          await finish(run);
        }
      },
    );
  }

  for (const inherited of [false, true]) {
    it.each([false, true])(
      `white Kimeramon needs gained yellow for Mastemon (inherited=${inherited}, yellow=%s)`,
      async (yellow) => {
        const under = [...(inherited ? ["EX13-008"] : []), ...(yellow ? ["BT1-045"] : [])];
        const run = await start("BT8-084", "BT2-075", "ST10-06", under, "host");
        const { s } = run;
        try {
          const colors = observe(s.engine).effectiveColors(s.perm("host"));
          expect(colors).toContain("White");
          expect(colors.includes("Yellow")).toBe(yellow);
          expect(observe(s.engine).effectiveNames(s.perm("host"))).toEqual(["sukamon"]);
          expect(s.perm("host").currentDP).toBe(3000);
          expect(s.inst("result").dnaDigivolveRoutes).toHaveLength(yellow ? 1 : 0);
          const memory = s.state.memory;
          const before = s.decisions.length;
          const intent: Intent = inherited
            ? { type: "endPhase" }
            : {
                type: "dnaDigivolve",
                instanceId: s.inst("result").instanceId,
                materialPermanentIds: [s.perm("partner").permanentId, s.perm("host").permanentId],
              };
          expect(s.engine.applyIntent(1, intent)).toEqual(
            yellow || inherited ? { ok: true } : { ok: false, reason: "invalid-evolution" },
          );
          if (inherited) await run.turn;
          else if (yellow)
            await settle(
              () =>
                s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "ST10-06") && !s.state.pendingDecision,
            );
          expect(s.state.players[1]!.battleArea.map((p) => p.topCard.cardId)).toEqual(
            yellow ? ["ST10-06"] : ["BT8-084", "BT2-075"],
          );
          expect(s.decisions.slice(before).some(({ req }) => req.sourceCardId === "EX13-008")).toBe(
            yellow && inherited,
          );
          if (yellow) {
            assertSources(s, ["BT2-075", ...under, "BT8-084"]);
            assertFreshMastemon(s);
          } else {
            assertUnmerged(s);
          }
          if (!inherited) assertMemory(s, memory);
          expect(s.state.pendingDecision).toBeUndefined();
        } finally {
          await finish(run);
        }
      },
    );
  }
});
