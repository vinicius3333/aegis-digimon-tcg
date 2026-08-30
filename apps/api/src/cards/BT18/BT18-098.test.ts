import { describe, expect, it } from "vitest";
import { compiled } from "./BT18-098.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT18-098 Dragon's Roar", () => {
  it("covers the effect-driven security trash trigger and color waiver", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnDiscardSecurity",
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 6000 } } },
        },
        {
          kind: "GainKeyword",
          keyword: { keyword: "Recovery", amount: 1 },
          condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "eq", value: 0 },
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          condition: {
            kind: "youHave",
            filter: { colors: ["Yellow"], nameOrTrait: [{ tokens: ["Data", "Witchelny"], match: "trait" }] },
          },
        },
      ],
    });
  });

  it("requires the top-security trash before the Main then-clause (Q3050)", () => {
    expect(compiled.effects[2]).toMatchObject({
      trigger: "Main",
      actions: [
        {
          kind: "ModifyDP",
          amount: -6000,
          duration: "untilOpponentTurnEnd",
          cost: { kind: "trash", target: { filter: { controller: "mine", zone: "security", position: "top" } } },
        },
        {
          kind: "SecurityManipulation",
          op: "addBottom",
          source: "this",
          condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 2 },
        },
      ],
    });
  });

  it("executes Main through the GameEngine: trashes security, reduces DP, then returns this Option to security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT18-036"],
          hand: [{ card: "BT18-098", as: "option" }],
          security: ["BT1-110", "BT1-111", "BT1-112"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 12000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 3 && s.perm("target").currentDP === 6000);

    expect(s.perm("target").currentDP).toBe(6000);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.security.at(-1)?.instanceId).toBe(s.inst("option").instanceId);
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("option").instanceId),
    ).toBe(false);
  });

  it("naturally fires the security-trash trigger from Main, then applies the Main DP reduction", async () => {
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT18-036"],
          hand: [{ card: "BT18-098", as: "mainOption" }],
          security: [{ card: "BT18-098", as: "triggeredOption" }, "BT1-110"],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "triggerTarget", dp: 5000 },
            // The Main -6000 must leave this Digimon above the Security effect's
            // 6000-DP ceiling, so the two naturally resolving target choices do
            // not become ambiguous after the security card is trashed.
            { card: "BT1-009", as: "survivor", dp: 12500 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredInstanceIds },
    );
    preferredInstanceIds.push(s.perm("survivor").topCard!.instanceId);
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mainOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("survivor").currentDP === 6500);

    expect(
      s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("triggerTarget").instanceId),
    ).toBe(false);
    expect(s.perm("survivor").currentDP).toBe(6500);
    expect(s.state.players[0]!.security.at(-1)?.instanceId).toBe(s.inst("mainOption").instanceId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("triggeredOption").instanceId)).toBe(
      true,
    );
  });

  it("naturally resolves Security by deleting the attacking Digimon and recovering from an empty stack", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT18-098", as: "option" }], deck: [{ card: "BT1-001", as: "recovery" }] },
        1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovery").instanceId));

    expect(
      s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("attacker").instanceId),
    ).toBe(false);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovery").instanceId)).toBe(true);
  });
});
