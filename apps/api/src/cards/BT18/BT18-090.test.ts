import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-090.js";

describe("BT18-090 Zoe Orimoto", () => {
  it("has complete runtime coverage for Security, Start Main, and inherited battle-delete clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.map((effect) => effect.trigger)).toEqual([
      "Security",
      "StartOfYourMainPhase",
      "WhenBattleDeleteOpponent",
    ]);
    expect(compiled.effects[2]).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          optional: true,
          target: { filter: { controller: "mine", kind: ["Tamer"], hasInheritedEffects: true } },
        },
      ],
    });
  });

  it("recognizes only Tamer candidates that actually carry inherited effects", () => {
    const action = compiled.effects[2]!.actions[0]!;
    if (action.kind !== "PlayWithoutCost") throw new Error("expected PlayWithoutCost");
    const filter = action.target!.filter;
    expect(getCardDefinition("BT18-088")?.inheritedEffectText).toBeTruthy();
    expect(getCardDefinition("BT18-092")?.inheritedEffectText).toBeFalsy();
    expect(filter.hasInheritedEffects).toBe(true);
  });

  it("naturally trashes a Hybrid card and draws at the start of main", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-090", as: "zoe" }],
          hand: [{ card: "BT18-011", as: "hybrid" }, { card: "BT1-010" }],
          deck: ["BT1-010"],
        },
        1: { deck: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("hybrid").instanceId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("hybrid").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-010")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("naturally plays from security when an opponent's attack reveals it", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT18-090", as: "zoe", faceUp: true }] },
      1: { battleArea: [{ card: "BT1-060", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("zoe").instanceId),
    );

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("zoe").instanceId)).toBe(
      true,
    );
  });

  it("naturally plays an inherited-effect Tamer after a battle deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-060", as: "host", under: ["BT18-090"] }],
          hand: [
            { card: "BT18-088", as: "inheritedTamer" },
            { card: "BT18-087", as: "plainTamer" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim", suspended: true, dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("inheritedTamer").instanceId),
    );

    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("inheritedTamer").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("plainTamer").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("allows the inherited Tamer play to be declined after battle deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-060", as: "host", under: ["BT18-090"] }],
          hand: [{ card: "BT18-088", as: "inheritedTamer" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim", suspended: true, dp: 3000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT1-009"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("inheritedTamer").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT18-088")).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
