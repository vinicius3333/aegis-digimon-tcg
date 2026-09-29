import { getCardDefinition } from "@aegis/shared";
import { describe, it, expect } from "vitest";
import { setupEngine, settle, type PermanentSpec } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-101.js";
import "./BT9-101.js";
describe("BT9-101 Ground Fang", () => {
  it("matches catalog values and independent suspended return and security IR", () => {
    expect(getCardDefinition("BT9-101")).toMatchObject({
      colors: ["Green"],
      kinds: ["Option"],
      playCost: 8,
      securityEffectText: "[Security] Activate this card's [Main] effect.",
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "Main",
          actions: [
            { kind: "Return", to: "deckBottom", target: { filter: { suspended: true, kind: ["Digimon"] } } },
            { kind: "Return", to: "deckBottom", target: { filter: { suspended: true, kind: ["Tamer"] } } },
          ],
        },
        { trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] },
      ],
    });
  });

  it("returns a suspended opposing Digimon to deck bottom", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT9-018"], hand: [{ card: "BT9-101", as: "option" }] },
        1: { battleArea: [{ card: "BT9-045", as: "target", suspended: true }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});

describe("BT9-101 Ground Fang — KB Q&A rulings", () => {
  async function playGroundFang(opponentBattleArea: PermanentSpec[]) {
    const s = setupEngine(
      {
        0: { battleArea: ["BT9-018"], hand: [{ card: "BT9-101", as: "option" }] },
        1: { battleArea: opponentBattleArea, deck: ["BT1-009", "BT1-009"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT9-101"));
    await settle(() => s.state.pendingDecision === undefined);
    return s;
  }

  it("still resolves the half it can when the opponent has only a suspended Digimon or only a suspended Tamer (Q1906)", async () => {
    const onlyTamer = await playGroundFang([
      { card: "BT1-085", as: "tamer", suspended: true },
      { card: "BT9-045", as: "unsuspendedDigimon" },
    ]);
    const tamerSide = onlyTamer.state.players[1]!;
    expect(tamerSide.battleArea.map((permanent) => permanent.topCard!.cardId)).toEqual(["BT9-045"]);
    expect(tamerSide.deck.at(-1)?.cardId).toBe("BT1-085");

    const onlyDigimon = await playGroundFang([{ card: "BT9-045", as: "suspendedDigimon", suspended: true }]);
    const digimonSide = onlyDigimon.state.players[1]!;
    expect(digimonSide.battleArea).toHaveLength(0);
    expect(digimonSide.deck.at(-1)?.cardId).toBe("BT9-045");
  });
});
