import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-029.js";

async function start(s: ReturnType<typeof setupEngine>) {
  const e = s.engine as unknown as { fireTiming(t: EffectTiming, trigger?: unknown): Promise<void> };
  const original = e.fireTiming.bind(s.engine);
  e.fireTiming = async (timing, trigger) => {
    const result = await original(timing, trigger);
    if (timing === EffectTiming.OnStartTurn) (s as ReturnType<typeof setupEngine> & { top?: string }).top = s.state.players[0]!.deck[0]?.cardId;
    return result;
  };
  const turn = s.engine.runOneTurn();
  const main = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
  for (let i = 0; i < 500 && !main.isOpen; i += 1) await Promise.resolve();
  expect(main.isOpen).toBe(true);
  return turn;
}

async function finish(s: ReturnType<typeof setupEngine>, turn: Promise<void>) {
  if ((s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase.isOpen) s.engine.applyIntent(0, { type: "endPhase" });
  await turn;
}

function arm(s: ReturnType<typeof setupEngine>) { s.state.players[0]!.battleArea[0]!.placedByEffect = true; s.state.isFirstPlayersFirstTurn = true; }

describe("LM-029 Yellow Scramble", () => {
  it("returns yellow trash to deck top and plays a small yellow Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "LM-029", as: "option" }], trash: ["BT1-055", "BT1-046"] }, 1: { battleArea: ["BT1-046"] } }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    await s.ready(); arm(s); const turn = await start(s);
    await settle(() => (s as ReturnType<typeof setupEngine> & { top?: string }).top === "BT1-055");
    expect((s as ReturnType<typeof setupEngine> & { top?: string }).top).toBe("BT1-055");
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT1-046")).toBe(true); await finish(s, turn);
  });

  it("does not activate when the opponent has no Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "LM-029", as: "option" }], trash: ["BT1-046"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready(); arm(s); const turn = await start(s);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-029")).toBe(true); await finish(s, turn);
  });

  it("plays a qualifying yellow Digimon from security and returns itself to hand", async () => {
    const s = setupEngine({ 0: { security: [{ card: "LM-029", as: "securityOption", faceUp: true }], trash: ["BT1-046"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption")); await settle(() => s.state.players[0]!.hand.some((c) => c.cardId === "LM-029"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT1-046")).toBe(true); expect(s.state.players[0]!.hand.some((c) => c.cardId === "LM-029")).toBe(true);
  });
});
