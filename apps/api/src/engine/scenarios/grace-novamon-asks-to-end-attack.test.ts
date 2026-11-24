import { describe, expect, it } from "vitest";
import type { DecisionResponse } from "@aegis/shared";
import { setupEngine, settle } from "#api/engine/testkit/harness";
import "#api/cards/index";

const endAttackEffectKey = "BT25-103/trash-sources-end-attack";
const endAttackText = "Then, you may end this attack.";

type Session = ReturnType<typeof setupEngine>;

function pendingPrompt(s: Session) {
  const pending = s.state.pendingDecision;
  return { seat: pending?.seat, kind: pending?.kind, ...(JSON.parse(pending?.payloadJson ?? "{}") as object) };
}

async function respond(s: Session, response: DecisionResponse) {
  const pending = s.state.pendingDecision!;
  expect(
    s.engine.applyIntent(pending.seat, { type: "respondDecision", decisionId: pending.decisionId, response }),
  ).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.decisionId !== pending.decisionId);
}

async function attackAndPresetTrash(accept: boolean): Promise<Session> {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT25-103", as: "grace", under: ["BT25-024", "BT25-028", "BT25-001", "BT25-018"] }],
      },
      1: {
        battleArea: [
          { card: "EX9-073", as: "target", under: ["EX9-006", "EX9-016", "EX9-052", "EX9-018", "EX9-043", "EX9-011"] },
        ],
        security: ["BT1-009", "BT1-010"],
      },
    },
    { autoOrderTriggers: false },
  );
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("grace").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
  const { triggerKeys } = JSON.parse(s.state.pendingDecision!.payloadJson) as { triggerKeys: string[] };
  const graceIndex = triggerKeys.findIndex((key) => key.endsWith(endAttackEffectKey));
  expect(graceIndex).toBeGreaterThanOrEqual(0);
  const optionalAnswersByIndex = triggerKeys.map((_, index) => (index === graceIndex ? accept : null));
  await respond(s, {
    kind: "orderTriggers",
    order: [],
    orderIndexes: [graceIndex],
    optionalAnswersByIndex,
  } as DecisionResponse);
  return s;
}

const endAttackPrompt = {
  seat: 0,
  kind: "optional",
  effectKey: expect.stringContaining("BT25-103"),
  effectTextPart: endAttackText,
};

describe("GraceNovamon asks to end its attack whatever the trigger preset", () => {
  it("asks after a No preset declines the trash", async () => {
    const s = await attackAndPresetTrash(false);

    expect(pendingPrompt(s)).toMatchObject(endAttackPrompt);
  });

  it("asks after a Yes preset trashes instead of ending the attack automatically", async () => {
    const s = await attackAndPresetTrash(true);
    const pick = s.state.pendingDecision!;
    const { candidateInstanceIds, max } = JSON.parse(pick.payloadJson) as {
      candidateInstanceIds: string[];
      max: number;
    };
    await respond(s, { kind: "selectCards", instanceIds: candidateInstanceIds.slice(0, max) });

    expect(pendingPrompt(s)).toMatchObject(endAttackPrompt);
  });
});
