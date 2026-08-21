import { describe, expect, it } from "vitest";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST20-10.js";

const DECK = Array.from({ length: 8 }, () => "BT1-010");

async function runYourTurn(s: EngineSetup, activate = true): Promise<{ turn: Promise<void> }> {
  await s.ready();
  const turn = s.engine.runOneTurn();
  const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
  for (let i = 0; i < 500 && !mainPhase.isOpen; i += 1) await Promise.resolve();
  await s.engine.recomputeContinuousEffects();
  const effects = JSON.parse(s.perm("agumon").activatableEffectsJson || "[]") as {
    instanceId: string;
    effectKey: string;
  }[];
  if (activate) {
    expect(effects).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: effects[0]!.instanceId,
        effectKey: effects[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
  } else expect(effects).toHaveLength(0);
  return { turn };
}

describe("ST20-10 Agumon", () => {
  it("digivolves into WarGreymon for 4 when the opponent has 10000 DP or more", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST20-10", as: "agumon" }],
          hand: [{ card: "ST20-11", as: "wargreymon" }],
          deck: DECK,
        },
        1: { battleArea: [{ card: "ST20-11" }], deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 6;
    const { turn } = await runYourTurn(s);
    await settle(() => s.perm("agumon").topCard.cardId === "ST20-11");
    s.engine.applyIntent(0, { type: "endPhase" });
    await turn;
    expect(s.perm("agumon").topCard.cardId).toBe("ST20-11");
    expect(s.perm("agumon").stack).toHaveLength(1);
  });

  it("also digivolves when three distinct Tamer colors satisfy the alternate branch", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST20-10", as: "agumon" }, "ST20-12", "BT21-102"],
          hand: [{ card: "ST20-11", as: "wargreymon" }],
          deck: DECK,
        },
        1: { deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 6;
    const { turn } = await runYourTurn(s);
    await settle(() => s.perm("agumon").topCard.cardId === "ST20-11");
    s.engine.applyIntent(0, { type: "endPhase" });
    await turn;
    expect(s.perm("agumon").topCard.cardId).toBe("ST20-11");
  });

  it("does not digivolve when neither condition is satisfied", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST20-10", as: "agumon" }], hand: ["ST20-11"], deck: DECK },
        1: { battleArea: [{ card: "BT1-009", dp: 9000 }], deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;

    const { turn } = await runYourTurn(s, false);
    s.engine.applyIntent(0, { type: "endPhase" });
    await turn;
    await settle(() => false, 1);

    expect(s.perm("agumon").topCard.cardId).toBe("ST20-10");
    expect(observe(s.engine).keywordAmount(s.perm("agumon"), "Reboot")).toBe(0);
  });
});
