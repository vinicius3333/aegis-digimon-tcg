import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

const DECK = Array.from({ length: 8 }, () => "BT1-010");

async function activatableEffects(s: EngineSetup) {
  await s.ready();
  s.state.phase = Phase.Main;
  await s.engine.recomputeContinuousEffects();
  return JSON.parse(s.perm("agumon").activatableEffectsJson || "[]") as {
    instanceId: string;
    effectKey: string;
  }[];
}

async function runYourTurn(s: EngineSetup): Promise<void> {
  const effects = await activatableEffects(s);
  expect(effects).toHaveLength(1);
  expect(
    s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: effects[0]!.instanceId,
      effectKey: effects[0]!.effectKey,
    }),
  ).toEqual({ ok: true });
  await (s.engine as unknown as { mainVerbChain: Promise<void> }).mainVerbChain;
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
        1: { battleArea: [{ card: "ST2-10" }], deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 6;
    await runYourTurn(s);
    await settle(() => s.perm("agumon").topCard.cardId === "ST20-11");
    expect(s.perm("agumon").topCard.cardId).toBe("ST20-11");
    expect(s.perm("agumon").stack).toHaveLength(1);
    expect(s.state.memory).toBe(2);
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
    await runYourTurn(s);
    await settle(() => s.perm("agumon").topCard.cardId === "ST20-11");
    expect(s.perm("agumon").topCard.cardId).toBe("ST20-11");
    expect(s.state.memory).toBe(2);
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

    expect(await activatableEffects(s)).toHaveLength(0);

    expect(s.perm("agumon").topCard.cardId).toBe("ST20-10");
    expect(observe(s.engine).keywordAmount(s.perm("agumon"), "Reboot")).toBe(0);
  });

  it("exposes inherited Reboot on a real evolved host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST20-11", as: "wargreymon", under: ["ST20-10"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("wargreymon"), "Reboot")).toBe(true);
  });
});
