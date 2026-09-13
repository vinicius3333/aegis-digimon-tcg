import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-008.js";
import "./BT11-017.js";

describe("BT11-008 Bearmon", () => {
  it("matches the catalog and carries the complete inherited contract", () => {
    expect(getCardDefinition("BT11-008")).toMatchObject({
      cardId: "BT11-008",
      nameEn: "Bearmon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [{ color: "Red", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Beast"],
      inheritedEffectText:
        "[Your Turn][Once Per Turn] When this Digimon's attack target is switched, this Digimon gets +3000 DP for the turn.",
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "YourTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenAttackTargetSwitched",
              actions: [
                {
                  kind: "ModifyDP",
                  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                  amount: 3000,
                  duration: "forTheTurn",
                  condition: { kind: "triggerAttackerIsSelf" },
                },
              ],
            },
          ],
          isInherited: true,
          frequency: "OncePerTurn",
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("gains +3000 before battle when Blocker switches its target (Q2053)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-064", as: "host", under: ["BT11-008"], dp: 2000 }] },
      1: {
        battleArea: [{ card: "ST18-07", as: "blocker", dp: 4000 }],
        security: ["BT1-009"],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("host").currentDP).toBe(5000);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("adds +3000 only on the first public Raid switch, then resets next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT11-017",
              as: "marsmon",
              under: ["BT11-008", "BT1-016", "BT1-020"],
            },
            { card: "BT1-013", as: "spare" },
          ],
          deck: ["BT1-013", "BT1-013", "BT1-013", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "victim6000", dp: 6000 },
            { card: "BT1-013", as: "victim5000", dp: 5000 },
            { card: "BT1-013", as: "victim4000", dp: 4000 },
          ],
          deck: ["BT1-013", "BT1-013", "BT1-013", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const marsmonId = s.perm("marsmon").permanentId;
    const victim6000Id = s.perm("victim6000").permanentId;
    const victim5000Id = s.perm("victim5000").permanentId;
    const victim4000Id = s.perm("victim4000").permanentId;
    const victim6000InstanceId = s.inst("victim6000").instanceId;
    const victim5000InstanceId = s.inst("victim5000").instanceId;
    const victim4000InstanceId = s.inst("victim4000").instanceId;

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("marsmon").topCard.cardId).toBe("BT11-017");
    expect(s.perm("marsmon").stack.map((card) => card.cardId)).toEqual(["BT11-008", "BT1-016", "BT1-020"]);
    expect(s.perm("marsmon").currentDP).toBe(12000);

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: marsmonId, target: { kind: "player" } }),
    ).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === victim6000Id));
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("marsmon").currentDP).toBe(15000);
    expect(s.perm("marsmon").isSuspended).toBe(false);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([victim6000InstanceId]);

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: marsmonId, target: { kind: "player" } }),
    ).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === victim5000Id));
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("marsmon").currentDP).toBe(15000);
    expect(s.perm("marsmon").isSuspended).toBe(true);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      victim6000InstanceId,
      victim5000InstanceId,
    ]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("marsmon").currentDP).toBe(12000);
    expect(s.perm("marsmon").isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: marsmonId, target: { kind: "player" } }),
    ).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === victim4000Id));
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("marsmon").currentDP).toBe(15000);
    expect(s.perm("marsmon").isSuspended).toBe(false);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      victim6000InstanceId,
      victim5000InstanceId,
      victim4000InstanceId,
    ]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });

  it("does not trigger when another Digimon's attack target is switched", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-064", as: "host", under: ["BT11-008"] },
          { card: "BT1-064", as: "other" },
        ],
      },
    });
    const before = s.perm("host").currentDP;

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("other").permanentId,
    });

    expect(s.perm("host").currentDP).toBe(before);
  });

  it("keeps its [Once Per Turn] budget when another Digimon's target is switched first", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-064", as: "other", dp: 20_000 },
          { card: "BT1-064", as: "host", under: ["BT11-008"], dp: 20_000 },
        ],
      },
      1: {
        battleArea: [
          { card: "ST18-07", as: "firstBlocker", dp: 4000 },
          { card: "ST18-07", as: "secondBlocker", dp: 4000 },
        ],
        security: ["BT1-009"],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("other").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("firstBlocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.perm("host").currentDP).toBe(20_000);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "blockWindowOpened").length === 2);
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("secondBlocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("host").currentDP).toBe(23_000);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("does not trigger on the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-064", as: "host", under: ["BT11-008"] }] },
    });
    const before = s.perm("host").currentDP;
    s.state.turnSeat = 1;

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("host").permanentId,
    });

    expect(s.perm("host").currentDP).toBe(before);
  });
});
