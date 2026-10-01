import { describe, expect, it } from "vitest";
import {
  drainMicrotasks,
  findPermanent,
  setupEngine,
  settle,
  type CardSpec,
  type EngineSetup,
} from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-092.js";
import "./BT16-018.js";
import "./BT16-025.js";
import "./BT16-041.js";

describe("BT16-092", () => {
  it("plays ExVeemon or Stingmon and DNA digivolves in the main phase", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Main" });
    expect(compiled.effects?.[0]?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
    });
    expect(compiled.effects?.[0]?.actions?.[1]).toMatchObject({
      kind: "DnaDigivolve",
      payCost: true,
      optional: true,
      bindResultAs: "dnaDigivolvedByThisEffect",
    });
  });

  it("protects the DNA result from battle deletion and grants Blocker", () => {
    expect(compiled.effects?.[0]?.actions?.[2]).toMatchObject({
      kind: "Restrict",
      restriction: "beDeletedInBattle",
      duration: "untilOpponentTurnEnd",
    });
    expect(compiled.effects?.[0]?.actions?.[3]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Blocker" },
      duration: "untilOpponentTurnEnd",
      condition: { kind: "bindingExists" },
    });
  });

  it("plays Veemon or Wormmon from hand/trash and returns itself from security", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false, optional: true },
        { kind: "AddToHandSelf" },
      ],
    });
  });

  it("publicly plays an ExVeemon without requiring DNA digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-018", as: "color" },
            { card: "BT16-039", as: "green" },
          ],
          hand: [
            { card: "BT16-092", as: "option" },
            { card: "BT16-018", as: "exveemon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]?.battleArea.some((p) => p.topCard?.cardId === "BT16-018"));
    expect(s.state.players[0]?.battleArea.some((p) => p.topCard?.cardId === "BT16-018")).toBe(true);
    expect(s.state.players[0]?.hand.some((card) => card.cardId === "BT16-092")).toBe(false);
  });
});

describe("BT16-092 Invincible Dragon - Insect Fusion — KB Q&A rulings", () => {
  function paildramonFixture(hand: CardSpec[], declinePrompts: string[]): EngineSetup {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-018", as: "blueMaterial" },
            { card: "BT16-041", as: "greenMaterial" },
          ],
          hand: [{ card: "BT16-092", as: "option" }, ...hand],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: { security: ["BT1-009", "BT1-010"], deck: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declineDigiXros: true, declinePrompts },
    );
    s.state.memory = 10;
    return s;
  }

  async function playOption(s: EngineSetup): Promise<void> {
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT16-092"));
    await drainMicrotasks();
  }

  const offeredPrompt = (s: EngineSetup, prompt: string): boolean =>
    s.decisions.some(({ req }) => req.sourceCardId === "BT16-092" && req.promptText.includes(prompt));

  it("can play ExVeemon or Stingmon without DNA digivolving (Q2692)", async () => {
    const s = paildramonFixture(
      [
        { card: "BT16-018", as: "exveemonInHand" },
        { card: "BT16-025", as: "paildramon" },
      ],
      ["DNA digivolve"],
    );
    await playOption(s);

    expect(offeredPrompt(s, "DNA digivolve")).toBe(true);
    const board = s.state.players[0]!.battleArea;
    expect(board.map((permanent) => permanent.topCard?.cardId).sort()).toEqual(["BT16-018", "BT16-018", "BT16-041"]);
    expect(board.some((permanent) => permanent.topCard?.instanceId === s.inst("exveemonInHand").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("paildramon").instanceId]);
    expect(board.some((permanent) => observe(s.engine).hasKeyword(permanent, "Blocker"))).toBe(false);
  });

  it("can skip the play and DNA digivolve 2 Digimon already in the battle area (Q2693)", async () => {
    const s = paildramonFixture(
      [
        { card: "BT16-041", as: "stingmonInHand" },
        { card: "BT16-025", as: "paildramon" },
      ],
      ["Play without paying the cost"],
    );
    await playOption(s);

    expect(offeredPrompt(s, "Play without paying the cost")).toBe(true);
    const paildramon = findPermanent(s, 0, "BT16-025");
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(paildramon.stack.map((card) => card.cardId).sort()).toEqual(["BT16-018", "BT16-041"]);
    expect(observe(s.engine).hasKeyword(paildramon, "Blocker")).toBe(true);
    expect(observe(s.engine).isRestricted(paildramon, "beDeletedInBattle")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("stingmonInHand").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("BT16-025");
  });
});
