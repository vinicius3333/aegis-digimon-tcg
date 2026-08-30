import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-024.js";
import "../index.js";

describe("BT16-024", () => {
  it("searches security and optionally digivolves into an Angel", () => {
    for (const effect of compiled.effects.slice(0, 2)) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "Search",
        searchZone: "security",
        purpose: "digivolveAmongRevealed",
        count: "all",
        to: "revealed",
      });
      expect(effect.actions?.[1]).toMatchObject({
        kind: "Digivolve",
        reduceCost: 2,
        from: ["security"],
        amongPreviousSearch: true,
        optional: true,
      });
    }
  });

  it("can place an Angel from hand into security and grants inherited Blocker", () => {
    expect(compiled.effects?.[0]?.actions?.[3]).toMatchObject({
      kind: "SecurityManipulation",
      op: "placeAsSecurity",
      from: ["hand"],
      toTop: false,
      optional: true,
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "OpponentsTurn",
      isInherited: true,
      actions: [{ kind: "GainKeyword", keyword: { keyword: "Blocker" }, duration: "forTheTurn" }],
    });
  });

  it("grants Blocker to your Angel-family Digimon during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-009", "BT1-010"],
        battleArea: [
          { card: "BT1-009", as: "source", under: ["BT16-024"] },
          { card: "BT16-019", as: "angel" },
          { card: "BT1-009", as: "other" },
        ],
      },
      1: { deck: ["BT1-009", "BT1-010"] },
    });
    await s.ready();
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);

    const continuous = (s.engine as unknown as { continuous: { hasKeyword: (id: string, keyword: string) => boolean } })
      .continuous;
    expect(continuous.hasKeyword(s.perm("source").permanentId, "Blocker")).toBe(false);
    expect(continuous.hasKeyword(s.perm("angel").permanentId, "Blocker")).toBe(true);
    expect(continuous.hasKeyword(s.perm("other").permanentId, "Blocker")).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("naturally searches the whole security stack, digivolves for the reduced cost, and shuffles the remainder", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-024", as: "magna" }],
          security: [
            { card: "BT2-040", as: "ophanimon" },
            { card: "BT1-001", as: "other" },
          ],
          deck: ["BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("magna").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("magna").topCard?.cardId === "BT2-040");

    expect(s.perm("magna").topCard?.cardId).toBe("BT2-040");
    expect(s.perm("magna").stack.map(({ cardId }) => cardId)).toEqual(["BT16-024"]);
    expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-001"]);
    expect(s.state.memory).toBe(3);
  });
});
