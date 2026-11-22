import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { EffectTiming } from "@aegis/shared/schema/enums";
import { advance } from "#api/engine/testkit/advance";
import { setupEngine, settle } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import { placeAtStartOfMain } from "#api/cards/BT26/tamerStack.testSupport";
import { identityVisibility, trashBottomTamerCardWithFalcomon } from "#api/cards/ST24/tamerStack.testSupport";
import { compiled } from "./BT27-089.js";
import "#api/cards/index";

const cardId = "BT27-089";

describe("Thomas H. Norstein Gaomon storage and Gaogamon battle protection", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Thomas H. Norstein",
      nameJp: "トーマ・H・ノルシュタイン",
      colors: ["Blue"],
      kinds: ["Tamer"],
      playCost: 3,
      types: ["DATA SQUAD"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.effects.map((effect) => effect.trigger)).toEqual(["StartOfYourMainPhase", "AllTurns", "Security"]);
  });

  it.each([
    ["Gaomon", "BT25-021", true],
    ["Gaogamon", "BT25-023", true],
    ["MachGaogamon", "BT27-030", true],
    ["an unrelated Digimon", "BT1-009", false],
  ] as const)("start of main places %s face down to draw and gain memory: %s", async (_label, card, paid) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "thomas" }],
          hand: [{ card, as: "cost" }],
          deck: [{ card: "BT1-013", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnStartMainPhase, s.perm("thomas"));
    await settle();
    expect(s.perm("thomas").stack.map((c) => [c.instanceId, c.faceUp])).toEqual(
      paid ? [[s.inst("cost").instanceId, false]] : [],
    );
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toEqual([
      paid ? s.inst("drawn").instanceId : s.inst("cost").instanceId,
    ]);
    expect(s.state.memory).toBe(paid ? 1 : 0);
  });

  it("suspends to place the deck top face down and protects a Gaogamon from battle deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "thomas", under: [{ card: "BT1-009", as: "oldBottom", faceUp: false }] },
            { card: "BT1-038", as: "unrelated" },
            { card: "BT25-023", as: "gaogamon" },
          ],
          deck: [{ card: "BT1-013", as: "top" }, "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenEffectAddsToOpponentHand", { effectAddedToHandSeat: 1 });
    await settle(() => observe(s.engine).isRestricted(s.perm("gaogamon"), "beDeletedInBattle"));
    expect(s.perm("thomas").isSuspended).toBe(true);
    expect(s.perm("thomas").stack.map((c) => c.instanceId)).toEqual([
      s.inst("top").instanceId,
      s.inst("oldBottom").instanceId,
    ]);
    expect(s.perm("thomas").stack.every((c) => c.faceUp !== true)).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("unrelated"), "beDeletedInBattle")).toBe(false);
  });

  it("still protects the Gaogamon after the Tamer suspends and the deck placement is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "thomas" },
            { card: "BT25-023", as: "gaogamon" },
          ],
          deck: [{ card: "BT1-013", as: "top" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const answerOptional = async (accept: boolean) => {
      await settle(() => s.state.pendingDecision?.kind === "optional");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: s.state.pendingDecision!.decisionId,
          response: { kind: "optional", accept },
        }),
      ).toEqual({ ok: true });
    };
    void advance(s.engine).fireSubTrigger("whenEffectAddsToOpponentHand", { effectAddedToHandSeat: 1 });
    await answerOptional(true);
    await answerOptional(false);
    await settle(() => observe(s.engine).isRestricted(s.perm("gaogamon"), "beDeletedInBattle"));

    expect(s.perm("thomas").isSuspended).toBe(true);
    expect(s.perm("thomas").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((c) => c.instanceId)).toEqual([s.inst("top").instanceId]);
  });

  it("ends the battle protection with the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "thomas" },
            { card: "BT25-023", as: "gaogamon" },
          ],
          deck: ["BT1-013"],
        },
        1: { deck: ["BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenEffectAddsToOpponentHand", { effectAddedToHandSeat: 1 });
    await settle(() => observe(s.engine).isRestricted(s.perm("gaogamon"), "beDeletedInBattle"));
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    expect(observe(s.engine).isRestricted(s.perm("gaogamon"), "beDeletedInBattle")).toBe(false);
  });

  it.each(["declined", "already suspended", "own hand"])("does nothing when the trigger is %s", async (reason) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "thomas", suspended: reason === "already suspended" },
            { card: "BT25-023", as: "gaogamon" },
          ],
          deck: ["BT1-013"],
        },
      },
      { autoAcceptOptional: reason !== "declined", autoDeclineOptional: reason === "declined", autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenEffectAddsToOpponentHand", {
      effectAddedToHandSeat: reason === "own hand" ? 0 : 1,
    });
    await settle(() => !s.state.pendingDecision);
    expect(s.perm("thomas").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(observe(s.engine).isRestricted(s.perm("gaogamon"), "beDeletedInBattle")).toBe(false);
  });

  it("reacts to MachGaogamon returning an opponent's Digimon and protects MachGaogamon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "thomas" },
            { card: "BT27-030", as: "mach" },
          ],
          deck: [{ card: "BT1-013", as: "top" }],
        },
        1: { battleArea: [{ card: "BT1-037", as: "returned" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("mach"));
    await settle(() => observe(s.engine).isRestricted(s.perm("mach"), "beDeletedInBattle"));
    expect(s.state.players[1]!.hand.map((c) => c.cardId)).toEqual(["BT1-037"]);
    expect(s.perm("thomas").isSuspended).toBe(true);
    expect(s.perm("thomas").stack.map((c) => c.instanceId)).toEqual([s.inst("top").instanceId]);
  });

  it("plays itself from Security without paying", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT1-038", as: "attacker" }] }, 1: { security: [cardId] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === cardId));
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});

describe("Thomas H. Norstein official rulings", () => {
  it("places the start-of-main card face down at the bottom, visible only to its owner", async () => {
    const { s, placedId, priorIds, finish } = await placeAtStartOfMain(cardId, "BT25-021");

    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([placedId, ...priorIds]);
    expect(s.perm("tamer").stack.every((card) => card.faceUp === false)).toBe(true);
    expect(identityVisibility(s, s.inst("placed"))).toEqual({ owner: true, opponent: false });
    await finish();
  });

  it("puts a face-down card trashed from under this Tamer face up in the trash", async () => {
    const { s, placedId, finish } = await placeAtStartOfMain(cardId, "BT25-021");

    const { trashed } = await trashBottomTamerCardWithFalcomon(s);

    expect(trashed).toMatchObject({ instanceId: placedId, cardId: "BT25-021", faceUp: true });
    expect(identityVisibility(s, trashed!)).toEqual({ owner: true, opponent: true });
    await finish();
  });

  it.each([
    ["an opponent's Digimon", false, "combatResolved"],
    ["a Security Digimon", true, "securityChecked"],
  ] as const)(
    "keeps the protected Gaogamon after it loses a battle against %s",
    async (_label, againstSecurity, battleEvent) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: cardId, as: "thomas" },
              { card: "BT25-023", as: "gaogamon" },
            ],
            deck: ["BT1-013", "BT1-013", "BT1-013"],
          },
          1: againstSecurity
            ? { security: ["BT2-075"], deck: ["BT1-013", "BT1-013"] }
            : { battleArea: [{ card: "BT2-075", as: "defender", suspended: true }], deck: ["BT1-013", "BT1-013"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      await advance(s.engine).fireSubTrigger("whenEffectAddsToOpponentHand", { effectAddedToHandSeat: 1 });
      await settle(() => observe(s.engine).isRestricted(s.perm("gaogamon"), "beDeletedInBattle"));
      const gaogamonId = s.perm("gaogamon").permanentId;

      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: gaogamonId,
          target: againstSecurity
            ? { kind: "player" }
            : { kind: "permanent", permanentId: s.perm("defender").permanentId },
        }),
      ).toEqual({ ok: true });
      await advance(s.engine).finishAttack();
      await settle();

      expect(s.events.some((event) => event.kind === battleEvent)).toBe(true);
      expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === gaogamonId)).toBe(true);
      expect(s.state.players[0]!.trash.map((card) => card.cardId)).not.toContain("BT25-023");
    },
  );
});
