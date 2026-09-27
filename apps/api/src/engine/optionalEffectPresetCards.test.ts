import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

const modes = ["yes", "no", "mixed"] as const;
type Mode = (typeof modes)[number];
const options = { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false };

async function answerPlan(s: EngineSetup, mode: Mode, cardId: string): Promise<void> {
  await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
  const prompt = s.decisions.findLast(({ req }) => req.kind === "orderTriggers")!.req;
  const keys = prompt.options!.triggerKeys!;
  const cardKeys = keys.filter((_, index) => prompt.options!.triggerCardIds![index] === cardId);
  expect(cardKeys).toHaveLength(2);
  expect(new Set(cardKeys).size).toBe(2);
  for (const key of cardKeys) expect(prompt.options!.triggerIsOptional![keys.indexOf(key)]).toBe(true);
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: prompt.decisionId,
      response: {
        kind: "orderTriggers",
        order: [...cardKeys, ...keys.filter((key) => !cardKeys.includes(key))],
        optionalAnswers: Object.fromEntries(
          cardKeys.map((key, index) => [key, mode === "yes" || (mode === "mixed" && index === 1)]),
        ),
      },
    }),
  ).toEqual({ ok: true });
}

function expectNoExtraConfirmation(s: EngineSetup): void {
  expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(0);
  expect(s.decisions.filter(({ req }) => req.kind === "orderTriggers")).toHaveLength(1);
  expect(s.state.pendingDecision).toBeUndefined();
}

describe("optional presets across card families", () => {
  it.each(modes)("BT8-088 honors %s on two copies during digivolution", async (mode) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-088", as: "first" },
            { card: "BT8-088", as: "second" },
            { card: "BT8-010", as: "base", suspended: true },
          ],
          hand: [{ card: "BT8-015", as: "evolving" }],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      options,
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await answerPlan(s, mode, "BT8-088");
    await settle(() => s.state.pendingDecision === undefined);
    expectNoExtraConfirmation(s);
    expect(s.perm("base").isSuspended).toBe(mode === "no");
    expect(s.perm("first").isSuspended).toBe(mode === "yes");
    expect(s.perm("second").isSuspended).toBe(mode !== "no");
  });

  it.each(modes)("BT16-082 honors %s for hatching while preserving mandatory reveals", async (mode) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-082", as: "first" },
            { card: "BT16-082", as: "second" },
          ],
          breeding: { card: "BT1-009", as: "moved" },
          deck: Array(12).fill("BT1-010"),
          eggDeck: ["BT1-001"],
        },
        1: { deck: ["BT1-010"] },
      },
      options,
    );
    await s.ready();
    const turn = s.engine.runOneTurn();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      const handBefore = s.state.players[0]!.hand.length;
      expect(
        s.engine.applyIntent(0, {
          type: "moveFromBreeding",
          permanentId: s.perm("moved").permanentId,
        }),
      ).toEqual({ ok: true });
      await answerPlan(s, mode, "BT16-082");
      await advance(s.engine).waitForMainPhase(0);
      expectNoExtraConfirmation(s);
      expect(s.state.players[0]!.hand).toHaveLength(handBefore + 2);
      expect(s.state.players[0]!.breeding?.topCard.cardId).toBe(mode === "no" ? undefined : "BT1-001");
      expect(s.decisions.filter(({ req }) => req.kind === "selectCards")).toHaveLength(2);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await turn;
    }
  });

  it.each(modes)("BT23-072 honors %s for suspension costs and keyword grants", async (mode) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-072", as: "first" },
            { card: "BT23-072", as: "second" },
          ],
          hand: [{ card: "BT23-062", as: "played" }],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      options,
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await answerPlan(s, mode, "BT23-072");
    await settle(() => s.state.pendingDecision === undefined);
    expectNoExtraConfirmation(s);
    expect(s.perm("first").isSuspended).toBe(mode === "yes");
    expect(s.perm("second").isSuspended).toBe(mode !== "no");
    for (const keyword of ["Rush", "Raid", "Reboot", "Blocker"] as const) {
      expect(observe(s.engine).hasKeyword(s.perm("played"), keyword)).toBe(mode !== "no");
    }
  });
});
