import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./BT17-011.js";

const TAKUYA = "BT12-088";
const TAKUYA_AND_KOJI = "BT18-088";
const BURNING_GREYMON = "BT17-012";
const ANCIENT_GREYMON = "BT17-017";
const RED_TAMER = "BT1-085";
const BLUE_TAMER = "BT1-086";
const INERT_RED_LV3 = "BT1-009";

describe("BT17-011 Agunimon", () => {
  it("matches the catalog and carries the printed contract", () => {
    expect(getCardDefinition("BT17-011")).toMatchObject({
      cardId: "BT17-011",
      nameEn: "Agunimon",
      colors: ["Red", "Purple"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 6,
      dp: 5000,
      forms: ["Hybrid"],
      inheritedEffectText: "[Your Turn] This Digimon gets +2000 DP.",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Takuya Kanbara"], cost: 2, isAlternate: true, baseIsTamer: true },
      { namesExact: ["BurningGreymon"], cost: 1, isAlternate: true },
    ]);
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      actions: [
        {
          kind: "Digivolve",
          asLevel: 3,
          from: ["hand"],
          payCost: true,
          target: { filter: { controller: "mine", kind: ["Tamer"], colors: ["Red"] }, count: 1 },
          onto: { filter: { controller: "mine", kind: ["Tamer"], colors: ["Red"] }, count: 1 },
        },
      ],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          costOverride: 3,
          ignoreRequirements: true,
          optional: true,
          into: { nameOrTrait: [{ tokens: ["AncientGreymon"], match: "name" }] },
          condition: {
            kind: "anyOf",
            conditions: [
              { kind: "selfDigivolutionStackHasTrait" },
              { kind: "youHave", filter: { kind: ["Digimon", "Tamer"], colors: ["Blue", "Green"] } },
            ],
          },
        },
        { kind: "DelayedDelete", condition: { kind: "ifThisEffectDigivolved" } },
      ],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }],
    });
  });

  // Printed "[Digivolve][Takuya Kanbara]: Cost 2" / "[Digivolve][BurningGreymon]: Cost 1" carry no
  // "in name", so both routes are exact-name gates (coordinator decision, cardData.ts 482-488).
  it("gates both printed alternate routes on the exact name", () => {
    expect(matchingAlternateDigivolutionRequirement("BT17-011", TAKUYA)).toMatchObject({
      cost: 2,
      baseIsTamer: true,
    });
    expect(matchingAlternateDigivolutionRequirement("BT17-011", BURNING_GREYMON)).toMatchObject({ cost: 1 });
    // A generic red Tamer is not the named base: it only reaches the Static "onto a red Tamer as
    // a level-3 red Digimon" route at cost 3, not Takuya's cheaper cost-2 named route.
    expect(matchingAlternateDigivolutionRequirement("BT17-011", RED_TAMER)).toMatchObject({ cost: 3 });
    // A non-red Tamer has no route at all.
    expect(matchingAlternateDigivolutionRequirement("BT17-011", BLUE_TAMER)).toBeUndefined();
  });

  // No true near-name negative exists: the only card whose printed name substring-contains
  // "Takuya Kanbara" but is not it is BT18-088 "Takuya Kanbara & Koji Minamoto", which is an
  // official effectiveNames alias (shared effectiveNames.ts, same pattern as AD1-020
  // "Tommy, Takuya, & Zoe"). namesExact accepts it through that alias, which is the intended
  // "also treated as [Takuya Kanbara]" behavior, so the exact route legitimately accepts it and
  // there is no substring-only card left to refuse. "BurningGreymon" has no substring-container.
  it("accepts an official Takuya Kanbara alias on the exact route", () => {
    expect(matchingAlternateDigivolutionRequirement("BT17-011", TAKUYA_AND_KOJI)).toMatchObject({
      cost: 2,
      baseIsTamer: true,
    });
  });

  it("digivolves from Takuya Kanbara for cost 2, keeps the Tamer as a digivolution card and draws the bonus (Q2725, Q2727)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: TAKUYA, as: "takuya" }],
        hand: [{ card: "BT17-011", as: "agunimon" }],
        deck: [INERT_RED_LV3, "BT1-012"],
      },
    });
    s.state.memory = 10;
    const takuyaInstanceId = s.perm("takuya").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takuya").permanentId,
        instanceId: s.inst("agunimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard?.cardId === "BT17-011");

    expect(s.state.memory).toBe(8);
    expect(s.perm("takuya").stack.map(({ instanceId }) => instanceId)).toEqual([takuyaInstanceId]);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("uses the level-3 red catalog cost when the red Tamer is not a printed route", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: RED_TAMER, as: "tai" }],
        hand: [{ card: "BT17-011", as: "agunimon" }],
        deck: [INERT_RED_LV3],
      },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tai").permanentId,
        instanceId: s.inst("agunimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tai").topCard?.cardId === "BT17-011");

    expect(s.state.memory).toBe(7);
  });

  it("refuses a non-red Tamer as the digivolution source", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: BLUE_TAMER, as: "matt" }],
        hand: [{ card: "BT17-011", as: "agunimon" }],
        deck: [INERT_RED_LV3],
      },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("matt").permanentId,
        instanceId: s.inst("agunimon").instanceId,
      }).ok,
    ).toBe(false);
    expect(s.perm("matt").topCard?.cardId).toBe(BLUE_TAMER);
    expect(s.state.memory).toBe(10);
  });

  it("digivolves into AncientGreymon for 3 off the BurningGreymon stack and deletes it at end of turn (Q2728 baseline)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: BURNING_GREYMON, as: "burning" }],
          hand: [
            { card: "BT17-011", as: "agunimon" },
            { card: ANCIENT_GREYMON, as: "ancient" },
            { card: INERT_RED_LV3, as: "spare" },
          ],
          deck: [INERT_RED_LV3, "BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    const stackId = s.perm("burning").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: stackId,
        instanceId: s.inst("agunimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.permanentId === stackId && p.topCard?.cardId === ANCIENT_GREYMON),
    );

    // 10 - 1 (BurningGreymon route) - 3 (cost override) = 6.
    expect(s.state.memory).toBe(6);
    const stack = s.state.players[0]!.battleArea.find((p) => p.permanentId === stackId)!;
    expect(stack.stack.map(({ cardId }) => cardId)).toEqual([BURNING_GREYMON, "BT17-011"]);

    await advance(s.engine).runTurn(0);
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === stackId)).toBe(false);
  });

  it("satisfies the condition through a blue Tamer with no BurningGreymon in the stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: TAKUYA, as: "takuya" },
            { card: BLUE_TAMER, as: "matt" },
          ],
          hand: [
            { card: "BT17-011", as: "agunimon" },
            { card: ANCIENT_GREYMON, as: "ancient" },
            { card: INERT_RED_LV3, as: "spare" },
          ],
          deck: [INERT_RED_LV3, "BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    const stackId = s.perm("takuya").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: stackId,
        instanceId: s.inst("agunimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.permanentId === stackId && p.topCard?.cardId === ANCIENT_GREYMON),
    );

    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).not.toContain(ANCIENT_GREYMON);
  });

  it("does not offer the digivolve when neither branch of the condition holds", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TAKUYA, as: "takuya" }],
          hand: [
            { card: "BT17-011", as: "agunimon" },
            { card: ANCIENT_GREYMON, as: "ancient" },
            { card: INERT_RED_LV3, as: "spare" },
          ],
          deck: [INERT_RED_LV3, "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    const stackId = s.perm("takuya").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: stackId,
        instanceId: s.inst("agunimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard?.cardId === "BT17-011");

    expect(s.perm("takuya").topCard?.cardId).toBe("BT17-011");
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain(ANCIENT_GREYMON);
  });

  it("survives the turn when the optional digivolve is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: BURNING_GREYMON, as: "burning" }],
          hand: [
            { card: "BT17-011", as: "agunimon" },
            { card: ANCIENT_GREYMON, as: "ancient" },
            { card: INERT_RED_LV3, as: "spare" },
          ],
          deck: [INERT_RED_LV3, "BT1-012", "BT1-013"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    const stackId = s.perm("burning").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: stackId,
        instanceId: s.inst("agunimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("burning").topCard?.cardId === "BT17-011");

    expect(s.state.memory).toBe(9);
    await advance(s.engine).runTurn(0);
    // No digivolve by this effect, so the delayed delete must not fire.
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === stackId)).toBe(true);
  });

  it("grants its inherited +2000 DP only on its controller's turn (Q6555 shape)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-014", under: ["BT17-011"], as: "carrier" }] },
    });

    s.state.turnSeat = 0;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("carrier").currentDP).toBe(6000);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("carrier").currentDP).toBe(4000);
  });
});
