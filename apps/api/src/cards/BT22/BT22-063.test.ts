import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT22-063.js";
import { itFollowsTamerDigivolutionRulings } from "./tamerDigivolution.testSupport.js";

describe("BT22-063 Alphamon", () => {
  it("has Reboot and Blocker and reduces one opposing Digimon on all three timings", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, colors: ["Black"], cost: 4, isAlternate: false },
      { level: 5, colors: ["Yellow"], cost: 4, isAlternate: false },
      { level: 5, traits: ["CS"], cost: 3, isAlternate: true },
      {
        names: ["Kyoko Kuremi"],
        cost: 5,
        whileCondition: {
          kind: "zoneCount",
          seat: "mine",
          zone: "security",
          op: "lte",
          value: 3,
          raw: "while you have 3 or fewer security cards",
        },
        isAlternate: true,
      },
    ]);
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        { trigger: "Static", actions: [], keywords: [{ keyword: "Reboot", raw: "＜Reboot＞" }] },
        { trigger: "Static", actions: [], keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
      ]),
    );

    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "ModifyDP",
            amount: -5000,
            duration: "forTheTurn",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          },
        ],
      });
    }
  });

  it("unsuspends every time it suspends, while gating only the DP boost", () => {
    const allTurns = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(allTurns).toMatchObject({ frequency: "OncePerTurn" });
    expect(allTurns?.actions).toMatchObject([
      {
        kind: "SubTrigger",
        event: "whenSuspended",
        sourceFilter: { isSelfRef: true },
        actions: [
          {
            kind: "ModifyDP",
            amount: 3000,
            duration: "untilOpponentTurnEnd",
            condition: {
              kind: "orConditions",
              conditions: [
                {
                  kind: "selfDigivolutionStackHasTrait",
                  filter: { nameOrTrait: [{ tokens: ["Kyoko Kuremi"], match: "name" }] },
                },
                { kind: "stackHasSameLevelCards", count: 2 },
              ],
            },
          },
          { kind: "Unsuspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
        ],
      },
    ]);
  });

  it("limits the Kyoko Kuremi alternate digivolution to three security cards", () => {
    const requirement = compiled.digivolutionRequirement?.find((entry) => entry.names?.includes("Kyoko Kuremi"));
    expect(requirement).toMatchObject({
      cost: 5,
      isAlternate: true,
      whileCondition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3 },
    });
  });

  it("exposes the same three-security Kyoko gate to shared legality consumers", () => {
    expect(
      digivolutionRequirementsFor("BT22-063")?.find((entry) => entry.names?.includes("Kyoko Kuremi")),
    ).toMatchObject({
      cost: 5,
      whileCondition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3 },
    });
  });

  it("unsuspends after attacking even when neither DP-boost condition is true", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT22-063", as: "alphamon" }] }, 1: { security: ["BT1-009"] } },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("alphamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("alphamon").isSuspended === false);

    expect(s.perm("alphamon").isSuspended).toBe(false);
  });
});

const LEVEL_4 = "BT1-014";
const LEVEL_5 = "BT1-020";
const LEVEL_6 = "BT1-080";

async function alphamonAfterAttacking(under: string[]) {
  const s = setupEngine(
    { 0: { battleArea: [{ card: "BT22-063", as: "alphamon", under }] }, 1: { security: ["BT1-009"] } },
    { autoSelectCards: true },
  );
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("alphamon").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await advance(s.engine).finishAttack();
  return s.perm("alphamon");
}

describe("BT22-063 Alphamon — KB Q&A rulings", () => {
  itFollowsTamerDigivolutionRulings(
    { digimon: "BT22-063", tamer: "BT22-101", securityTamer: "BT22-083" },
    {
      noAttackTheTurnTheTamerEntered: "Q4920",
      digivolvesAsTamer: "Q6683",
      bonusDraw: "Q6684",
      tamerIsDigivolutionCard: "Q6685",
      noSecurityEffect: "Q6686",
    },
  );

  it("gains the inherited effect of a Tamer in its digivolution cards (Q6687)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT22-063", as: "withTakuya", under: ["BT12-088", "BT22-101"] },
          { card: "BT22-063", as: "withoutTakuya", under: ["BT22-101"] },
        ],
      },
    });
    await s.ready();

    expect(s.perm("withTakuya").currentDP).toBe(14000);
    expect(s.perm("withoutTakuya").currentDP).toBe(12000);
  });

  it.each([
    { stack: "a level 6 digivolution card", under: [LEVEL_6], dp: 15000 },
    { stack: "2 level 5 digivolution cards", under: [LEVEL_5, LEVEL_5], dp: 15000 },
    { stack: "only different-level cards", under: [LEVEL_4, LEVEL_5], dp: 12000 },
  ])("counts every stacked card, including itself, for 2 same-level cards: $stack (Q4921)", async ({ under, dp }) => {
    const alphamon = await alphamonAfterAttacking(under);

    expect(alphamon.currentDP).toBe(dp);
    expect(alphamon.isSuspended).toBe(false);
  });

  it("still unsuspends after suspending when neither DP condition is met (Q4922)", async () => {
    const alphamon = await alphamonAfterAttacking([LEVEL_4, LEVEL_5]);

    expect(alphamon.currentDP).toBe(12000);
    expect(alphamon.isSuspended).toBe(false);
  });

  it("lets DigiLab's <Delay> place Alphamon under the Kyoko Kuremi it digivolved from and gain 2 memory (Q5774)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-225", as: "digiLab" },
            { card: "BT22-063", as: "alphamon", under: [{ card: "BT22-101", as: "kyoko" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const alphamonCardId = s.perm("alphamon").topCard.instanceId;
    const delay = observe(s.engine)
      .activatableEffects(s.perm("digiLab"))
      .find((entry) => /Delay/i.test(entry.description ?? ""));
    expect(delay).toBeDefined();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("digiLab").topCard.instanceId,
        effectKey: delay!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 5);

    expect(s.perm("alphamon").topCard.instanceId).toBe(s.inst("kyoko").instanceId);
    expect(s.perm("alphamon").stack.map((card) => card.instanceId)).toEqual([alphamonCardId]);
    expect(s.state.memory).toBe(5);
  });
});
