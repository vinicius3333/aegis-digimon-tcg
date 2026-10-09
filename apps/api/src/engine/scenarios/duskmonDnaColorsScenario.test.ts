import { Phase, type Intent, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import type { BotPolicy } from "../../bot/policy.js";
import { buildBotView } from "../../bot/view.js";
import { layDevScenario, type DevScenarioId } from "../devScenario.js";
import { createIssueReproBotPolicy } from "../issueReproBotPolicy.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

function accepted(s: ReturnType<typeof setupEngine>, seat: Seat, intent: Intent) {
  expect(s.engine.applyIntent(seat, intent)).toEqual({ ok: true });
}

async function resolveDuskmon(s: ReturnType<typeof setupEngine>, policy: BotPolicy) {
  for (const kind of ["chooseTargets", "chooseOption"]) {
    await settle(() => s.state.pendingDecision?.kind === kind);
    const request = s.decisions.at(-1)!.req;
    expect(request.sourceCardId).toBe("BT18-078");
    const intent = policy.answerDecision(buildBotView(s.state, 1)!, request);
    expect(intent).toMatchObject({
      response:
        kind === "chooseTargets"
          ? { kind, instanceIds: ["dev-perm-0-duskmon-changed"] }
          : { kind, optionIndex: request.options!.choices!.indexOf("Red") },
    });
    expect(s.engine.applyIntent(1, intent)).toEqual({ ok: true });
  }
  await settle(
    () =>
      s.state.pendingDecision === undefined &&
      s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT18-078"),
  );
  expect(s.engine.applyIntent(1, policy.chooseMainAction(buildBotView(s.state, 1)!))).toEqual({ ok: true });
}

async function start(control: boolean) {
  const id: DevScenarioId = control
    ? "arena-discord-1557565628439724032-duskmon-dna-control"
    : "arena-discord-1557565628439724032-duskmon-dna-colors";
  const options = { autoAcceptOptional: true, autoSelectCards: false, autoChooseOption: false };
  const s = setupEngine({ 0: {}, 1: {} }, options);
  layDevScenario(id, s.state, [BLUE_DECK, RED_DECK]);
  const policy = createIssueReproBotPolicy(id)!;
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 1);
  expect(s.engine.applyIntent(1, policy.chooseBreedingAction(buildBotView(s.state, 1)!))).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(1);
  expect(s.engine.applyIntent(1, policy.chooseMainAction(buildBotView(s.state, 1)!))).toEqual({ ok: true });
  if (!control) await resolveDuskmon(s, policy);
  options.autoSelectCards = true;
  options.autoChooseOption = true;
  await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  return { s, loop };
}

function hand(s: ReturnType<typeof setupEngine>, id: string) {
  return s.state.players[0]!.hand.find((c) => c.cardId === id)!;
}
function material(s: ReturnType<typeof setupEngine>) {
  return s.state.players[0]!.battleArea.find((p) => p.permanentId === "dev-perm-0-duskmon-changed")!;
}

async function finish({ s, loop }: Awaited<ReturnType<typeof start>>) {
  if (s.state.phase === Phase.Breeding) {
    const seat = s.state.turnSeat;
    accepted(s, seat, { type: "endPhase" });
    await advance(s.engine).waitForMainPhase(seat);
  }
  expect(s.engine.applyIntent(s.state.turnSeat, { type: "surrender" })).toEqual({ ok: true });
  await loop;
  assertNoLoudGap(s);
}

describe("Discord 1557565628439724032 — live Duskmon DNA arena", () => {
  it("runs the actual bot policy, retains red after evolution, and suppresses illegal end-turn DNA", async () => {
    const run = await start(false);
    const { s } = run;
    try {
      const examon = hand(s, "BT13-059");
      const ids = [...s.state.players[0]!.battleArea].map((p) => p.permanentId);
      expect(observe(s.engine).effectiveColors(material(s))).toEqual(["Red"]);
      expect(examon.dnaDigivolveRoutes).toHaveLength(0);
      expect(
        s.engine.applyIntent(0, { type: "dnaDigivolve", instanceId: examon.instanceId, materialPermanentIds: ids }),
      ).toEqual({ ok: false, reason: "invalid-evolution" });
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: material(s).permanentId,
          instanceId: hand(s, "EX3-024").instanceId,
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      await settle(() => material(s).topCard.cardId === "EX3-024" && s.state.pendingDecision === undefined);
      expect(observe(s.engine).effectiveColors(material(s))).toEqual(["Red"]);
      expect(examon.dnaDigivolveRoutes).toHaveLength(0);
      expect(
        s.engine.applyIntent(0, {
          type: "dnaDigivolve",
          instanceId: examon.instanceId,
          materialPermanentIds: ids.reverse(),
        }),
      ).toEqual({ ok: false, reason: "invalid-evolution" });
      const decisions = s.decisions.length;
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
      expect(s.decisions.slice(decisions).some(({ req }) => req.sourceCardId === "EX13-008")).toBe(false);
      expect(hand(s, "BT13-059")).toBe(examon);
      expect(observe(s.engine).effectiveColors(material(s))).toEqual(["Blue"]);
    } finally {
      await finish(run);
    }
  });

  it.each([false, true])(
    "healthy control merges through public or inherited end-turn DNA (effect=%s)",
    async (effect) => {
      const run = await start(true);
      const { s } = run;
      try {
        const examon = hand(s, "BT13-059");
        expect(examon.dnaDigivolveRoutes).toHaveLength(1);
        if (effect) {
          accepted(s, 0, { type: "endPhase" });
        } else {
          accepted(s, 0, {
            type: "dnaDigivolve",
            instanceId: examon.instanceId,
            materialPermanentIds: [...s.state.players[0]!.battleArea].map((p) => p.permanentId).reverse(),
          });
        }
        await settle(
          () =>
            s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT13-059") &&
            s.state.pendingDecision === undefined,
        );
        const result = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT13-059")!;
        expect(result.stack.map((c) => c.cardId)).toEqual(["EX13-008", "EX13-021", "BT1-081"]);
        expect(result.isSuspended).toBe(false);
      } finally {
        await finish(run);
      }
    },
  );
});
