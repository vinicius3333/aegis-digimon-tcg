import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { definitionOf } from "../../engine/cards/cardData.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT13-008.js";
import "../BT12/BT12-092.js";

describe("BT13-008 Agumon", () => {
  it("keeps the bracketed Marcus Damon reference exact", () => {
    const action = compiled.effects[0]?.actions[0];
    expect(action?.kind).toBe("SelectBind");
    if (action?.kind !== "SelectBind") throw new Error("Expected SelectBind action");
    const reference = action.target.filter.nameOrTrait?.[0];
    if (reference === undefined) throw new Error("Expected Marcus Damon name reference");

    expect(reference).toEqual({ tokens: ["Marcus Damon"], match: "nameExact" });
    expect(matchNameOrTrait(definitionOf("BT12-092"), reference)).toBe(true);
    expect(matchNameOrTrait(definitionOf("AD1-021"), reference)).toBe(false);
  });

  it("binds the chosen Marcus Damon once for the entire three-action bundle", () => {
    const actions = compiled.effects[0]?.actions;
    expect(actions?.[0]).toMatchObject({ target: { bindAs: "chosenMarcus" } });
    expect(actions?.[1]).toMatchObject({ target: { fromSelectionRef: "chosenMarcus" } });
    expect(actions?.[2]).toMatchObject({ target: { fromSelectionRef: "chosenMarcus" } });
    expect(actions?.[3]).toMatchObject({ target: { fromSelectionRef: "chosenMarcus" } });
  });

  it("digivolves from Koromon for 0 memory through its alternate requirement", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT11-005", as: "koromon" }, hand: [{ card: "BT13-008", as: "agumon" }] },
    });
    s.state.memory = 3;
    await s.ready();

    const evolutionMaterialId1 = s.perm("koromon").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("koromon").permanentId,
        instanceId: s.inst("agumon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("koromon").stack.some((card) => card.instanceId === evolutionMaterialId1));
    expect(s.perm("koromon").stack.map((card) => card.instanceId)).toContain(evolutionMaterialId1);
    await settle(() => s.perm("koromon").topCard.cardId === "BT13-008");
    expect(s.state.memory).toBe(3);
  });

  it("makes one Marcus Damon a 3000 DP Digimon that cannot digivolve for the turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-008", as: "agumon" },
            { card: "BT12-092", as: "marcus" },
            { card: "BT12-092", as: "otherMarcus" },
          ],
          security: ["BT1-010"],
          hand: ["BT1-009"],
          deck: Array.from({ length: 8 }, () => "BT1-009"),
        },
        1: {
          security: [
            { card: "BT1-010", as: "firstSecurity" },
            { card: "BT1-010", as: "secondSecurity" },
          ],
          hand: ["BT1-009"],
          deck: Array.from({ length: 8 }, () => "BT1-009"),
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("marcus").topCard.instanceId);
    s.state.memory = 10;
    await s.ready();
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle();
    const [effect] = observe(s.engine).activatableEffects(s.perm("agumon"));

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("agumon").topCard.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("marcus").currentDP === 3000);
    await settle();

    expect(s.perm("marcus").currentDP).toBe(3000);
    expect(observe(s.engine).isRestricted(s.perm("marcus"), "digivolve")).toBe(true);
    expect(s.perm("otherMarcus").currentDP).not.toBe(3000);
    expect(observe(s.engine).isRestricted(s.perm("otherMarcus"), "digivolve")).toBe(false);
    expect(
      observe(s.engine)
        .activatableEffects(s.perm("agumon"))
        .some((entry) => entry.effectKey === effect!.effectKey),
    ).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("marcus").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1 && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("firstSecurity").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
    expect(s.perm("marcus").currentDP).not.toBe(3000);
    expect(observe(s.engine).isRestricted(s.perm("marcus"), "digivolve")).toBe(false);
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle();
    expect(s.perm("marcus").isSuspended).toBe(false);
    expect(
      observe(s.engine)
        .activatableEffects(s.perm("agumon"))
        .map((entry) => entry.effectKey),
    ).toContain(effect!.effectKey);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("agumon").topCard.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("marcus").currentDP === 3000);
    await settle();
    expect(observe(s.engine).isRestricted(s.perm("marcus"), "digivolve")).toBe(true);
    expect(s.perm("otherMarcus").currentDP).not.toBe(3000);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("marcus").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("secondSecurity").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
    expect(observe(s.engine).isRestricted(s.perm("marcus"), "digivolve")).toBe(false);
  });

  it("once per turn may delete only an opposing Digimon with 3000 DP or less when a red or yellow Tamer suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-015", as: "host", under: ["BT13-008"] },
            { card: "BT12-092", as: "marcus" },
            { card: "BT12-092", as: "otherMarcus" },
          ],
          hand: ["BT1-009"],
          deck: Array.from({ length: 8 }, () => "BT1-009"),
        },
        1: {
          battleArea: [
            { card: "BT1-012", as: "smallA" },
            { card: "BT1-012", as: "smallB" },
            { card: "BT1-015", as: "large" },
          ],
          security: ["BT1-010", "BT1-010", "BT1-010"],
          hand: ["BT1-009"],
          deck: Array.from({ length: 8 }, () => "BT1-010"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("marcus").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("large").permanentId),
    ).toBe(true);
    expect(s.state.players[1]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT1-012")).toHaveLength(
      1,
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("otherMarcus").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[1]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT1-012")).toHaveLength(
      1,
    );
    await settle(() => s.state.players[1]!.security.length === 1 && !observe(s.engine).isAttacking());
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle();
    expect(s.perm("marcus").currentDP).toBe(3000);
    expect(s.perm("marcus").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("marcus").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[1]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT1-012").length === 0,
    );
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("large").permanentId,
    ]);
    expect(s.state.players[1]!.trash.map((instance) => instance.instanceId)).toContain(s.inst("smallA").instanceId);
    expect(s.state.players[1]!.trash.map((instance) => instance.instanceId)).toContain(s.inst("smallB").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });

  it("does not delete when the inherited optional effect is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-015", as: "host", under: ["BT13-008"] },
            { card: "BT12-092", as: "marcus" },
          ],
        },
        1: { battleArea: [{ card: "BT1-012", as: "target" }] },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenSuspended", { subjectPermanentId: s.perm("marcus").permanentId });
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("does not trigger when a Tamer outside the red-or-yellow color boundary suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-015", as: "host", under: ["BT13-008"] },
            { card: "BT13-097", as: "blueTamer" },
          ],
        },
        1: { battleArea: [{ card: "BT1-012", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("blueTamer").permanentId]);
    await settle();

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(
      s.perm("target").permanentId,
    );
  });
});
