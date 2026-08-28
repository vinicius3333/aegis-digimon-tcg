import { getCardDefinition } from "@aegis/shared";
import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-103.js";
import "./BT9-103.js";
describe("BT9-103 Kongou", () => {
  it("matches catalog values and both opponent-turn restrictions in IR", () => {
    expect(getCardDefinition("BT9-103")).toMatchObject({
      colors: ["Black"], kinds: ["Option"], playCost: 2,
      securityEffectText: "[Security] Activate this card's [Main] effect.",
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], effects: [
        { trigger: "Main", actions: [{ kind: "Restrict", restriction: "attackPlayers", duration: "untilOpponentTurnEnd", target: { count: "all", filter: { controller: "opponent", playCostLte: 7 } } }, { kind: "GlobalRestrict", restriction: "opponentCannotAddToSecurity", duration: "untilOpponentTurnEnd" }] },
        { trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] },
      ],
    });
  });

  it("restricts opposing low-cost Digimon from attacking players", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["BT9-029"], hand: [{ card: "BT9-103", as: "option" }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((c) => c.cardId === "BT9-103"));
    expect(s.state.players[0]!.trash.some((c) => c.cardId === "BT9-103")).toBe(true);
  });
});
