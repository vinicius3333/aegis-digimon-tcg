import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { compiled } from "./EX13-029.js";
import "../index.js";

const CARD_ID = "EX13-029";

// Fixtures.
//   BT18-030 Candlemon — YELLOW Lv.3 whose printed MAIN box names [Witchelny] although its TYPE
//     is [Flame]. It is the alternate header's source: the header reads the card's printed text,
//     so this card reaches EX13-029 for the header's 2 rather than the catalog EvoCost's 3. Its
//     own [On Play] never fires on a digivolution.
//     (BT19-029 Tapirmon names [Witchelny] only in its INHERITED box, and the engine's `texts`
//     predicate reads the main box, so it is NOT a header source — verified, not assumed.)
//   BT1-045 Tsukaimon — YELLOW Lv.3, NO printed text at all: the header NEGATIVE. It is still a
//     legal source through the catalog EvoCost, so the observable difference is the cost.
//   BT1-064 Goblimon — GREEN Lv.3, NO printed text: the illegal source. Neither the Yellow/Red
//     EvoCosts nor the header's Lv.3-with-[Witchelny]-text predicate admits it.
//   BT18-036 Wizardmon — YELLOW Lv.4 whose printed TYPES are ["Wizard","Witchelny"]: the positive
//     host for the inherited replacement. EX13-029 itself is deliberately NOT the host here: its
//     own printed ＜Armor Purge＞ is a second deletion prevention and would confound every
//     prevented/not-prevented assertion below.
//   BT9-035 Starmon — YELLOW Lv.4, ["Mutant"], no printed text: the negative host for the inherited
//     replacement.
//   BT1-037 Gorillamon — BLUE Lv.4, 6000 DP, no printed text. At its printed DP, -4000 leaves
//     2000, which the delete then removes THROUGH THE EFFECT rather than through the DP-zero rule;
//     seeded at 9000 DP it survives at 5000, above the printed ceiling.
//   BT1-009..BT1-014 are the inert main-deck Digimon used as security and deck filler.
const WITCHELNY_TEXT_SOURCE = "BT18-030";
const PLAIN_YELLOW_SOURCE = "BT1-045";
const ILLEGAL_SOURCE = "BT1-064";
const WITCHELNY_HOST = "BT18-036";
const NON_WITCHELNY_HOST = "BT9-035";
const OPPONENT = "BT1-037";
const INERT = "BT1-009";
const DECK = ["BT1-011", "BT1-012", "BT1-013", "BT1-014"];
const AUTOMATION = { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true };

describe("EX13-029 FlameWizardmon", () => {
  it("matches the catalog printed text, stats and evolution costs", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "FlameWizardmon",
      colors: ["Yellow", "Red"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      forms: ["Armor Form"],
      attributes: ["Virus"],
      types: ["Wizard", "Witchelny"],
      evoCosts: [
        { color: "Yellow", level: 3, memoryCost: 3 },
        { color: "Red", level: 3, memoryCost: 3 },
      ],
      effectText:
        "[Digivolve] Lv.3 w/[Witchelny] in text: Cost 2 \n\n＜Armor Purge＞ \n[When Digivolving] [When Attacking] [Once Per Turn] By trashing your top security card, 1 of your opponent's Digimon gets -4000 DP for the turn. After, if you have 3 or fewer security cards, delete 1 of your opponent's Digimon with 4000 DP or less.\n[Rule] Name: Also treated as [Wizardmon].",
      inheritedEffectText:
        "[All Turns] [Once Per Turn] When this Digimon with [Dynasmon] or [Witchelny] in its text would leave the battle area by your opponent's effects, by trashing your top security card, it doesn't leave.",
    });
  });

  it("compiles every printed clause", () => {
    expect(runtimeCompiledCard(CARD_ID)).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toHaveLength(5);

    // "Lv.3 w/[Witchelny] in text: Cost 2" — a printed-text predicate, no colour, cheaper than
    // both catalog EvoCosts.
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, texts: ["Witchelny"], cost: 2, isAlternate: true }]);
    expect(compiled.assemblyRequirement).toBeUndefined();

    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Armor Purge", raw: "＜Armor Purge＞" }],
    });

    // One printed [Once Per Turn] over two windows, so both share a use ledger.
    const [whenDigivolving, whenAttacking] = [compiled.effects[1], compiled.effects[2]];
    expect(whenDigivolving).toMatchObject({ trigger: "WhenDigivolving", frequency: "OncePerTurn" });
    expect(whenAttacking).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn" });
    expect(whenDigivolving?.sharedUseKey).toBe(whenAttacking?.sharedUseKey);
    expect(whenDigivolving?.sharedUseKey).toBeTypeOf("string");

    for (const effect of [whenDigivolving, whenAttacking]) {
      expect(effect?.actions).toMatchObject([
        {
          kind: "ModifyDP",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: -4000,
          duration: "forTheTurn",
          cost: {
            kind: "trash",
            target: { filter: { controller: "mine", zone: "security", position: "top" }, count: 1 },
          },
        },
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } },
            count: 1,
          },
          condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3 },
        },
      ]);
      // No "may" is printed on either process.
      expect(effect?.actions[0]).not.toHaveProperty("optional");
      expect(effect?.actions[1]).not.toHaveProperty("optional");
    }

    expect(compiled.effects[3]).toMatchObject({
      trigger: "Rule",
      actions: [{ kind: "GrantStatic", grant: "name", tokens: ["Wizardmon"] }],
    });

    expect(compiled.effects[4]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          leaveCause: "opponentEffect",
          sourceFilter: {
            isSelfRef: true,
            kind: ["Digimon"],
            printedTextOnly: true,
            nameOrTrait: [{ tokens: ["Dynasmon", "Witchelny"], match: "text" }],
          },
          actions: [],
        },
      ],
    });
  });

  it("digivolves off a Lv.3 with [Witchelny] in its text for the header's 2, then debuffs and deletes", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: WITCHELNY_TEXT_SOURCE, as: "source" }],
          hand: [{ card: CARD_ID, as: "flameWizardmon" }],
          security: [
            { card: "BT1-010", as: "top" },
            { card: "BT1-011", as: "middle" },
            { card: "BT1-012", as: "bottom" },
          ],
          deck: DECK,
        },
        1: {
          battleArea: [{ card: OPPONENT, as: "victim" }],
          security: [INERT],
          deck: DECK,
        },
      },
      AUTOMATION,
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("flameWizardmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    // The alternate header's 2, not either catalog EvoCost's 3.
    expect(s.state.memory).toBe(8);
    // The "by" cost trashed the TOP security card.
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("middle").instanceId,
      s.inst("bottom").instanceId,
    ]);
    // The post-cost stack is 2 (<= 3), so the delete lands.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain(OPPONENT);
    // 6000 - 4000 = 2000, which is above zero, so the removal is the printed DELETE and not the
    // DP-reaching-zero rule. No fixture in this file is seeded at exactly 4000 DP, because a
    // target the debuff drove to 0 would be swept by that rule and prove nothing here.
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("charges the catalog EvoCost's 3 from a Lv.3 that never names [Witchelny]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: PLAIN_YELLOW_SOURCE, as: "source" }],
          hand: [{ card: CARD_ID, as: "flameWizardmon" }],
          security: ["BT1-010", "BT1-011", "BT1-012"],
          deck: DECK,
        },
        1: { battleArea: [{ card: OPPONENT, as: "bystander" }], security: [INERT], deck: DECK },
      },
      AUTOMATION,
    );
    s.state.memory = 10;
    await s.ready();

    // This Lv.3 never names [Witchelny], so the header does not apply and the catalog EvoCost's
    // 3 is what it pays. (`useAlternateCost` is a request, not a route: the engine falls back to
    // the EvoCost when no alternate header matches, so the COST is the discriminator here and
    // the outright refusal is proven by the green source below.)
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("flameWizardmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 2);

    expect(s.perm("source").topCard.cardId).toBe(CARD_ID);
    expect(s.state.memory).toBe(7);
  });

  it("refuses a Lv.3 that matches neither the catalog EvoCosts nor the printed header", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: ILLEGAL_SOURCE, as: "green" }],
          hand: [{ card: CARD_ID, as: "flameWizardmon" }],
          security: ["BT1-010", "BT1-011", "BT1-012"],
          deck: DECK,
        },
        1: { security: [INERT], deck: DECK },
      },
      AUTOMATION,
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("green").permanentId,
        instanceId: s.inst("flameWizardmon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("green").topCard.cardId).toBe(ILLEGAL_SOURCE);
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.security).toHaveLength(3);
  });

  it("skips the delete while the post-cost security stack is still above 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: WITCHELNY_TEXT_SOURCE, as: "source" }],
          hand: [{ card: CARD_ID, as: "flameWizardmon" }],
          security: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          deck: DECK,
        },
        1: { battleArea: [{ card: OPPONENT, as: "victim" }], security: [INERT], deck: DECK },
      },
      AUTOMATION,
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("flameWizardmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 4);

    // 5 - 1 = 4, above the printed "3 or fewer" gate, so the DP debuff lands but the delete does
    // not.
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("victim").currentDP).toBe(2000);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("respects the printed 4000 DP ceiling on the delete", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: WITCHELNY_TEXT_SOURCE, as: "source" }],
          hand: [{ card: CARD_ID, as: "flameWizardmon" }],
          security: ["BT1-010", "BT1-011"],
          deck: DECK,
        },
        1: {
          battleArea: [{ card: OPPONENT, as: "survivor", dp: 9000 }],
          security: [INERT],
          deck: DECK,
        },
      },
      AUTOMATION,
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("flameWizardmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);

    // The security gate passes (1 <= 3) and the debuff lands, but 9000 - 4000 = 5000 stays above
    // the printed 4000 DP ceiling, so nothing is deleted.
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("survivor").currentDP).toBe(5000);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("cannot pay the cost with an empty security stack, so neither process happens", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: WITCHELNY_TEXT_SOURCE, as: "source" }],
          hand: [{ card: CARD_ID, as: "flameWizardmon" }],
          security: [],
          deck: DECK,
        },
        1: { battleArea: [{ card: OPPONENT, as: "victim" }], security: [INERT], deck: DECK },
      },
      AUTOMATION,
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("flameWizardmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await drainMicrotasks();

    expect(s.perm("source").topCard.cardId).toBe(CARD_ID);
    // A "by" condition can never be paid partly (manual §1): no debuff and no delete.
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("victim").currentDP).toBe(6000);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("spends one shared quota across both printed windows and resets next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: WITCHELNY_TEXT_SOURCE, as: "source" }],
          hand: [{ card: CARD_ID, as: "flameWizardmon" }],
          security: ["BT1-010", "BT1-011", "BT1-012"],
          deck: DECK,
        },
        1: {
          battleArea: [{ card: OPPONENT, as: "first", dp: 30_000 }],
          security: [INERT, INERT, INERT, INERT],
          deck: DECK,
        },
      },
      AUTOMATION,
    );
    await s.ready();
    s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 20;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("flameWizardmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 2);
    const securityAfterDigivolve = s.state.players[0]!.security.length;

    // The [When Attacking] window shares the SAME [Once Per Turn], already spent by the
    // digivolution, so this attack pays no second security card.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 3);

    expect(s.state.players[0]!.security).toHaveLength(securityAfterDigivolve);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    // Next own turn: the quota is back, so attacking pays a security card again.
    await advance(s.engine).verb.unsuspend([s.perm("source").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === securityAfterDigivolve - 1);

    expect(s.state.players[0]!.security).toHaveLength(securityAfterDigivolve - 1);
  });

  it("declares ＜Armor Purge＞ live and is read as [Wizardmon] by its printed [Rule] clause", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "flameWizardmon" }], security: [INERT], deck: DECK },
      1: { security: [INERT], deck: DECK },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("flameWizardmon"), "Armor Purge")).toBe(true);
    // The catalog name is FlameWizardmon, so every [Wizardmon] read comes from the Rule clause.
    expect(getCardDefinition(CARD_ID)?.nameEn).toBe("FlameWizardmon");
    expect(observe(s.engine).grantedNames(s.perm("flameWizardmon"))).toContain("wizardmon");
  });

  it("keeps a [Witchelny]-text host on the board, but not a host without it", async () => {
    const protectedBoard = setupEngine(
      {
        0: {
          battleArea: [{ card: WITCHELNY_HOST, as: "host", under: [CARD_ID] }],
          security: [
            { card: "BT1-010", as: "top" },
            { card: "BT1-011", as: "bottom" },
          ],
          deck: DECK,
        },
        1: { security: [INERT], deck: DECK },
      },
      AUTOMATION,
    );
    await protectedBoard.ready();
    const protectedId = protectedBoard.perm("host").permanentId;

    advance(protectedBoard.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(protectedBoard.engine).verb.deletePermanent([protectedId], "byEffect")).toBe(0);
    advance(protectedBoard.engine).verb.leaveEffectResolution();
    await settle(() => protectedBoard.state.pendingDecision === undefined);

    expect(protectedBoard.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([protectedId]);
    expect(protectedBoard.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      protectedBoard.inst("bottom").instanceId,
    ]);

    const unprotected = setupEngine(
      {
        0: {
          battleArea: [{ card: NON_WITCHELNY_HOST, as: "host", under: [CARD_ID] }],
          security: [{ card: "BT1-010", as: "top" }],
          deck: DECK,
        },
        1: { security: [INERT], deck: DECK },
      },
      AUTOMATION,
    );
    await unprotected.ready();
    const unprotectedId = unprotected.perm("host").permanentId;

    advance(unprotected.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(unprotected.engine).verb.deletePermanent([unprotectedId], "byEffect")).toBe(1);
    advance(unprotected.engine).verb.leaveEffectResolution();
    await settle(() => unprotected.state.pendingDecision === undefined);

    expect(unprotected.state.players[0]!.battleArea).toHaveLength(0);
    expect(unprotected.state.players[0]!.security).toHaveLength(1);
  });

  it("fires the delete when the post-cost security stack is exactly 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: WITCHELNY_TEXT_SOURCE, as: "source" }],
          hand: [{ card: CARD_ID, as: "flameWizardmon" }],
          security: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          deck: DECK,
        },
        1: { battleArea: [{ card: OPPONENT, as: "victim" }], security: [INERT], deck: DECK },
      },
      AUTOMATION,
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("flameWizardmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 3);

    // 4 - 1 = 3, exactly the printed gate, so the delete lands. The 5-card sibling above proves
    // the other side of the boundary at 4.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain(OPPONENT);
  });

  it("deletes a target the debuff leaves at exactly 4000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: WITCHELNY_TEXT_SOURCE, as: "source" }],
          hand: [{ card: CARD_ID, as: "flameWizardmon" }],
          security: ["BT1-010", "BT1-011"],
          deck: DECK,
        },
        1: {
          battleArea: [{ card: OPPONENT, as: "victim", dp: 8000 }],
          security: [INERT],
          deck: DECK,
        },
      },
      AUTOMATION,
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("flameWizardmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    // 8000 - 4000 = 4000, exactly the printed ceiling and far above zero, so this is the printed
    // delete and not the DP-reaching-zero rule. The 9000 sibling proves the other side.
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain(OPPONENT);
  });

  it("ignores the host's own effects and cannot prevent with an empty security stack", async () => {
    const ownEffect = setupEngine(
      {
        0: {
          battleArea: [{ card: WITCHELNY_HOST, as: "host", under: [CARD_ID] }],
          security: [{ card: "BT1-010", as: "top" }],
          deck: DECK,
        },
        1: { security: [INERT], deck: DECK },
      },
      AUTOMATION,
    );
    await ownEffect.ready();
    const ownHostId = ownEffect.perm("host").permanentId;

    advance(ownEffect.engine).verb.enterEffectResolution(0, ["Digimon"]);
    expect(await advance(ownEffect.engine).verb.deletePermanent([ownHostId], "byEffect")).toBe(1);
    advance(ownEffect.engine).verb.leaveEffectResolution();
    await settle(() => ownEffect.state.pendingDecision === undefined);

    // "by your opponent's effects" only: the controller's own effect goes through unanswered and
    // no security card is paid.
    expect(ownEffect.state.players[0]!.battleArea).toHaveLength(0);
    expect(ownEffect.state.players[0]!.security).toHaveLength(1);

    const noSecurity = setupEngine(
      {
        0: {
          battleArea: [{ card: WITCHELNY_HOST, as: "host", under: [CARD_ID] }],
          security: [],
          deck: DECK,
        },
        1: { security: [INERT], deck: DECK },
      },
      AUTOMATION,
    );
    await noSecurity.ready();
    const hostId = noSecurity.perm("host").permanentId;

    advance(noSecurity.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(noSecurity.engine).verb.deletePermanent([hostId], "byEffect")).toBe(1);
    advance(noSecurity.engine).verb.leaveEffectResolution();
    await settle(() => noSecurity.state.pendingDecision === undefined);

    // A "by" condition can never be paid partly (manual §1), so the host leaves.
    expect(noSecurity.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("prevents only one departure per turn and reopens next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: WITCHELNY_HOST, as: "host", under: [CARD_ID] }],
          security: ["BT1-010", "BT1-011", "BT1-012"],
          deck: DECK,
        },
        1: { security: [INERT], deck: DECK },
      },
      AUTOMATION,
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.security).toHaveLength(2);

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    // The single printed quota was spent, so the second departure goes through unpaid.
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(2);

    const revived = s.putOnBoard(0, { card: WITCHELNY_HOST, as: "host2", under: [CARD_ID] });
    await s.ready();
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([revived.permanentId], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(revived.permanentId);
    // A third security card was paid for the reopened prevention.
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});
