import { describe, expect, it } from "vitest";
import { getCardDefinition, PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import {
  playOptionFromHand,
  seatOneAttacksPlayer,
  shuffleSecurityWithLiollmon,
  traitDigimonFor,
} from "./faceUpSecurityOption.testSupport.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";
import { compiled } from "./EX8-068.js";

describe("EX8-068", () => {
  it("matches the committed catalog identity and every printed clause", () => {
    expect(getCardDefinition("EX8-068")).toMatchObject({
      cardId: "EX8-068",
      nameEn: "Deep Savers",
      colors: ["Blue"],
      kinds: ["Option"],
      playCost: 2,
      dp: 0,
      evoCosts: [],
      forms: ["-"],
      attributes: ["-"],
      types: ["DS"],
      effectText: expect.stringContaining("no face-up security cards"),
      securityEffectText: expect.stringContaining("level 5 or lower Digimon"),
    });
    expect(getCardDefinition("EX8-068")?.effectText).toContain("bottom security card");
    expect(getCardDefinition("EX8-068")?.inheritedEffectText).toBeUndefined();
  });

  it("waives its color requirement with no face-up security cards and protects DS Digimon from battle deletion at 1 or more memory", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      condition: { kind: "noFaceUpSecurity", raw: "you have no face-up security cards" },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Aura",
      target: {
        filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["DS"], match: "trait" }] },
        count: "all",
      },
      effect: { kind: "restriction", restriction: "beDeletedInBattle" },
      while: { kind: "memoryAtLeast", value: 1 },
    });
  });
  it("takes the bottom security card to hand and places itself face-up at the bottom", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toMatchObject([
      { kind: "SecurityManipulation", op: "toHand", controller: "mine", amount: 1, toTop: false },
      {
        kind: "SecurityManipulation",
        op: "placeAsSecurity",
        controller: "mine",
        toTop: false,
        faceUp: true,
      },
    ]);
  });
  it("plays an optional level 5 or lower DS Digimon from hand on security", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          optional: true,
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 5 },
              nameOrTrait: [{ tokens: ["DS"], match: "trait" }],
            },
            count: 1,
          },
        },
      ],
    }));
  it("plays the exact DS Digimon from hand when the security effect is revealed", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
        1: {
          security: [{ card: "EX8-068", as: "securityCard", faceUp: true }],
          hand: [
            { card: "EX8-058", as: "dsCard" },
            { card: "EX8-026", as: "tooHigh" },
            { card: "BT1-010", as: "offTrait" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[1] as PlayerState;
    const instanceId = s.inst("dsCard").instanceId;
    const memoryBeforeSecurityEffect = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => player.battleArea.some((permanent) => permanent.topCard.instanceId === instanceId));
    expect(player.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId)).toBe(true);
    expect(player.hand.some((card) => card.instanceId === instanceId)).toBe(false);
    expect(player.hand.some((card) => card.instanceId === s.inst("tooHigh").instanceId)).toBe(true);
    expect(player.hand.some((card) => card.instanceId === s.inst("offTrait").instanceId)).toBe(true);
    expect(s.state.memory).toBe(memoryBeforeSecurityEffect);
  });
  it("prevents battle deletion of an own DS Digimon while memory is at least 1", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX8-058", as: "ds" }],
        security: [{ card: "EX8-068", as: "source", faceUp: true }],
      },
      1: { battleArea: [{ card: "BT1-016", as: "defender", dp: 20000, suspended: true }] },
    });
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ds").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("ds").permanentId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX8-058")).toBe(false);
  });
  it("waives the blue color requirement while the security stack has no face-up cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-010", as: "red" }],
        hand: [{ card: "EX8-068", as: "option" }],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("option").instanceId);
    expect(s.state.players[0]!.security[0]!.faceUp).toBe(true);
  });
  it("does not waive the color requirement while security contains a face-up card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-010", as: "red" }],
        hand: [{ card: "EX8-068", as: "option" }],
        security: [{ card: "BT1-010", as: "faceUp", faceUp: true }],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toMatchObject({
      ok: false,
    });
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });
  it("allows battle deletion of a DS Digimon when memory is 0", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX8-058", as: "ds", suspended: true }],
        security: [{ card: "EX8-068", as: "source", faceUp: true }],
      },
      1: { battleArea: [{ card: "BT1-016", as: "attacker", dp: 20000 }] },
    });
    s.state.memory = 0;
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("ds").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.every((permanent) => permanent.topCard.cardId !== "EX8-058"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("ds").permanentId)).toBe(
      false,
    );
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX8-058")).toBe(true);
  });
  it("moves bottom security to hand and places the exact option face-up at the new bottom", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT1-030"],
        hand: [{ card: "EX8-068", as: "option" }],
        security: [
          { card: "BT1-009", as: "top" },
          { card: "BT1-010", as: "bottom" },
        ],
      },
    });
    s.state.memory = 5;
    const optionId = s.inst("option").instanceId;
    const topId = s.inst("top").instanceId;
    const bottomId = s.inst("bottom").instanceId;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === optionId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === bottomId)).toBe(true);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([topId, optionId]);
    expect(s.state.players[0]!.security[1]!.faceUp).toBe(true);
  });

  it("places itself face-up even when security is empty (Q3954-Q3955)", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "EX8-068", as: "option" }] } });
    s.state.memory = 5;
    const optionId = s.inst("option").instanceId;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 1);
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(optionId);
    expect(s.state.players[0]!.security[0]!.faceUp).toBe(true);
  });
});

describe("EX8-068 Deep Savers — KB Q&A rulings", () => {
  it("stays revealed as the bottom security card and is otherwise an ordinary security card (Q3957)", async () => {
    const s = await playOptionFromHand("EX8-068", {
      security: [
        { card: "BT1-009", as: "top" },
        { card: "BT1-013", as: "bottom" },
      ],
    });
    const optionId = s.inst("option").instanceId;
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("bottom").instanceId]);
    expect(s.state.players[0]!.security.map((card) => [card.instanceId, card.faceUp === true])).toEqual([
      [s.inst("top").instanceId, false],
      [optionId, true],
    ]);

    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: false });
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(optionId);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("top").instanceId]);
  });

  it("is checked while left revealed and trashed like any checked security card (Q3958)", async () => {
    const s = await playOptionFromHand("EX8-068", { security: ["BT1-013"] });
    const optionId = s.inst("option").instanceId;
    expect(s.state.players[0]!.security.map((card) => [card.instanceId, card.faceUp])).toEqual([[optionId, true]]);

    await seatOneAttacksPlayer(s);

    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "securityRevealed", seat: 0, revealedCardId: "EX8-068" }),
    );
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(optionId);
  });

  it("triggers its [Security] effect when checked face up (Q3959)", async () => {
    const s = await playOptionFromHand("EX8-068", {
      hand: [{ card: traitDigimonFor["EX8-068"], as: "traitDigimon" }],
      security: ["BT1-013"],
    });
    const traitDigimonId = s.inst("traitDigimon").instanceId;
    expect(s.state.players[0]!.security[0]!.faceUp).toBe(true);

    await seatOneAttacksPlayer(s);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(traitDigimonId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(traitDigimonId);
  });

  it("turns face down with the rest of the security stack when it is shuffled (Q3960)", async () => {
    const s = await playOptionFromHand("EX8-068", {
      hand: [{ card: "EX5-027", as: "liollmon" }],
      security: ["BT1-009", "BT1-013", "BT1-009"],
    });
    expect(s.state.players[0]!.security.at(-1)).toMatchObject({
      instanceId: s.inst("option").instanceId,
      faceUp: true,
    });
    const securityIds = s.state.players[0]!.security.map((card) => card.instanceId).sort();

    await shuffleSecurityWithLiollmon(s);

    expect(s.state.players[0]!.security.map((card) => card.instanceId).sort()).toEqual(securityIds);
    expect(s.state.players[0]!.security.every((card) => card.faceUp !== true)).toBe(true);
  });

  function dsBoard() {
    return setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-058", as: "ds", suspended: true },
            { card: "BT1-072", as: "blocker" },
          ],
          security: [{ card: "EX8-068", faceUp: true }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "evolving" },
            { card: "BT1-016", as: "attacker", dp: 20000 },
          ],
          hand: [{ card: "BT1-016", as: "tyrannomon" }],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
  }

  async function attackDsWhileMemoryMovesTo(s: ReturnType<typeof dsBoard>, memoryDuringBattle: number) {
    const dsId = s.perm("ds").permanentId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: dsId },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 0);
    s.state.memory = memoryDuringBattle;
    await advance(s.engine).recompute();
    expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    return s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === dsId);
  }

  it("reads 1 or more memory from its owner's side of the gauge, even on the opponent's turn (Q3956)", async () => {
    for (const [seatOneMemory, dsSurvives] of [
      [-1, true],
      [-3, true],
      [0, false],
      [1, false],
    ] as const) {
      const s = dsBoard();
      s.state.turnSeat = 1;
      s.state.memory = 3;
      await s.ready();
      expect(await attackDsWhileMemoryMovesTo(s, seatOneMemory)).toBe(dsSurvives);
    }
  });

  it("protects DS Digimon as soon as an opposing digivolution leaves its owner with 1 or more memory (Q3961)", async () => {
    const s = dsBoard();
    s.state.turnSeat = 1;
    s.state.memory = 1;
    await s.ready();
    expect(observe(s.engine).isRestricted(s.perm("ds"), "beDeletedInBattle")).toBe(false);

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("evolving").permanentId,
        instanceId: s.inst("tyrannomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("evolving").topCard.cardId === "BT1-016" && s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(-1);
    expect(observe(s.engine).isRestricted(s.perm("ds"), "beDeletedInBattle")).toBe(true);
  });
});
