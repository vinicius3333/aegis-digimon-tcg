import { Phase, type Intent, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { buildBotView } from "../bot/view.js";
import { layDevScenario, type DevScenarioId } from "./devScenario.js";
import { createIssueReproBotPolicy } from "./issueReproBotPolicy.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

function accepted(s: ReturnType<typeof setupEngine>, seat: Seat, intent: Intent) {
  expect(s.engine.applyIntent(seat, intent)).toEqual({ ok: true });
}
function assertKingDecision(s: ReturnType<typeof setupEngine>) {
  const request = s.decisions.at(-1)!.req;
  expect(request.sourceCardId).toBe("BT11-043");
  return request;
}
function assertKingResponse(response: Intent) {
  expect(response).toMatchObject({
    response: { kind: "chooseTargets", instanceIds: ["dev-perm-0-sukamon-dna-changed"] },
  });
}
function assertMemory(s: ReturnType<typeof setupEngine>, memory: number) {
  expect(s.state.memory).toBe(memory);
}

async function start(control: boolean) {
  const id: DevScenarioId = control
    ? "arena-discord-1557631388650315826-sukamon-dna-control"
    : "arena-discord-1557631388650315826-sukamon-dna-materials";
  const options = { autoAcceptOptional: true, autoSelectCards: false, declinePrompts: ["Examon"] };
  const s = setupEngine({ 0: {}, 1: {} }, options);
  layDevScenario(id, s.state, [BLUE_DECK, RED_DECK]);
  const policy = createIssueReproBotPolicy(id)!;
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 1);
    expect(s.engine.applyIntent(1, policy.chooseBreedingAction(buildBotView(s.state, 1)!))).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, policy.chooseMainAction(buildBotView(s.state, 1)!))).toEqual({ ok: true });
    if (!control) {
      await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
      const request = assertKingDecision(s);
      const response = policy.answerDecision(buildBotView(s.state, 1)!, request);
      assertKingResponse(response);
      accepted(s, 1, response);
      await settle(
        () => s.state.pendingDecision === undefined && observe(s.engine).effectiveColors(material(s)).includes("White"),
      );
      accepted(s, 1, policy.chooseMainAction(buildBotView(s.state, 1)!));
    }
    options.autoSelectCards = true;
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    return { s, loop };
  } catch (error) {
    await finish({ s, loop });
    throw error;
  }
}
function material(s: ReturnType<typeof setupEngine>) {
  return s.state.players[0]!.battleArea.find((p) => p.permanentId === "dev-perm-0-sukamon-dna-changed")!;
}
function resultCard(s: ReturnType<typeof setupEngine>) {
  return s.state.players[0]!.hand.find((c) => c.cardId === "EX13-045")!;
}
async function finish({ s, loop }: Awaited<ReturnType<typeof start>>) {
  if (!s.state.gameOver && s.state.phase === Phase.Breeding) {
    const seat = s.state.turnSeat;
    accepted(s, seat, { type: "endPhase" });
    await advance(s.engine).waitForMainPhase(seat);
  }
  if (!s.state.gameOver) accepted(s, s.state.turnSeat, { type: "surrender" });
  await loop;
  assertNoLoudGap(s);
}

describe("Discord 1557631388650315826 / GH5304 — live Sukamon DNA arena", () => {
  it("uses real KingSukamon bot intents, rejects manual DNA and inherited end-turn DNA, then expires the rewrite", async () => {
    const run = await start(false);
    const { s } = run;
    try {
      const examon = resultCard(s);
      const ids = [...s.state.players[0]!.battleArea].map((p) => p.permanentId);
      expect(observe(s.engine).effectiveColors(material(s))).toEqual(["White"]);
      expect(observe(s.engine).effectiveNames(material(s))).toEqual(["sukamon", "slayerdramon"]);
      expect(material(s).currentDP).toBe(3000);
      expect(examon.dnaDigivolveRoutes).toHaveLength(0);
      const memory = s.state.memory;
      for (const order of [ids, [...ids].reverse()]) {
        expect(
          s.engine.applyIntent(0, { type: "dnaDigivolve", instanceId: examon.instanceId, materialPermanentIds: order }),
        ).toEqual({ ok: false, reason: "invalid-evolution" });
      }
      expect(s.state.memory).toBe(memory);
      const decisions = s.decisions.length;
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
      expect(s.decisions.slice(decisions).some(({ req }) => req.sourceCardId === "EX13-008")).toBe(false);
      expect(resultCard(s)).toBe(examon);
      expect(s.state.players[0]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["EX13-021", "EX13-044"]);
      expect(observe(s.engine).effectiveColors(material(s))).toEqual(["Blue", "Red"]);
      expect(s.state.pendingDecision).toBeUndefined();
    } finally {
      await finish(run);
    }
  });
  it.each([false, true])("healthy pair succeeds via manual or inherited DNA (end-turn=%s)", async (effect) => {
    const run = await start(true);
    const { s } = run;
    try {
      const examon = resultCard(s);
      expect(examon.dnaDigivolveRoutes).toHaveLength(1);
      const memory = s.state.memory;
      expect(
        s.engine.applyIntent(
          0,
          effect
            ? { type: "endPhase" }
            : {
                type: "dnaDigivolve",
                instanceId: examon.instanceId,
                materialPermanentIds: [...s.state.players[0]!.battleArea].map((p) => p.permanentId).reverse(),
              },
        ),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX13-045") &&
          s.events.some(({ kind }) => kind === "attackEnded") &&
          s.state.pendingDecision === undefined,
      );
      const result = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "EX13-045")!;
      expect(result.stack.map((c) => c.cardId)).toEqual(["EX13-008", "EX13-021", "EX13-044"]);
      expect(s.events.filter(({ kind }) => kind === "attackDeclared")).toHaveLength(1);
      expect(result.isSuspended).toBe(false); // Wingdramon's inherited effect unsuspends after the mandatory attack.
      if (!effect) assertMemory(s, memory);
    } finally {
      await finish(run);
    }
  });
});
