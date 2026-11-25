import { describe, expect, it } from "vitest";
import type { DecisionResponse } from "@aegis/shared";
import { setupEngine, settle } from "#api/engine/testkit/harness";
import "#api/cards/index";

const dnaText = "Then, 2 of your Digimon may DNA digivolve into [GraceNovamon] in the hand.";

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

async function digivolveIntoDianamonWithYesPreset(): Promise<Session> {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT25-026", as: "host" },
          { card: "BT25-018", as: "apollo", under: ["BT25-001", "BT25-008", "BT25-013", "BT25-017"] },
        ],
        hand: [
          { card: "BT25-028", as: "diana" },
          { card: "BT25-103", as: "grace" },
        ],
      },
      1: {
        battleArea: [{ card: "BT1-025", as: "victim", under: ["BT1-001", "BT1-009", "BT1-014", "BT1-020"] }],
      },
    },
    { autoOrderTriggers: false },
  );
  s.state.memory = 10;
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("host").permanentId,
      instanceId: s.inst("diana").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
  const { triggerKeys } = JSON.parse(s.state.pendingDecision!.payloadJson) as { triggerKeys: string[] };
  const allTurnsIndex = triggerKeys.findIndex((key) => key.includes("whenAnyDigivolves"));
  expect(allTurnsIndex).toBeGreaterThanOrEqual(0);
  await respond(s, {
    kind: "orderTriggers",
    order: [],
    orderIndexes: [allTurnsIndex],
    optionalAnswersByIndex: triggerKeys.map((_, index) => (index === allTurnsIndex ? true : null)),
  } as DecisionResponse);
  return s;
}

describe("A Yes trigger preset still asks a follow-up optional DNA digivolve", () => {
  it("asks Dianamon's DNA digivolve after the preset trashes exactly four cards", async () => {
    const s = await digivolveIntoDianamonWithYesPreset();

    expect(s.perm("victim").stack).toHaveLength(0);
    expect(pendingPrompt(s)).toMatchObject({ seat: 0, kind: "optional", effectTextPart: dnaText });
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT25-103")).toBe(true);
  });

  it("keeps GraceNovamon in hand when the DNA digivolve is declined", async () => {
    const s = await digivolveIntoDianamonWithYesPreset();
    await respond(s, { kind: "optional", accept: false });

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT25-103")).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT25-103")).toBe(true);
  });
});
