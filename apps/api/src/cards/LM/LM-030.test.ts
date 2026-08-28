import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-030.js";

// The six coloured Scrambles share one printed card; each is proven on its own colour so a
// colour-swapped regression in one module cannot hide behind another.
async function openAfterStartOfTurn(s: ReturnType<typeof setupEngine>): Promise<{ turn: Promise<void> }> {
  const turn = s.engine.runOneTurn();
  const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
  for (let i = 0; i < 500 && !mainPhase.isOpen; i += 1) await Promise.resolve();
  expect(mainPhase.isOpen).toBe(true);
  return { turn };
}

async function closeTurn(s: ReturnType<typeof setupEngine>, turn: Promise<void>): Promise<void> {
  const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
  // Production may auto-end the Main phase; ending an already-closed one is not an assertion.
  if (mainPhase.isOpen) {
    const ended = s.engine.applyIntent(0, { type: "endPhase" });
    if (!ended.ok) throw new Error(`Could not end the Main phase: ${ended.reason}`);
  }
  await turn;
}

describe("LM-030 Green Scramble", () => {
  it("digivolves a green Digimon from hand at a cost reduced by 3, then enters the battle area", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT1-067", as: "host" }], hand: [{ card: "LM-030", as: "option" }, "BT6-050"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    // 2 to use the Option, then 0 for the reduced (printed cost 3) digivolution.
    s.state.memory = 2;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT6-050"), 2000);

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT6-050")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-030")).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("Delay returns a green Digimon to the deck top and then revives a small one", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-030", as: "option" }], trash: ["BT1-064", "BT1-066"] },
        1: { battleArea: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    s.state.players[0]!.battleArea[0]!.placedByEffect = true;
    s.state.isFirstPlayersFirstTurn = true;
    const { turn } = await openAfterStartOfTurn(s);
    await settle(() => s.state.players[0]!.deck.length === 1, 2000);

    expect(s.state.players[0]!.deck[0]?.cardId).toBe("BT1-064");
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-066")).toBe(true);
    await closeTurn(s, turn);
  });

  it("does not activate Delay when the opponent has no Digimon", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "LM-030", as: "option" }], trash: ["BT1-066"] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    s.state.players[0]!.battleArea[0]!.placedByEffect = true;
    s.state.isFirstPlayersFirstTurn = true;
    const { turn } = await openAfterStartOfTurn(s);

    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-066")).toBe(true);
    await closeTurn(s, turn);
  });

  it("Security plays a qualifying green Digimon from trash and returns itself to hand", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "LM-030", as: "securityOption", faceUp: true }], trash: ["BT1-066"] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "LM-030"), 2000);

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-066")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "LM-030")).toBe(true);
  });

  it("Security leaves a green Digimon above 2000 DP in the trash", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "LM-030", as: "securityOption", faceUp: true }], trash: ["BT1-064"] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "LM-030"), 2000);

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-064")).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-064")).toBe(true);
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-030");
    const compiled = runtimeCompiledCard("LM-030");
    expect(definition?.nameEn).toBe("Green Scramble");
    expect(definition?.colors).toEqual(["Green"]);
    expect(definition?.playCost).toBe(2);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.find((effect) => effect.trigger === "StartOfYourTurn")).toMatchObject({
      keywords: [{ keyword: "Delay" }],
      condition: { kind: "opponentHas" },
    });
  });
});
