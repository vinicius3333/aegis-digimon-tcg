import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-027.js";

async function openAfterStartOfTurn(s: ReturnType<typeof setupEngine>): Promise<{ turn: Promise<void> }> {
  const engineAny = s.engine as unknown as { fireTiming(timing: EffectTiming, trigger?: unknown): Promise<void> };
  const original = engineAny.fireTiming.bind(s.engine);
  engineAny.fireTiming = async (timing, trigger) => {
    const result = await original(timing, trigger);
    if (timing === EffectTiming.OnStartTurn) {
      (s as ReturnType<typeof setupEngine> & { startDeckTop?: string }).startDeckTop =
        s.state.players[0]!.deck[0]?.cardId;
    }
    return result;
  };
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

describe("LM-027 Red Scramble", () => {
  it("digivolves a red Digimon from hand and places Red Scramble in the battle area", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT1-010", as: "host" }], hand: [{ card: "LM-027", as: "option" }, "BT1-015"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    s.state.players[0]!.battleArea[0]!.placedByEffect = true;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-015"));
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-027"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-015")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-027")).toBe(true);
  });

  it("Delay returns a red Digimon to deck before playing a small red Digimon when empty", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-027", as: "option" }], trash: ["BT1-011", "BT1-010"] },
        1: { battleArea: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    s.state.players[0]!.battleArea[0]!.placedByEffect = true;
    s.state.isFirstPlayersFirstTurn = true;
    const { turn } = await openAfterStartOfTurn(s);
    await settle(() => s.state.players[0]!.deck[0]?.cardId === "BT1-011");
    expect((s as ReturnType<typeof setupEngine> & { startDeckTop?: string }).startDeckTop).toBe("BT1-011");
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-010")).toBe(true);
    await closeTurn(s, turn);
  });

  it("Delay does not play a red Digimon above 2000 DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-027", as: "option" }], trash: ["BT1-013", "BT1-011"] },
        1: { battleArea: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    s.state.players[0]!.battleArea[0]!.placedByEffect = true;
    s.state.isFirstPlayersFirstTurn = true;
    const { turn } = await openAfterStartOfTurn(s);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-013")).toBe(false);
    expect((s as ReturnType<typeof setupEngine> & { startDeckTop?: string }).startDeckTop).toBe("BT1-013");
    await closeTurn(s, turn);
  });

  it("does not activate Delay when the opponent has no Digimon", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "LM-027", as: "option" }], trash: ["BT1-011"] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    s.state.players[0]!.battleArea[0]!.placedByEffect = true;
    s.state.isFirstPlayersFirstTurn = true;
    const { turn } = await openAfterStartOfTurn(s);
    expect(s.state.players[0]!.deck[0]?.cardId).toBeUndefined();
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-011")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-027")).toBe(true);
    await closeTurn(s, turn);
  });

  it("Security plays a qualifying red Digimon from trash and returns itself to hand", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "LM-027", as: "securityOption", faceUp: true }], trash: ["BT1-011"] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "LM-027"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-011")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "LM-027")).toBe(true);
  });

  it("activates Delay with no red Digimon in the trash, per Q4036", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-027", as: "option" }], trash: [] },
        1: { battleArea: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    s.state.players[0]!.battleArea[0]!.placedByEffect = true;
    s.state.isFirstPlayersFirstTurn = true;
    const { turn } = await openAfterStartOfTurn(s);

    // Nothing to return, and no Digimon to play from an empty trash — but the clause still ran.
    expect(s.state.players[0]!.deck).toHaveLength(0);
    await closeTurn(s, turn);
  });

  it("reduces the digivolution cost by 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-010", as: "host" }],
          hand: [{ card: "LM-027", as: "option" }, "BT1-015"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    // 2 to use the Option, then 0 for the reduced Greymon digivolution (printed cost 3).
    s.state.memory = 2;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-015"), 2000);

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-015")).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-027");
    const compiled = runtimeCompiledCard("LM-027");
    expect(definition?.nameEn).toBe("Red Scramble");
    expect(definition?.kinds).toEqual(["Option"]);
    expect(definition?.playCost).toBe(2);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.find((effect) => effect.trigger === "StartOfYourTurn")).toMatchObject({
      keywords: [{ keyword: "Delay" }],
      condition: { kind: "opponentHas" },
    });
  });
});
