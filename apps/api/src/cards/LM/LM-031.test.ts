import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-031.js";

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

async function finish(s: ReturnType<typeof setupEngine>, turn: Promise<void>) { if ((s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase.isOpen) s.engine.applyIntent(0, { type: "endPhase" }); await turn; }
function arm(s: ReturnType<typeof setupEngine>) { s.state.players[0]!.battleArea[0]!.placedByEffect = true; s.state.isFirstPlayersFirstTurn = true; }

describe("LM-031 Black Scramble", () => {
  it("returns black trash to deck top and plays a small black Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "LM-031", as: "option" }], trash: ["BT4-066", "BT4-063"] }, 1: { battleArea: ["BT4-063"] } }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    await s.ready(); arm(s); const turn = await start(s); await settle(() => (s as ReturnType<typeof setupEngine> & { top?: string }).top === "BT4-066");
    expect((s as ReturnType<typeof setupEngine> & { top?: string }).top).toBe("BT4-066"); expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT4-063")).toBe(true); await finish(s, turn);
  });

  it("does not activate when the opponent has no Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "LM-031", as: "option" }], trash: ["BT4-063"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready(); arm(s); const turn = await start(s); expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-031")).toBe(true); await finish(s, turn);
  });

  it("plays a qualifying black Digimon from security and returns itself to hand", async () => {
    const s = setupEngine({ 0: { security: [{ card: "LM-031", as: "securityOption", faceUp: true }], trash: ["BT4-063"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption")); await settle(() => s.state.players[0]!.hand.some((c) => c.cardId === "LM-031"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT4-063")).toBe(true); expect(s.state.players[0]!.hand.some((c) => c.cardId === "LM-031")).toBe(true);
  });
});
