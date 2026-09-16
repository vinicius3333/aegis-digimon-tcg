import { compiledEffects, digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-063.js";

const UNDEAD_LV5 = "BT2-075";
const UNDEAD_X_LV5 = "BT10-080";
const CS_LV5 = "BT23-067";
const GHOST_LV5 = "BT4-085";
const DARK_ANIMAL_LV5 = "BT4-083";
const DARK_ANIMAL_LV4 = "BT4-082";
const DARK_ANIMAL_LV6 = "BT9-079";
const DRACMON = "BT23-062";
const PURPLE_LV4 = "BT4-080";
const PURPLE_LV3 = "BT2-067";
const CS_LV3_OFF_COLOUR = "BT23-048";
const PLAIN_LV3 = "BT1-009";

function purpleDeck() {
  return ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"];
}

describe("BT23-063 Sangloupmon", () => {
  it("declares the official catalog identity and the [CS] alternate route", () => {
    expect(getCardDefinition("BT23-063")).toMatchObject({
      cardId: "BT23-063",
      nameEn: "Sangloupmon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Purple", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Dark Animal", "CS"],
      effectText:
        "[Digivolve] Lv.3 w/[CS] trait: Cost 2 \n\n[When Attacking] This Digimon may digivolve into a Digimon card with the [Undead] or [CS] trait in the trash.",
      inheritedEffectText:
        "[When Attacking] [Once Per Turn] 1 of your Digimon may digivolve into a Digimon card with the [Undead] or [Dark Animal] trait in the trash.",
    });
    expect(digivolutionRequirementsFor("BT23-063")).toEqual([{ level: 3, traits: ["CS"], cost: 2, isAlternate: true }]);
    expect(registeredCompiledCards.get("BT23-063")).toEqual(compiled);
    expect(compiledEffects["BT23-063"]).toEqual(compiled);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("models both printed clauses as optional trash digivolutions", () => {
    const printed = compiled.effects.find(
      (effect) => effect.trigger === "WhenAttacking" && effect.isInherited !== true,
    );
    expect(printed).toMatchObject({
      actions: [
        {
          kind: "Digivolve",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          into: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Undead", "CS"], match: "trait" }] },
          from: ["trash"],
          payCost: true,
          optional: true,
        },
      ],
    });
    expect(printed?.frequency).toBeUndefined();

    const inherited = compiled.effects.find((effect) => effect.trigger === "WhenAttacking" && effect.isInherited);
    expect(inherited).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Digivolve",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          into: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Undead", "Dark Animal"], match: "trait" }] },
          from: ["trash"],
          payCost: true,
          optional: true,
        },
      ],
    });
  });

  it("publicly evolves from a purple level 3 for 2 and draws the evolution bonus", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: PURPLE_LV3, as: "base" }],
        hand: [{ card: "BT23-063", as: "sangloupmon" }],
        deck: [{ card: "BT1-046", as: "bonus" }, "BT1-047"],
      },
    });
    s.state.memory = 2;
    const baseId = s.inst("base").instanceId;
    const sangloupmonId = s.inst("sangloupmon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: sangloupmonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === sangloupmonId);
    await settle();

    expect(s.perm("base").topCard.instanceId).toBe(sangloupmonId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("bonus").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("takes the [CS] alternate from an off-colour level 3 for 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: CS_LV3_OFF_COLOUR, as: "base" }],
        hand: [{ card: "BT23-063", as: "sangloupmon" }],
        deck: [{ card: "BT1-046", as: "bonus" }, "BT1-047"],
      },
    });
    s.state.memory = 2;
    const baseId = s.inst("base").instanceId;
    const sangloupmonId = s.inst("sangloupmon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: sangloupmonId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === sangloupmonId);
    await settle();

    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("bonus").instanceId]);
  });

  it("refuses the alternate route from a level 3 without the [CS] trait", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: PLAIN_LV3, as: "base" }],
        hand: [{ card: "BT23-063", as: "sangloupmon" }],
        deck: ["BT1-046", "BT1-047"],
      },
    });
    s.state.memory = 2;
    const baseId = s.inst("base").instanceId;
    const sangloupmonId = s.inst("sangloupmon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: sangloupmonId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: sangloupmonId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("base").topCard.instanceId).toBe(baseId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([sangloupmonId]);
    expect(s.state.memory).toBe(2);
  });

  it.each([
    ["the [Undead] branch", UNDEAD_LV5, 2],
    ["the [CS] branch", CS_LV5, 3],
  ])("digivolves itself out of the trash on %s while attacking, paying its cost", async (_label, trashCard, cost) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-063", as: "sangloupmon" }],
          trash: [{ card: trashCard, as: "target" }],
          hand: ["BT1-009"],
          deck: purpleDeck(),
          security: ["BT1-011"],
        },
        1: { deck: purpleDeck(), security: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 6;
    await s.ready();
    const sangloupmonId = s.inst("sangloupmon").instanceId;
    const targetId = s.inst("target").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sangloupmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle();

    expect(s.perm("sangloupmon").topCard.instanceId).toBe(targetId);
    expect(s.perm("sangloupmon").stack.map((card) => card.instanceId)).toEqual([sangloupmonId]);
    expect(s.state.memory).toBe(6 - cost);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("offers nothing when the trash holds neither an [Undead] nor a [CS] Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-063", as: "sangloupmon" }],
          trash: [{ card: GHOST_LV5, as: "ghost" }],
          hand: ["BT1-009"],
          deck: purpleDeck(),
          security: ["BT1-011"],
        },
        1: { deck: purpleDeck(), security: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const sangloupmonId = s.inst("sangloupmon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sangloupmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle();

    expect(s.perm("sangloupmon").topCard.instanceId).toBe(sangloupmonId);
    expect(s.perm("sangloupmon").stack).toHaveLength(0);
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("ghost").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("leaves the trash card alone when the controller declines the printed effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-063", as: "sangloupmon" }],
          trash: [{ card: UNDEAD_LV5, as: "target" }],
          hand: ["BT1-009"],
          deck: purpleDeck(),
          security: ["BT1-011"],
        },
        1: { deck: purpleDeck(), security: ["BT1-011", "BT1-012"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const sangloupmonId = s.inst("sangloupmon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sangloupmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle();

    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(true);
    expect(s.perm("sangloupmon").topCard.instanceId).toBe(sangloupmonId);
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("target").instanceId]);
  });

  it("Q5332 does not activate its own inherited effect after the printed one digivolves it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-063", as: "sangloupmon" }],
          trash: [
            { card: UNDEAD_LV5, as: "printedTarget" },
            { card: DARK_ANIMAL_LV6, as: "inheritedTarget" },
          ],
          hand: ["BT1-009"],
          deck: purpleDeck(),
          security: ["BT1-011"],
        },
        1: { deck: purpleDeck(), security: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 9;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sangloupmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle();

    expect(s.perm("sangloupmon").topCard.instanceId).toBe(s.inst("printedTarget").instanceId);
    expect(s.perm("sangloupmon").stack.map((card) => card.cardId)).toEqual(["BT23-063"]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("inheritedTarget").instanceId]);
    expect(s.state.memory).toBe(7);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q5333 does not activate its inherited effect after BT23-062 digivolves it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-063", as: "sangloupmon", under: [{ card: DRACMON, as: "dracmon" }] }],
          trash: [
            { card: DARK_ANIMAL_LV5, as: "dracmonTarget" },
            { card: DARK_ANIMAL_LV6, as: "inheritedTarget" },
          ],
          hand: ["BT1-009"],
          deck: purpleDeck(),
          security: ["BT1-011"],
        },
        1: { deck: purpleDeck(), security: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sangloupmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle();

    expect(s.perm("sangloupmon").topCard.instanceId).toBe(s.inst("dracmonTarget").instanceId);
    expect(s.perm("sangloupmon").stack.map((card) => card.cardId)).toEqual([DRACMON, "BT23-063"]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("inheritedTarget").instanceId]);
    expect(s.state.memory).toBe(7);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([
    ["an [Undead] card", UNDEAD_X_LV5, PURPLE_LV4, 3],
    ["a [Dark Animal] card", DARK_ANIMAL_LV4, PURPLE_LV3, 2],
  ])("inherited: digivolves another of your Digimon into %s from the trash", async (_label, trashCard, base, cost) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: UNDEAD_LV5, as: "attacker", under: [{ card: "BT23-063", as: "sangloupmon" }] },
            { card: base, as: "other" },
          ],
          trash: [{ card: trashCard, as: "target" }],
          hand: ["BT1-009"],
          deck: purpleDeck(),
          security: ["BT1-011"],
        },
        1: { deck: purpleDeck(), security: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const otherBaseId = s.inst("other").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle();

    expect(s.perm("other").topCard.instanceId).toBe(s.inst("target").instanceId);
    expect(s.perm("other").stack.map((card) => card.instanceId)).toEqual([otherBaseId]);
    expect(s.perm("attacker").topCard.cardId).toBe(UNDEAD_LV5);
    expect(s.perm("attacker").stack.map((card) => card.cardId)).toEqual(["BT23-063"]);
    expect(s.state.memory).toBe(6 - cost);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("inherited: offers nothing for a trash card with neither the [Undead] nor the [Dark Animal] trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: UNDEAD_LV5, as: "attacker", under: [{ card: "BT23-063", as: "sangloupmon" }] },
            { card: PURPLE_LV4, as: "other" },
          ],
          trash: [{ card: GHOST_LV5, as: "ghost" }],
          hand: ["BT1-009"],
          deck: purpleDeck(),
          security: ["BT1-011"],
        },
        1: { deck: purpleDeck(), security: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const otherId = s.inst("other").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle();

    expect(s.perm("other").topCard.instanceId).toBe(otherId);
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("ghost").instanceId]);
  });

  it("inherited: never reaches a Digimon in the breeding area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: UNDEAD_LV5, as: "attacker", under: [{ card: "BT23-063", as: "sangloupmon" }] }],
          breeding: { card: PURPLE_LV3, as: "hatched" },
          trash: [{ card: DARK_ANIMAL_LV4, as: "target" }],
          hand: ["BT1-009"],
          deck: purpleDeck(),
          security: ["BT1-011"],
        },
        1: { deck: purpleDeck(), security: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const hatchedId = s.inst("hatched").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle();

    expect(s.perm("hatched").topCard.instanceId).toBe(hatchedId);
    expect(s.perm("hatched").stack).toHaveLength(0);
    expect(s.perm("hatched").inBreeding).toBe(true);
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("target").instanceId]);
  });

  it("inherited: refuses a second use in the same turn and works again on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: UNDEAD_LV5, as: "attacker", under: [{ card: "BT23-063", as: "sangloupmon" }] },
            { card: PURPLE_LV3, as: "first" },
            { card: PURPLE_LV3, as: "second" },
          ],
          trash: [
            { card: DARK_ANIMAL_LV4, as: "firstTarget" },
            { card: DARK_ANIMAL_LV4, as: "secondTarget" },
          ],
          hand: ["BT1-009"],
          deck: purpleDeck(),
          security: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { hand: ["BT1-009"], deck: purpleDeck(), security: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    await s.ready();
    const untouchedLv3 = () =>
      s.state.players[0]!.battleArea.filter(
        (permanent) => permanent.stack.length === 0 && permanent.topCard.cardId === PURPLE_LV3,
      ).length;
    expect(untouchedLv3()).toBe(2);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle();
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(untouchedLv3()).toBe(1);
    expect(s.state.memory).toBe(8);

    await advance(s.engine).verb.unsuspend([s.perm("attacker").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle();

    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(untouchedLv3()).toBe(1);
    expect(s.state.memory).toBe(8);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    await s.ready();
    expect(s.perm("attacker").isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle();

    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(untouchedLv3()).toBe(0);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("inherited: does not fire while Sangloupmon is the top card of the attacking stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-063", as: "sangloupmon" },
            { card: PURPLE_LV3, as: "other" },
          ],
          trash: [{ card: DARK_ANIMAL_LV4, as: "target" }],
          hand: ["BT1-009"],
          deck: purpleDeck(),
          security: ["BT1-011"],
        },
        1: { deck: purpleDeck(), security: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const otherId = s.inst("other").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sangloupmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle();

    expect(s.perm("other").topCard.instanceId).toBe(otherId);
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("target").instanceId]);
  });

  it("does not fire on the opponent's attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-063", as: "sangloupmon" }],
          trash: [{ card: UNDEAD_LV5, as: "target" }],
          hand: ["BT1-009"],
          deck: purpleDeck(),
          security: ["BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: PURPLE_LV3, as: "attacker" }],
          hand: ["BT1-009"],
          deck: purpleDeck(),
          security: ["BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const sangloupmonId = s.inst("sangloupmon").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle();

    expect(s.perm("sangloupmon").topCard.instanceId).toBe(sangloupmonId);
    expect(s.perm("sangloupmon").stack).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("target").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
