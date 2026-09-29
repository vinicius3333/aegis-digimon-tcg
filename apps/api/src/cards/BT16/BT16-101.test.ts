import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-101.js";
import "../index.js";
import { X_ANTIBODY_NAME_PROBES, xAntibodyNameGateVerdicts } from "../../engine/testkit/xAntibodyNameGate.js";

describe("BT16-101", () => {
  it("matches the immutable catalog contract and alternate Rapidmon evolution", () => {
    expect(getCardDefinition("BT16-101")).toMatchObject({
      cardId: "BT16-101",
      nameEn: "Rapidmon (X Antibody)",
      colors: ["Yellow", "Green"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [
        { color: "Yellow", level: 5, memoryCost: 3 },
        { color: "Green", level: 5, memoryCost: 3 },
      ],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Holy Warrior", "X Antibody"],
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ names: ["Rapidmon"], cost: 4, isAlternate: true }],
    });
  });

  it("models Armor Purge", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Armor Purge" }] });
  });

  it("suspends all opposing Digimon and may attack on digivolution", () => {
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({ kind: "Suspend", target: { count: "all" } });
    expect(compiled.effects?.[1]?.actions?.[1]).toMatchObject({
      kind: "Attack",
      optional: true,
      withoutSuspending: false,
    });
  });

  it("gives suspended opposing Digimon -4000 DP with the Rapidmon/X Antibody condition and gains memory on deletion", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        { kind: "Aura", effect: { kind: "modifyDP", amount: -4000 }, while: { kind: "selfDigivolutionStackHasTrait" } },
      ],
    });
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          actions: [
            {
              kind: "GainMemory",
              amount: 2,
              condition: {
                kind: "anyOf",
                conditions: [
                  { kind: "triggerRemovalCause", removalCause: "byBattle" },
                  { kind: "triggerDeletedByDpZero" },
                ],
              },
            },
          ],
        },
      ],
    });
  });

  it("naturally evolves from Rapidmon, suspends every opposing Digimon, and reduces them by 4000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT8-039", as: "rapidmon" }],
          hand: [{ card: "BT16-101", as: "rapidmonX" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "alreadySuspended", dp: 5000, suspended: true },
            { card: "BT1-009", as: "otherDigimon", dp: 5000 },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("rapidmon").permanentId,
        instanceId: s.inst("rapidmonX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("rapidmon").topCard?.cardId === "BT16-101");

    expect(s.perm("rapidmon").stack.some((card) => card.cardId === "BT8-039")).toBe(true);
    expect(s.perm("alreadySuspended").isSuspended).toBe(true);
    expect(s.perm("otherDigimon").isSuspended).toBe(true);
    expect(s.perm("alreadySuspended").currentDP).toBe(1000);
    expect(s.perm("otherDigimon").currentDP).toBe(1000);
  });

  it("does not reduce suspended Digimon when played without Rapidmon or X Antibody in its stack", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT16-101", as: "rapidmonX" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 5000, suspended: true }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 20;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rapidmonX").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("rapidmonX").topCard?.cardId === "BT16-101");

    expect(s.perm("rapidmonX").stack).toHaveLength(0);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.perm("target").currentDP).toBe(5000);
  });

  it("gains 2 memory exactly once after two natural battle deletions of opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-101", as: "rapidmon", suspended: true }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstAttacker", dp: 1000 },
            { card: "BT1-009", as: "secondAttacker", dp: 1000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("firstAttacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("rapidmon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("firstAttacker").instanceId),
    );
    expect(s.state.memory).toBe(2);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("rapidmon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("secondAttacker").instanceId),
    );
    expect(s.state.memory).toBe(2);
  });

  it("gains 2 memory when a natural attack causes an opponent's Digimon to reach 0 DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-101", as: "rapidmon", under: ["BT8-039"] }], security: ["BT1-001"] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 4000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("attacker").instanceId));

    expect(s.state.memory).toBe(-2);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("does not gain memory when an opposing Digimon is deleted by an effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT16-101", as: "rapidmon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("target").permanentId], "byEffect");

    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
  });
});

describe("BT16-101 [X Antibody] reference", () => {
  it("matches the X Antibody card name and its Rule aliases, not X Antibody-trait Digimon", () => {
    expect(xAntibodyNameGateVerdicts("BT16-101")).toEqual(X_ANTIBODY_NAME_PROBES);
  });
});

describe("BT16-101 Rapidmon (X Antibody) — KB Q&A rulings", () => {
  it("can't attack again with its [When Digivolving] effect when it digivolves during an attack (Q2698)", async () => {
    function setupDigivolveBoard() {
      const attackerSuspendedAtRapidmonTriggers: boolean[] = [];
      const board = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT1-057", as: "attacker", under: ["ST18-10", "BT9-109"] }],
            hand: [{ card: "BT16-101", as: "rapidmonX" }],
            deck: ["BT1-009", "BT1-009", "BT1-009"],
          },
          1: {
            battleArea: [
              { card: "BT2-037", as: "attackTarget", suspended: true },
              { card: "BT2-037", as: "bystander" },
            ],
            security: ["BT1-009", "BT1-009", "BT1-009"],
          },
        },
        {
          autoAcceptOptional: true,
          autoSelectCards: true,
          preferTriggerKeys: ["ST18-10"],
          onEvent: (event) => {
            if (event.kind === "effectTriggered" && event.sourceCardId === "BT16-101") {
              attackerSuspendedAtRapidmonTriggers.push(board.perm("attacker").isSuspended);
            }
          },
        },
      );
      return Object.assign(board, { attackerSuspendedAtRapidmonTriggers });
    }
    const forcedAttackTargetPrompts = (s: ReturnType<typeof setupDigivolveBoard>) =>
      s.decisions.filter(({ req }) => req.promptText === "Choose the attack target for the forced attack.");

    const duringAttack = setupDigivolveBoard();
    duringAttack.state.memory = 10;
    await duringAttack.ready();
    expect(
      duringAttack.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: duringAttack.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: duringAttack.perm("attackTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      duringAttack.state.players[1]!.trash.some(
        (card) => card.instanceId === duringAttack.inst("attackTarget").instanceId,
      ),
    );
    await settle();

    expect(duringAttack.perm("attacker").topCard?.cardId).toBe("BT16-101");
    // ST18-10 unsuspends the attacker before the X Antibody digivolve, so only the
    // attack in progress can stop the [When Digivolving] attack, not a suspended attacker.
    expect(duringAttack.attackerSuspendedAtRapidmonTriggers[0]).toBe(false);
    expect(duringAttack.perm("attacker").isSuspended).toBe(false);
    expect(duringAttack.perm("bystander").isSuspended).toBe(true);
    expect(duringAttack.state.players[1]!.security).toHaveLength(3);
    expect(forcedAttackTargetPrompts(duringAttack)).toHaveLength(0);

    const outsideAttack = setupDigivolveBoard();
    outsideAttack.state.memory = 10;
    await outsideAttack.ready();
    expect(
      outsideAttack.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: outsideAttack.perm("attacker").permanentId,
        instanceId: outsideAttack.inst("rapidmonX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    await settle();

    expect(outsideAttack.perm("attacker").topCard?.cardId).toBe("BT16-101");
    expect(forcedAttackTargetPrompts(outsideAttack)).toHaveLength(1);
    expect(outsideAttack.state.players[1]!.security).toHaveLength(2);
  });

  it("deletes a 4000 DP attacker by rule check before its [When Attacking] effect activates (Q5452)", async () => {
    async function attackIntoRapidmon(rapidmonSources: string[]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT16-101", as: "rapidmonX", under: rapidmonSources }],
            security: ["BT1-009", "BT1-009"],
          },
          1: {
            battleArea: [{ card: "P-041", as: "guilmon", dp: 4000 }],
            deck: ["BT1-009", "BT1-009", "BT1-009"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = 1;
      s.state.memory = 3;
      await s.ready();
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("guilmon").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.trash.length > 0 || s.state.players[1]!.hand.length > 0);
      await settle();
      return s;
    }

    const withXAntibody = await attackIntoRapidmon(["BT9-109"]);
    expect(withXAntibody.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["P-041"]);
    expect(withXAntibody.state.players[1]!.hand).toHaveLength(0);
    expect(withXAntibody.state.players[1]!.deck).toHaveLength(3);
    expect(withXAntibody.state.players[0]!.security).toHaveLength(2);

    const withoutXAntibody = await attackIntoRapidmon([]);
    expect(withoutXAntibody.perm("guilmon").currentDP).toBe(4000);
    expect(withoutXAntibody.state.players[1]!.hand).toHaveLength(1);
  });
});
