import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-078.js";

describe("BT13-078 Phascomon", () => {
  it("draws 1 and then trashes 1 card on deletion", () => {
    const effect = compiled.effects?.find((entry) => entry.trigger === "OnDeletion");
    expect(effect?.actions).toEqual([
      { kind: "Draw", controller: "mine", amount: 1 },
      { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } },
    ]);
  });

  it("keeps the inherited end-of-opponent-turn effect once per turn", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "EndOfOpponentsTurn",
      frequency: "OncePerTurn",
      actions: [
        { kind: "Draw", controller: "mine", amount: 1 },
        { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } },
      ],
    });
  });

  it("draws before trashing when deleted", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-078", as: "phascomon" }], deck: ["BT1-002"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("phascomon").permanentId]);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-002");
  });

  it("draws before trashing for the inherited end-of-opponent-turn effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", under: ["BT13-078"], as: "host" }], deck: ["BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.EndOfOpponentsTurn, s.perm("host"));

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-002");
  });

  it("does not repeat the inherited draw-trash effect on a second same-turn timing", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", under: ["BT13-078"], as: "host" }], deck: ["BT1-002", "BT1-003"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.EndOfOpponentsTurn, s.perm("host"));
    await settle(() => s.state.players[0]!.trash.length === 1);
    await advance(s.engine).fire(EffectTiming.EndOfOpponentsTurn, s.perm("host"));
    await settle();

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-003"]);
  });
});
