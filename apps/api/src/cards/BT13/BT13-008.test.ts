import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { definitionOf } from "../../engine/cards/cardData.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT13-008.js";
import "../BT3/BT3-101.js";
import "../BT6/BT6-025.js";
import "../BT12/BT12-092.js";
import "./BT13-095.js";
import "../BT15/BT15-047.js";
import "../BT18/BT18-059.js";
import "../BT21/BT21-096.js";

describe("BT13-008 Agumon", () => {
  it("keeps the bracketed Marcus Damon reference exact and honors name rules", () => {
    const action = compiled.effects[0]?.actions[0];
    expect(action?.kind).toBe("SelectBind");
    if (action?.kind !== "SelectBind") throw new Error("Expected SelectBind action");
    const reference = action.target.filter.nameOrTrait?.[0];
    if (reference === undefined) throw new Error("Expected Marcus Damon name reference");

    expect(reference).toEqual({ tokens: ["Marcus Damon"], match: "nameExact" });
    expect(matchNameOrTrait(definitionOf("BT12-092"), reference)).toBe(true);
    expect(matchNameOrTrait(definitionOf("AD1-021"), reference)).toBe(true);
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

const OPPONENT_SECURITY = ["BT1-010", "BT1-010", "BT1-010"];

async function activateAgumonOnMarcus(s: EngineSetup): Promise<void> {
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
}

function attackPlayer(s: EngineSetup, alias: string) {
  return s.engine.applyIntent(0, {
    type: "attack",
    attackerPermanentId: s.perm(alias).permanentId,
    target: { kind: "player" },
  });
}

function isInTrash(s: EngineSetup, seat: 0 | 1, instanceId: string): boolean {
  return s.state.players[seat]!.trash.some((card) => card.instanceId === instanceId);
}

function isOnBattleArea(s: EngineSetup, seat: 0 | 1, permanentId: string): boolean {
  return s.state.players[seat]!.battleArea.some((permanent) => permanent.permanentId === permanentId);
}

async function memoryGainedByPanjyamonInheritedWithZenimon(attacker: "marcus" | "greymon"): Promise<number> {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT13-008", as: "agumon" },
          { card: "BT12-092", as: "marcus", under: attacker === "marcus" ? ["BT6-025"] : [] },
          { card: "BT1-015", as: "greymon", under: attacker === "greymon" ? ["BT6-025"] : [] },
        ],
      },
      1: { battleArea: [{ card: "BT18-059", as: "zenimon" }], security: [...OPPONENT_SECURITY] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  await activateAgumonOnMarcus(s);
  const memoryBeforeAttack = s.state.memory;
  expect(attackPlayer(s, attacker)).toEqual({ ok: true });
  await advance(s.engine).finishAttack();
  return s.state.memory - memoryBeforeAttack;
}

describe("BT13-008 Agumon — KB Q&A rulings", () => {
  it("lets Marcus attack and use inherited effects as a Digimon, but not on the turn it was played (Q2266)", async () => {
    const established = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-008", as: "agumon" },
            { card: "BT12-092", as: "marcus", under: ["BT6-025"] },
          ],
        },
        1: { security: [...OPPONENT_SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await established.ready();

    expect(attackPlayer(established, "marcus").ok).toBe(false);

    await activateAgumonOnMarcus(established);
    const memoryBeforeAttack = established.state.memory;
    expect(attackPlayer(established, "marcus")).toEqual({ ok: true });
    await settle(() => established.state.memory === memoryBeforeAttack + 1);
    await advance(established.engine).finishAttack();

    expect(established.perm("marcus").isSuspended).toBe(true);
    expect(established.state.memory).toBe(memoryBeforeAttack + 1);

    const playedThisTurn = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-008", as: "agumon" },
            { card: "BT12-092", as: "marcus", enteredThisTurn: true },
          ],
        },
        1: { security: [...OPPONENT_SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await playedThisTurn.ready();
    await activateAgumonOnMarcus(playedThisTurn);

    expect(attackPlayer(playedThisTurn, "marcus").ok).toBe(false);
    expect(playedThisTurn.perm("marcus").isSuspended).toBe(false);
  });

  it("keeps Marcus a Tamer while it is also a Digimon, so its attack triggers the red-or-yellow Tamer inherited effect (Q2267)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-008", as: "agumon" },
            { card: "BT1-015", as: "host", under: ["BT13-008"] },
            { card: "BT12-092", as: "marcus" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-012", as: "biyomon" }],
          security: [...OPPONENT_SECURITY],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await activateAgumonOnMarcus(s);

    expect(attackPlayer(s, "host")).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    expect(isOnBattleArea(s, 1, s.perm("biyomon").permanentId)).toBe(true);

    expect(attackPlayer(s, "marcus")).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    await settle();

    expect(isInTrash(s, 1, s.inst("biyomon").instanceId)).toBe(true);
  });

  it.fails("resolves Marcus's effects as both Digimon and Tamer effects, so a Digimon immune to opponent Digimon effects ignores them (Q5981)", async () => {
    async function kabuterimonDPAfterMarcusSuspends(marcusIsAlsoDigimon: boolean): Promise<number> {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT13-008", as: "agumon" },
              { card: "BT13-095", as: "marcus" },
            ],
          },
          1: {
            battleArea: [{ card: "BT15-047", as: "kabuterimon", suspended: true }],
            security: [...OPPONENT_SECURITY],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      if (marcusIsAlsoDigimon) {
        await activateAgumonOnMarcus(s);
        if (!attackPlayer(s, "marcus").ok) throw new Error("Marcus could not attack as a Digimon");
        await advance(s.engine).finishAttack();
      } else {
        await advance(s.engine).verb.suspend([s.perm("marcus").permanentId]);
        await settle();
      }
      expect(s.perm("marcus").isSuspended).toBe(true);
      return s.perm("kabuterimon").currentDP;
    }

    expect(await memoryGainedByPanjyamonInheritedWithZenimon("marcus")).toBe(1);
    expect(await kabuterimonDPAfterMarcusSuspends(false)).toBe(2000);
    expect(await kabuterimonDPAfterMarcusSuspends(true)).toBe(5000);
  });

  it.fails("deletes Marcus by the rule check when an effect reduces its DP to 0 (Q5982)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-008", as: "agumon" },
            { card: "BT12-092", as: "marcus" },
            { card: "BT1-087", as: "otherTamer" },
          ],
        },
        1: { security: [{ card: "BT3-101", as: "bifrost" }, ...OPPONENT_SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    await s.ready();
    await activateAgumonOnMarcus(s);
    preferInstanceIds.push(s.perm("marcus").topCard.instanceId);
    const marcusInstanceId = s.perm("marcus").topCard.instanceId;

    expect(attackPlayer(s, "marcus")).toEqual({ ok: true });
    await settle(() => isInTrash(s, 1, s.inst("bifrost").instanceId));
    await advance(s.engine).finishAttack();

    expect(s.perm("agumon").currentDP).toBe(2000);
    expect(isInTrash(s, 0, marcusInstanceId)).toBe(true);
    expect(s.perm("otherTamer").currentDP).toBe(0);
    expect(isOnBattleArea(s, 0, s.perm("otherTamer").permanentId)).toBe(true);
  });

  it("takes the newer treat-as-Digimon effect's DP and keeps an added <Rush> (Q5983)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-008", as: "agumon" },
            { card: "BT12-092", as: "marcus" },
          ],
          hand: [{ card: "BT21-096", as: "championOption" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    await activateAgumonOnMarcus(s);
    expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Rush")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("championOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("marcus"), "Rush"));

    expect(s.perm("marcus").currentDP).toBe(12000);
    expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Rush")).toBe(true);

    // Reverse order: the Option applies first, then Agumon's 3000 DP effect is the newer one.
    const reversed = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-008", as: "agumon" },
            { card: "BT12-092", as: "marcus" },
          ],
          hand: [{ card: "BT21-096", as: "championOption" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await reversed.ready();
    reversed.state.memory = 5;
    expect(
      reversed.engine.applyIntent(0, { type: "playCard", instanceId: reversed.inst("championOption").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => reversed.perm("marcus").currentDP === 12000);
    await settle();
    await activateAgumonOnMarcus(reversed);

    expect(reversed.perm("marcus").currentDP).toBe(3000);
    expect(observe(reversed.engine).hasKeyword(reversed.perm("marcus"), "Rush")).toBe(true);
  });

  it("gains memory from Marcus's effect while the opponent allows only Tamer-effect memory gains (Q5984)", async () => {
    expect(await memoryGainedByPanjyamonInheritedWithZenimon("marcus")).toBe(1);
    expect(await memoryGainedByPanjyamonInheritedWithZenimon("greymon")).toBe(0);
  });

  it.fails("does not let Marcus's effect, used while it is also a Digimon, affect an opponent Digimon immune to Digimon effects (Q5985)", async () => {
    async function kabuterimonDPAfterDigimonMarcusSuspends(kabuterimonSuspended: boolean): Promise<number> {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT13-008", as: "agumon" },
              { card: "BT13-095", as: "marcus" },
            ],
          },
          1: { battleArea: [{ card: "BT15-047", as: "kabuterimon", suspended: kabuterimonSuspended }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      await activateAgumonOnMarcus(s);
      const kabuterimonView = observe(s.engine);
      expect(kabuterimonView.isRestrictedByEffect(s.perm("kabuterimon"), "beAffected", "Digimon")).toBe(
        kabuterimonSuspended,
      );
      expect(kabuterimonView.isRestrictedByEffect(s.perm("kabuterimon"), "beAffected", "Tamer")).toBe(false);
      await advance(s.engine).verb.suspend([s.perm("marcus").permanentId]);
      await settle();
      expect(s.perm("marcus").isSuspended).toBe(true);
      return s.perm("kabuterimon").currentDP;
    }

    expect(await kabuterimonDPAfterDigimonMarcusSuspends(false)).toBe(2000);
    expect(await kabuterimonDPAfterDigimonMarcusSuspends(true)).toBe(5000);
  });
});
