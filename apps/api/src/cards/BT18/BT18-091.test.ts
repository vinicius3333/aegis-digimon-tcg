import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-091.js";
import "../index.js";

describe("BT18-091 J.P. Shibayama", () => {
  it("covers the paid Hybrid draw and inherited attack-target-switch watcher", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[1]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "Draw",
          amount: 1,
          cost: {
            kind: "trash",
            target: { filter: { nameOrTrait: [{ tokens: ["Hybrid", "Ten Warriors"], match: "trait" }] } },
          },
        },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttackTargetSwitched",
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["hand"],
              payCost: false,
              optional: true,
              target: { filter: { kind: ["Tamer"], hasInheritedEffects: true } },
            },
          ],
        },
      ],
    });
  });

  it("plays an inherited-effect Tamer after a natural Raid target switch", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-091", as: "jp" },
            { card: "BT18-013", as: "raidOne" },
            { card: "BT18-013", as: "raidTwo" },
          ],
          hand: [
            { card: "BT18-063", as: "beetlemon" },
            { card: "BT18-094", as: "tamerOne" },
            { card: "BT18-094", as: "tamerTwo" },
          ],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "defenderOne", dp: 1000 },
            { card: "BT1-009", as: "defenderTwo", dp: 900 },
          ],
          security: [],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const defenderOneId = s.perm("defenderOne").permanentId;
    const defenderTwoId = s.perm("defenderTwo").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("jp").permanentId,
        instanceId: s.inst("beetlemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("jp").topCard?.cardId === "BT18-063");
    expect(s.perm("jp").stack.map(({ cardId }) => cardId)).toEqual(["BT18-091"]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("raidOne").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("tamerOne").instanceId),
    );

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("tamerOne").instanceId)).toBe(
      true,
    );
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === defenderOneId)).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("raidTwo").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.every((p) => p.permanentId !== defenderTwoId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tamerTwo").instanceId)).toBe(true);
  });

  it("does not play the Tamer when a natural Raid redirect is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-091", as: "jp" },
            { card: "BT18-013", as: "raid" },
          ],
          hand: [
            { card: "BT18-063", as: "beetlemon" },
            { card: "BT18-094", as: "tamer" },
          ],
          deck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "defender", dp: 1000 }], security: ["BT1-001"] },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("jp").permanentId,
        instanceId: s.inst("beetlemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("jp").topCard?.cardId === "BT18-063");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("raid").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("raid").permanentId && p.isSuspended),
    );

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tamer").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("tamer").instanceId)).toBe(
      false,
    );
    // Raid redirects the attack to the opposing Digimon, so no security check occurs.
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("plays from Security without cost through a real opponent attack and security check", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT18-091", as: "jp" }] },
      1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
    });
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("jp").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("jp").instanceId)).toBe(
      true,
    );
  });
});
