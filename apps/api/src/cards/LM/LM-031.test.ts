import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-031.js";

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

describe("LM-031 Black Scramble", () => {
  it("digivolves a black Digimon from hand at a cost reduced by 3, then enters the battle area", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT10-058", as: "host" }], hand: [{ card: "LM-031", as: "option" }, "BT10-061"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    // 2 to use the Option, then 0 for the reduced (printed cost 3) digivolution.
    s.state.memory = 2;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT10-061"), 2000);

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT10-061")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-031")).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("Delay returns a black Digimon to the deck top and then revives a small one", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-031", as: "option" }], trash: ["BT11-062", "BT10-060"] },
        1: { battleArea: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    s.state.players[0]!.battleArea[0]!.placedByEffect = true;
    s.state.isFirstPlayersFirstTurn = true;
    const { turn } = await openAfterStartOfTurn(s);
    await settle(() => s.state.players[0]!.deck.length === 1, 2000);

    expect(s.state.players[0]!.deck[0]?.cardId).toBe("BT11-062");
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT10-060")).toBe(true);
    await closeTurn(s, turn);
  });

  it("does not activate Delay when the opponent has no Digimon", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "LM-031", as: "option" }], trash: ["BT10-060"] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    s.state.players[0]!.battleArea[0]!.placedByEffect = true;
    s.state.isFirstPlayersFirstTurn = true;
    const { turn } = await openAfterStartOfTurn(s);

    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT10-060")).toBe(true);
    await closeTurn(s, turn);
  });

  it("Security plays a qualifying black Digimon from trash and returns itself to hand", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "LM-031", as: "securityOption", faceUp: true }], trash: ["BT10-060"] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "LM-031"), 2000);

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT10-060")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "LM-031")).toBe(true);
  });

  it("Security leaves a black Digimon above 2000 DP in the trash", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "LM-031", as: "securityOption", faceUp: true }], trash: ["BT11-062"] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "LM-031"), 2000);

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT11-062")).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT11-062")).toBe(true);
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-031");
    const compiled = runtimeCompiledCard("LM-031");
    expect(definition?.nameEn).toBe("Black Scramble");
    expect(definition?.colors).toEqual(["Black"]);
    expect(definition?.playCost).toBe(2);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.find((effect) => effect.trigger === "StartOfYourTurn")).toMatchObject({
      keywords: [{ keyword: "Delay" }],
      condition: { kind: "opponentHas" },
    });
  });
});
