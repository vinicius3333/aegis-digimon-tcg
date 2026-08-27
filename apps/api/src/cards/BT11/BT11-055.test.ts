import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-055.js";

describe("BT11-055 MetalTyrannomon", () => {
  it("maps the dual-color mega and all three executable clauses", () => {
    expect(getCardDefinition("BT11-055")).toMatchObject({ cardId: "BT11-055", colors: ["Green", "Black"], level: 5, playCost: 8, dp: 8000 });
    expect(compiled.effects).toHaveLength(3);
    expect(compiled.effects[0]).toMatchObject({ trigger: "WhenDigivolving" });
    expect(compiled.effects[1]).toMatchObject({ trigger: "OnPlay" });
    expect(compiled.effects[2]).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn", isInherited: true });
  });

  it("Q2088: suspends per green/black Tamer but locks only one suspended Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT1-088", "BT1-089"],
          hand: [{ card: "BT11-055", as: "metalTyrannomon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-028", as: "alreadySuspended", suspended: true },
            { card: "BT1-029", as: "first" },
            { card: "BT1-030", as: "second" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metalTyrannomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("alreadySuspended"), "unsuspend"));

    expect(s.perm("first").isSuspended).toBe(true);
    expect(s.perm("second").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("alreadySuspended"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("first"), "unsuspend")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("second"), "unsuspend")).toBe(false);
  });

  it("inherited effect trashes only one top security card per turn after a battle deletion", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-018", as: "host", under: ["BT11-055"] }] },
      1: {
        security: [
          { card: "BT1-001", as: "top" },
          { card: "BT1-001", as: "next" },
        ],
      },
    });

    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", {
      attackerPermanentId: s.perm("host").permanentId,
    });
    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", {
      attackerPermanentId: s.perm("host").permanentId,
    });

    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("top").instanceId);
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("next").instanceId]);
  });
});
