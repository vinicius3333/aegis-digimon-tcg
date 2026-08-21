import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-028.js";

async function openStart(s: ReturnType<typeof setupEngine>): Promise<{ turn: Promise<void> }> {
  const engine = s.engine as unknown as { fireTiming(timing: EffectTiming, trigger?: unknown): Promise<void> };
  const original = engine.fireTiming.bind(s.engine);
  engine.fireTiming = async (timing, trigger) => {
    const result = await original(timing, trigger);
    if (timing === EffectTiming.OnStartTurn) {
      (s as ReturnType<typeof setupEngine> & { startDeckTop?: string }).startDeckTop = s.state.players[0]!.deck[0]?.cardId;
    }
    return result;
  };
  const turn = s.engine.runOneTurn();
  const main = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
  for (let i = 0; i < 500 && !main.isOpen; i += 1) await Promise.resolve();
  expect(main.isOpen).toBe(true);
  return { turn };
}

async function closeTurn(s: ReturnType<typeof setupEngine>, turn: Promise<void>): Promise<void> {
  const main = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
  if (main.isOpen) expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await turn;
}

function armOption(s: ReturnType<typeof setupEngine>): void {
  s.state.players[0]!.battleArea[0]!.placedByEffect = true;
  s.state.isFirstPlayersFirstTurn = true;
}

describe("LM-028 Blue Scramble", () => {
  it("places itself after blue digivolution", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-029", as: "host" }], hand: [{ card: "LM-028", as: "option" }, "ST8-04"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-028"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-028")).toBe(true);
  });

  it("returns blue trash to deck top before playing a small blue Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "LM-028", as: "option" }], trash: ["BT1-030", "BT1-029"] }, 1: { battleArea: ["BT1-029"] } }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    await s.ready();
    armOption(s);
    const { turn } = await openStart(s);
    await settle(() => (s as ReturnType<typeof setupEngine> & { startDeckTop?: string }).startDeckTop === "BT1-030");
    expect((s as ReturnType<typeof setupEngine> & { startDeckTop?: string }).startDeckTop).toBe("BT1-030");
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT1-029")).toBe(true);
    await closeTurn(s, turn);
  });

  it("does not activate without an opponent Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "LM-028", as: "option" }], trash: ["BT1-029"] } }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    await s.ready();
    armOption(s);
    const { turn } = await openStart(s);
    expect(s.state.players[0]!.trash.some((c) => c.cardId === "LM-029")).toBe(false);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-028")).toBe(true);
    await closeTurn(s, turn);
  });

  it("plays a qualifying blue Digimon from security and returns itself to hand", async () => {
    const s = setupEngine({ 0: { security: [{ card: "LM-028", as: "securityOption", faceUp: true }], trash: ["BT1-029"] } }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    await settle(() => s.state.players[0]!.hand.some((c) => c.cardId === "LM-028"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT1-029")).toBe(true);
    expect(s.state.players[0]!.hand.some((c) => c.cardId === "LM-028")).toBe(true);
  });
});
