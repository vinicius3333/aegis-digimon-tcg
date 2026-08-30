import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT18-099.js";

describe("BT18-099 Fist of Athena", () => {
  it("covers the Knightmon color waiver, opponent attack grant, and battle-area placement", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          condition: { kind: "youHave", filter: { nameOrTrait: [{ tokens: ["Knightmon"], match: "text" }] } },
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "Main",
      actions: [
        {
          kind: "GrantAuraToOpponents",
          duration: "untilOpponentTurnEnd",
          effectText: "[Start of Your Main Phase] This Digimon attacks.",
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
  });

  it("implements the errata duration and Q3051 Delay trigger", () => {
    expect(compiled.effects[2]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttackTargetSwitched",
          actions: [{ kind: "GainKeyword", keyword: { keyword: "Delay" } }],
        },
      ],
    });
    expect(compiled.effects[3]).toMatchObject({
      trigger: "Main",
      keywords: [{ keyword: "Delay" }],
      actions: [
        {
          kind: "GainKeyword",
          requiresDelayArmed: true,
          target: { bindAs: "delayTarget" },
          keyword: { keyword: "Piercing" },
        },
        {
          kind: "GainKeyword",
          target: { fromSelectionRef: "delayTarget" },
          keyword: { keyword: "SecurityAttack", amount: 1 },
        },
      ],
    });
    expect(compiled.effects[4]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          optional: true,
          target: {
            filter: {
              levelComparison: { op: "lte", value: 5 },
              nameOrTrait: [{ tokens: ["Knightmon"], match: "text" }],
            },
          },
        },
        { kind: "PlaceInBattleAreaSelf", optional: true },
      ],
    });
  });

  it("naturally places itself from Main", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT2-052", "BT2-067"], hand: [{ card: "BT18-099", as: "option" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 12000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    const optionInstanceId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    // During Option resolution the card is intentionally held in the transient
    // resolving slot, so lookup by alias is unavailable until placement finishes.
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === optionInstanceId));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === optionInstanceId)).toBe(true);
  });

  it("arms Delay after a natural target switch and applies both delayed keywords to one Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-004", as: "raid" }], security: ["BT1-001"] },
        1: {
          battleArea: [
            { card: "BT18-099", as: "option" },
            { card: "BT1-009", as: "defender" },
          ],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.perm("defender").baseDP = 15000;
    s.perm("defender").currentDP = 15000;
    s.perm("option").placedByEffect = true;
    await s.ready();

    expect(observe(s.engine).activatableEffects(s.perm("option"))).toEqual([]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("raid").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    s.state.turnSeat = 1;
    await settle(() => observe(s.engine).activatableEffects(s.perm("option")).length > 0);

    const delay = observe(s.engine).activatableEffects(s.perm("option"))[0] as { effectKey: string } | undefined;
    expect(delay?.effectKey).toBeDefined();
    const optionInstanceId = s.perm("option").topCard!.instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "activateEffect",
        sourceInstanceId: optionInstanceId,
        effectKey: delay!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.every((perm) => perm.topCard?.instanceId !== optionInstanceId));

    expect(observe(s.engine).hasPierce(s.perm("defender"))).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("defender"), "SecurityAttack")).toBe(1);
  });

  it("naturally resolves Security by playing a level-5-or-lower Knightmon-text Digimon and placing itself", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT18-099", as: "option" }],
          trash: [{ card: "BT18-062", as: "knightmonText" }],
        },
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
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("option").instanceId),
    );

    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("knightmonText").instanceId),
    ).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("option").instanceId),
    ).toBe(true);
  });
});
