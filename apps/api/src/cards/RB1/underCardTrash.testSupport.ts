import { expect } from "vitest";
import { setupEngine, settle, type EngineSetup, type PermanentSpec } from "../../engine/testkit/harness.js";
import "../index.js";

interface CandidateOptions {
  candidateInstanceIds: string[];
}

function candidatesOf(s: EngineSetup, decisionId: string): string[] {
  const entry = s.decisions.find(({ req }) => req.decisionId === decisionId)!;
  return (JSON.parse(JSON.stringify(entry.req.options)) as CandidateOptions).candidateInstanceIds;
}

/**
 * Digivolves `evolvingId` (Thetismon or Amphimon) onto `baseId` with two blue hand cards, and
 * answers each choice by hand: blue payments take the first candidate, each target choice takes
 * the next of `targetAliases`, and each "card under it" choice takes the next of `underAliases`.
 * Returns the candidate lists offered by every target choice, in order.
 */
export async function digivolveTrashingUnderCards(options: {
  baseId: string;
  evolvingId: string;
  opponent: PermanentSpec[];
  targetAliases: string[];
  underAliases: string[];
  blueCards?: number;
}): Promise<{ s: EngineSetup; targetCandidates: string[][] }> {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: options.baseId, as: "base" }],
        hand: [
          { card: options.evolvingId, as: "evolving" },
          ...Array.from({ length: options.blueCards ?? 2 }, () => "RB1-011"),
        ],
      },
      1: { battleArea: options.opponent },
    },
    { autoAcceptOptional: true, declinePrompts: ["Return"] },
  );
  s.state.memory = 10;
  await s.ready();
  const targets = options.targetAliases.map((alias) => s.perm(alias).permanentId);
  const unders = options.underAliases.map((alias) => s.inst(alias).instanceId);
  const targetCandidates: string[][] = [];
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("evolving").instanceId,
    }),
  ).toEqual({ ok: true });

  for (let answered = 0; answered < 20; answered += 1) {
    await settle();
    const pending = s.state.pendingDecision;
    if (pending === undefined) break;
    const candidates = candidatesOf(s, pending.decisionId);
    const handIds = new Set(s.state.players[0]!.hand.map((card) => card.instanceId));
    if (pending.kind === "chooseTargets") {
      targetCandidates.push(candidates);
      const next = targets.shift() ?? candidates[0]!;
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "chooseTargets", instanceIds: [next] },
      });
    } else if (pending.kind === "selectCards") {
      const next = candidates.every((id) => handIds.has(id)) ? candidates[0]! : unders.shift()!;
      expect(candidates).toContain(next);
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "selectCards", instanceIds: [next] },
      });
    } else {
      throw new Error(`unexpected decision ${pending.kind}`);
    }
  }
  await settle();
  return { s, targetCandidates };
}
