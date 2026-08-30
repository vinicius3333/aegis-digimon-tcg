import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-088.js";

describe("BT18-088 Takuya Kanbara & Koji Minamoto", () => {
  it("covers security, turn setup, main-phase placement, rule names, and inherited attack", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toMatchObject([
      { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] },
      { trigger: "StartOfYourTurn", actions: [{ kind: "SetMemory", value: 3 }] },
      {
        trigger: "StartOfYourMainPhase",
        actions: [
          { kind: "PlaceUnder", target: { count: 1, upTo: true, from: ["trash"] }, underFilter: { isSelfRef: true } },
        ],
      },
      {
        trigger: "Rule",
        actions: [{ kind: "GrantStatic", grant: "name", tokens: ["Takuya Kanbara", "Koji Minamoto"] }],
      },
      {
        trigger: "EndOfYourTurn",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "Attack",
            attackPlayer: true,
            condition: {
              kind: "selfHasTrait",
              filter: { nameOrTrait: [{ tokens: ["Hybrid", "Ten Warriors"], match: "trait" }] },
            },
          },
        ],
      },
    ]);
  });

  it("raises placement capacity by two for each other Tamer", () => {
    expect(compiled.effects[2]).toMatchObject({
      actions: [{ kind: "PlaceUnder", target: { countModifier: { amount: 2, scaling: { unit: "cards", per: 1 } } } }],
    });
  });

  it("naturally places three distinct Hybrid cards under itself at the start of main", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-088", as: "takuyaKoji" },
            { card: "BT14-086", as: "otherTamer" },
          ],
          trash: ["BT18-011", "BT18-012", "BT18-014"],
          hand: [{ card: "BT1-010" }],
        },
        1: { deck: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 5;
    await s.ready();
    await advance(s.engine).runTurn(0);

    expect(s.perm("takuyaKoji").stack.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT18-011", "BT18-012", "BT18-014"]),
    );
    expect(s.perm("takuyaKoji").stack).toHaveLength(3);
  });

  it("naturally plays from security when an opponent's attack reveals it", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT18-088", as: "takuyaKoji", faceUp: true }] },
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
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("takuyaKoji").instanceId),
    );

    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("takuyaKoji").instanceId),
    ).toBe(true);
  });

  it("naturally attacks a player at end of turn from a Hybrid host", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-011", as: "host", under: ["BT18-088"] }] },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 5;
    await s.ready();
    await advance(s.engine).runTurn(0);

    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("does not grant the inherited end-of-turn attack to a non-Hybrid host", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-060", as: "host", under: ["BT18-088"] }] },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 5;
    await s.ready();
    await advance(s.engine).runTurn(0);

    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
