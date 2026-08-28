import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT15-061.js";

describe("BT15-061", () => {
  it("has Blocker and may trash a Machine/Cyborg to protect one of your Digimon from deletion", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Blocker" }] });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "Restrict",
          restriction: "beDeleted",
          byOpponentEffectsOnly: true,
          cost: { kind: "trash" },
          optional: true,
        },
      ],
    });
  });
  it("restricts attacks when the opponent has no Digimon and unsuspends as inherited", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "YourTurn",
      actions: [{ kind: "Aura", effect: { restriction: "attack" }, while: { kind: "opponentHasNone" } }],
    });
    expect(compiled.effects?.[4]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      actions: [],
      keywords: [{ keyword: "Reboot" }],
    });
  });

  it("passes the inherited Reboot through a legal level 3-to-4-to-5 stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT15-055", as: "stack" }],
        hand: [{ card: "BT15-061", as: "guardromon" }, { card: "BT15-062", as: "gigadramon" }],
        deck: ["BT15-066", "BT15-066", "BT15-066", "BT15-066"],
      },
      1: { deck: ["BT15-055"] },
    }, { autoDeclineOptional: true, autoSelectCards: true });
    await s.ready();
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("stack").permanentId,
      instanceId: s.inst("guardromon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("stack").topCard?.cardId === "BT15-061");
    expect(s.perm("stack").topCard?.cardId).toBe("BT15-061");
    expect(s.perm("stack").stack.map((card) => card.cardId)).toEqual(["BT15-055"]);

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("stack").permanentId,
      instanceId: s.inst("gigadramon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("stack").topCard?.cardId === "BT15-062");
    expect(s.perm("stack").topCard?.cardId).toBe("BT15-062");
    expect(s.perm("stack").stack.map((card) => card.cardId)).toEqual(["BT15-055", "BT15-061"]);
    expect(observe(s.engine).hasKeyword(s.perm("stack"), "Reboot")).toBe(true);

    await advance(s.engine).verb.suspend([s.perm("stack").permanentId]);
    s.state.turnSeat = 1;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("stack").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });
});
