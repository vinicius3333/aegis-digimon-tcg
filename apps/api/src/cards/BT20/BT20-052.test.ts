import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle, type CardSpec, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-052.js";
import "../BT1/BT1-097.js";
import "../BT5/BT5-037.js";
import "../BT15/BT15-086.js";
import "../EX10/EX10-009.js";
import "../ST22/ST22-08.js";
import "./index.js";

describe("BT20-052 Oblivimon", () => {
  it("plays from security at the end of the opponent's turn and flips the next face-down opposing security card on DNA digivolving", () => {
    expect(compiled.effects.find((effect) => effect.isSecurity)).toMatchObject({
      trigger: "EndOfOpponentsTurn",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
    expect(compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [{ kind: "SecurityManipulation", op: "flipFaceUp", controller: "opponent" }],
    });
  });

  it("may place this Digimon's top card face-up at security bottom after a face-up check", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "YourTurn" && !effect.isInherited)).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenCheckedFaceUpSecurity",
          actions: [
            {
              kind: "SecurityManipulation",
              op: "addBottom",
              controller: "mine",
              faceUp: true,
              detachPermanentTop: true,
              optional: true,
              source: { filter: { isSelfRef: true }, isSelf: true },
            },
          ],
        },
      ],
    });
  });

  it("prevents switching this Digimon's attack target as an inherited effect", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "YourTurn",
      actions: [{ kind: "Restrict", restriction: "attackTargetChange", duration: "permanent" }],
    });
  });

  it("publishes Oblivimon's catalog identity and exact Cyborg/Machine alternate route", () => {
    expect(getCardDefinition("BT20-052")).toMatchObject({
      cardId: "BT20-052",
      nameEn: "Oblivimon",
      colors: ["Black", "Blue"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [
        { color: "Black", level: 4, memoryCost: 4 },
        { color: "Blue", level: 4, memoryCost: 4 },
      ],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Cyborg", "LIBERATOR"],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, traits: ["Cyborg", "Machine"], cost: 3, isAlternate: true },
    ]);
    expect(matchingAlternateDigivolutionRequirement("BT20-052", "BT20-050")).toMatchObject({
      level: 4,
      traits: ["Cyborg", "Machine"],
      cost: 3,
    });
    expect(matchingAlternateDigivolutionRequirement("BT20-052", "BT20-049")).toMatchObject({
      level: 4,
      traits: ["Cyborg", "Machine"],
      cost: 3,
    });
    expect(matchingAlternateDigivolutionRequirement("BT20-052", "BT20-010")).toBeUndefined();
  });

  it("naturally plays from face-up security at the opponent's turn end", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT20-052", as: "oblivimon", faceUp: true }] },
      1: { deck: ["BT1-010"] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT20-052"));
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT20-052")).toBe(true);
  });

  it("uses the Cyborg route for 3 and flips the next face-down security card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-050", as: "base" }], hand: [{ card: "BT20-052", as: "oblivimon" }] },
      1: { security: [{ card: "BT1-009", faceUp: true }, "BT1-010", "BT1-011"] },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("oblivimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT20-052");
    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.security.map((card) => card.faceUp)).toEqual([true, true, false]);
  });

  it("may place its top card face-up at security bottom after a face-up check", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-052", under: ["BT20-050"], as: "oblivimon" }] },
        1: { security: [{ card: "BT20-047", faceUp: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("oblivimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.cardId === "BT20-052"));
    expect(s.state.players[0]!.security.at(-1)).toMatchObject({ cardId: "BT20-052", faceUp: true });
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toContain("BT20-050");
  });

  it("can decline the optional face-up-check placement", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-052", under: ["BT20-050"], as: "oblivimon" }] },
        1: { security: [{ card: "BT20-047", faceUp: true }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("oblivimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toContain("BT20-052");
  });

  it("does not place its top card when the security check is face-down", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-052", under: ["BT20-050"], as: "oblivimon" }] },
        1: { security: [{ card: "BT20-047", as: "faceDown" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("oblivimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-052")).toBe(true);
  });

  it("grants the inherited target-change lock only on its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-053", under: ["BT20-052"], as: "host" },
          { card: "BT20-052", as: "top" },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).isRestricted(s.perm("host"), "attackTargetChange")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("top"), "attackTargetChange")).toBe(false);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).isRestricted(s.perm("host"), "attackTargetChange")).toBe(false);
  });

  it("publicly refuses a Blocker redirect from an inherited Oblivimon attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-055", dp: 12000, under: ["BT20-052"], as: "host" }] },
        1: {
          battleArea: [{ card: "BT20-047", as: "blocker" }],
          security: ["BT1-010"],
          deck: ["BT1-010", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await drainMicrotasks();
    expect(s.events.some((event) => event.kind === "blockWindowOpened")).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "declareBlock",
        blockerPermanentId: s.perm("blocker").permanentId,
      }),
    ).toMatchObject({ ok: false });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-047")).toBe(true);
  });
});

describe("BT20-052 Oblivimon — KB Q&A rulings", () => {
  async function digivolveFromHoverEspimon(s: EngineSetup): Promise<void> {
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("oblivimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT20-052" && s.state.pendingDecision === undefined);
  }

  function attackPlayer(s: EngineSetup, attacker: string): void {
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm(attacker).permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  }

  const oblivimonInHand = {
    battleArea: [{ card: "BT20-050", as: "base" }],
    hand: [{ card: "BT20-052", as: "oblivimon" }],
  };

  it("flips the 2nd security card when only the top one is already face up (Q4375)", async () => {
    const s = setupEngine({
      0: oblivimonInHand,
      1: { security: [{ card: "BT1-009", faceUp: true }, "BT1-010", "BT1-011"] },
    });
    await digivolveFromHoverEspimon(s);
    expect(s.state.players[1]!.security.map((card) => [card.cardId, card.faceUp])).toEqual([
      ["BT1-009", true],
      ["BT1-010", true],
      ["BT1-011", false],
    ]);

    const control = setupEngine({ 0: oblivimonInHand, 1: { security: ["BT1-009", "BT1-010", "BT1-011"] } });
    await digivolveFromHoverEspimon(control);
    expect(control.state.players[1]!.security.map((card) => card.faceUp)).toEqual([true, false, false]);
  });

  it("keeps a card flipped face up as a revealed security card that is checked like any other (Q4376)", async () => {
    const s = setupEngine(
      {
        0: { ...oblivimonInHand, battleArea: [...oblivimonInHand.battleArea, { card: "BT1-024", as: "attacker" }] },
        1: { security: [{ card: "BT1-010", as: "flipped" }, "BT1-013"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await digivolveFromHoverEspimon(s);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[1]!.security.map((card) => [card.cardId, card.faceUp])).toEqual([
      ["BT1-010", true],
      ["BT1-013", false],
    ]);

    attackPlayer(s, "attacker");
    await settle(() => s.state.players[1]!.security.length === 1 && s.state.pendingDecision === undefined);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-010");
    expect(s.state.players[1]!.security.map((card) => [card.cardId, card.faceUp])).toEqual([["BT1-013", false]]);
  });

  it("battles a face-up security Digimon with normal security-check rules (Q4377)", async () => {
    const s = setupEngine(
      {
        0: { ...oblivimonInHand, battleArea: [...oblivimonInHand.battleArea, { card: "BT1-009", as: "attacker" }] },
        1: { security: ["BT1-024", "BT1-013"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await digivolveFromHoverEspimon(s);
    expect(s.state.players[1]!.security[0]).toMatchObject({ cardId: "BT1-024", faceUp: true });

    attackPlayer(s, "attacker");
    await settle(
      () =>
        s.state.players[1]!.security.length === 1 &&
        !s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-009") &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-009");
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-024");
    expect(s.state.players[1]!.security.map((card) => [card.cardId, card.faceUp])).toEqual([["BT1-013", false]]);
  });

  it("activates the [Security] effect of a face-up security card when it is checked (Q4378)", async () => {
    const s = setupEngine(
      {
        0: oblivimonInHand,
        1: { security: ["BT1-097", "BT1-013"], deck: ["BT1-010", "BT1-011", "BT1-014"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await digivolveFromHoverEspimon(s);
    expect(s.state.players[1]!.security[0]).toMatchObject({ cardId: "BT1-097", faceUp: true });
    expect(s.state.players[1]!.hand).toHaveLength(0);

    attackPlayer(s, "base");
    await settle(() => s.state.players[1]!.security.length === 1 && s.state.pendingDecision === undefined);
    expect(s.state.players[1]!.hand).toHaveLength(2);
    expect(s.state.players[1]!.deck).toHaveLength(1);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-097");
  });

  it("turns face-up security cards face down when the security stack is shuffled (Q4379)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-052", under: ["BT20-050"], as: "oblivimon" }],
          hand: [{ card: "BT5-037", as: "shuffler" }],
          security: ["BT1-013", "BT1-014"],
        },
        1: { security: [{ card: "BT1-010", faceUp: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    attackPlayer(s, "oblivimon");
    await settle(() => s.state.players[1]!.security.length === 0 && s.state.players[0]!.security.length === 3);
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.security.map((card) => [card.cardId, card.faceUp])).toEqual([
      ["BT1-013", false],
      ["BT1-014", false],
      ["BT20-052", true],
    ]);

    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shuffler").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT5-037") &&
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.security.every((card) => !card.faceUp),
    );
    expect(s.state.players[0]!.security.map((card) => card.cardId).sort()).toEqual(["BT1-013", "BT1-014", "BT20-052"]);
    expect(s.state.players[0]!.security.every((card) => !card.faceUp)).toBe(true);
  });

  it("resolves the checked card's [Security] effect before its face-up-check placement (Q4380)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-052", under: ["BT20-050"], as: "oblivimon" }] },
        1: { security: [{ card: "ST22-08", faceUp: true }, "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    attackPlayer(s, "oblivimon");
    await settle(
      () =>
        s.state.players[1]!.security.length === 1 &&
        s.state.players[0]!.battleArea.length === 0 &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.players[1]!.hand.map((card) => card.cardId)).toEqual(["ST22-08"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT20-050", "BT20-052"]);
    expect(s.state.players[0]!.security).toHaveLength(0);

    const control = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-052", under: ["BT20-050"], as: "oblivimon" },
            { card: "BT1-009", as: "lowest" },
          ],
        },
        1: { security: [{ card: "ST22-08", faceUp: true }, "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await control.ready();
    attackPlayer(control, "oblivimon");
    await settle(
      () =>
        control.state.players[1]!.security.length === 1 &&
        control.state.players[0]!.security.length === 1 &&
        control.state.pendingDecision === undefined,
    );
    expect(control.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(control.state.players[0]!.security.map((card) => [card.cardId, card.faceUp])).toEqual([["BT20-052", true]]);
    expect(control.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT20-050"]);
  });
  it("triggers the [End of Attack] effect of the Digimon left after its top card moves to security (Q4381)", async () => {
    function attackFaceUpOrFaceDown(faceUp: boolean): EngineSetup {
      return setupEngine(
        {
          0: {
            battleArea: [{ card: "BT20-052", under: ["BT20-050"], as: "oblivimon" }],
            deck: ["BT1-010", "BT1-011"],
          },
          1: { security: [{ card: "BT20-047", faceUp }, "BT1-013"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
    }

    const s = attackFaceUpOrFaceDown(true);
    await s.ready();
    attackPlayer(s, "oblivimon");
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.hand.length > 0,
    );
    expect(s.state.players[0]!.security.map((card) => [card.cardId, card.faceUp])).toEqual([["BT20-052", true]]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT20-050"]);
    expect(s.state.players[0]!.hand).toHaveLength(1);

    const control = attackFaceUpOrFaceDown(false);
    await control.ready();
    attackPlayer(control, "oblivimon");
    await settle(
      () =>
        !observe(control.engine).isAttacking() &&
        control.state.pendingDecision === undefined &&
        control.state.players[1]!.security.length === 1,
    );
    expect(control.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT20-052"]);
    expect(control.state.players[0]!.hand).toHaveLength(0);
  });

  it("loses the game when it leaves security at the opponent's turn end during their effect attack (Q4719)", async () => {
    function endOpponentTurnWithCreepymonAttack(security: CardSpec[]): EngineSetup {
      const setup = setupEngine(
        {
          0: { security },
          1: { battleArea: [{ card: "EX10-009", as: "creepymon" }], deck: ["BT1-010", "BT1-011"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: ["player"] },
      );
      setup.state.turnSeat = 1;
      return setup;
    }

    async function runOpponentTurn(setup: EngineSetup): Promise<void> {
      await setup.ready();
      const turn = setup.engine.runOneTurn();
      await advance(setup.engine).waitForMainPhase(1);
      advance(setup.engine).endMainPhaseIfOpen(1);
      await turn;
      await settle(
        () =>
          setup.state.winnerSeat !== -1 ||
          (!observe(setup.engine).isAttacking() && setup.state.pendingDecision === undefined),
        5000,
      );
    }

    const s = endOpponentTurnWithCreepymonAttack([{ card: "BT20-052", as: "oblivimon", faceUp: true }]);
    await runOpponentTurn(s);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT20-052"]);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.winnerSeat).toBe(1);

    const control = endOpponentTurnWithCreepymonAttack([{ card: "BT20-052", faceUp: true }, "BT1-013"]);
    await runOpponentTurn(control);
    expect(control.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT20-052"]);
    expect(control.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-013"]);
    expect(control.state.players[0]!.security).toHaveLength(0);
    expect(control.state.winnerSeat).toBe(-1);
  });

  it.fails("ends the attack when moving its top card leaves only [Marvin Jackson], a Tamer (Q4720)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-052", under: ["BT15-086"], as: "oblivimon" }] },
        1: { security: [{ card: "BT1-009", faceUp: true }, "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    attackPlayer(s, "oblivimon");
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.security.length === 1,
    );
    expect(s.state.players[0]!.security.map((card) => [card.cardId, card.faceUp])).toEqual([["BT20-052", true]]);
    const marvin = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT15-086");
    expect(marvin).toBeDefined();
    expect(getCardDefinition(marvin!.topCard.cardId)?.kinds).toEqual(["Tamer"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-013"]);
    const checked = s.events.filter((event) => event.kind === "securityChecked");
    expect(checked).toHaveLength(1);
    expect(checked[0]?.battle).toBeUndefined();
  });
});
