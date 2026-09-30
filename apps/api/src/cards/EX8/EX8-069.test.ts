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
import { compiled } from "./EX8-069.js";
import "./index.js";

describe("EX8-069", () => {
  it("matches the committed catalog identity and every printed text field", () => {
    expect(getCardDefinition("EX8-069")).toMatchObject({
      cardId: "EX8-069",
      nameEn: "Nature Spirits",
      colors: ["Green"],
      kinds: ["Option"],
      playCost: 2,
      dp: 0,
      forms: ["-"],
      attributes: ["-"],
      types: ["NSp"],
      evoCosts: [],
      effectText:
        "While you have no face-up security cards, you may ignore this card's color requirements.\n[Security] [All Turns] All of your [NSp]\u00a0trait Digimon gain ＜Alliance＞ \n[Main] Add your bottom security card to the hand. Then, place this card face up as the bottom security card.",
      securityEffectText:
        "[Security] You may play 1 level 5 or lower Digimon with the [NSp]\u00a0trait from your hand without paying the cost.",
    });
  });
  it("waives its color requirement with no face-up security cards and grants all NSp Digimon Alliance", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: { kind: "noFaceUpSecurity" },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Alliance" },
      target: { count: "all" },
      duration: "permanent",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      trigger: "AllTurns",
      isSecurity: true,
    });
  });
  it("takes the bottom security card to hand and places itself face-up at the bottom", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toMatchObject([
      { kind: "SecurityManipulation", op: "toHand", toTop: false },
      { kind: "SecurityManipulation", op: "placeAsSecurity", toTop: false, faceUp: true },
    ]));
  it("contains only the printed effects", () => expect(compiled.effects).toHaveLength(4));
  it("plays an optional level 5 or lower NSp Digimon from hand without cost in security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
        1: {
          security: [{ card: "EX8-069", as: "securityCard", faceUp: true }],
          hand: [{ card: "EX7-015", as: "nsp" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const instanceId = s.inst("nsp").instanceId;
    const memoryBeforeSecurityEffect = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      (s.state.players[1] as PlayerState).battleArea.some((permanent) => permanent.topCard.instanceId === instanceId),
    );
    expect(
      (s.state.players[1] as PlayerState).battleArea.some((permanent) => permanent.topCard.instanceId === instanceId),
    ).toBe(true);
    expect((s.state.players[1] as PlayerState).hand.some((card) => card.instanceId === instanceId)).toBe(false);
    expect(s.state.memory).toBe(memoryBeforeSecurityEffect);
  });
  it("may decline the optional Security play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
        1: { security: [{ card: "EX8-069", as: "securityCard" }], hand: [{ card: "EX7-015", as: "nsp" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const nspId = s.inst("nsp").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !s.state.pendingDecision);

    expect(s.state.players[1]!.hand.some((card) => card.instanceId === nspId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === nspId)).toBe(false);
  });
  it("grants Alliance to a live NSp Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX7-015", as: "nsp" }],
        security: [{ card: "EX8-069", as: "source", faceUp: true }],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("nsp"), "Alliance")).toBe(true);
  });
  it("does not waive the color requirement while security contains a face-up card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-030", as: "blue" }],
        hand: [{ card: "EX8-069", as: "option" }],
        security: [{ card: "BT1-009", as: "faceUp", faceUp: true }],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toMatchObject({
      ok: false,
    });
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });
  it("plays with no face-up security even when the option color is absent", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "EX8-069", as: "option" }], security: [] } });
    s.state.memory = 2;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(s.state.players[0]!.security[0]!.faceUp).toBe(true);
  });
  it("uses the granted Alliance in a real attack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX7-015", as: "attacker", dp: 7000 },
          { card: "BT1-010", as: "ally", dp: 3000 },
        ],
        security: [{ card: "EX8-069", as: "source", faceUp: true }],
      },
      1: { security: ["BT1-009"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    expect(s.events.some((event) => event.kind === "alliancePrompt")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("ally").permanentId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === s.perm("ally").permanentId)!
          .isSuspended,
    );

    expect(s.perm("ally").isSuspended).toBe(true);
  });
  it("does not grant Alliance to a non-NSp peer and performs ordered face-up Main placement", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-010", as: "nonNsp" },
          { card: "BT1-030", as: "blueSource" },
        ],
        hand: [{ card: "EX8-069", as: "option" }],
        security: [
          { card: "BT1-009", as: "top" },
          { card: "BT1-010", as: "bottom" },
        ],
      },
    });
    const optionId = s.inst("option").instanceId;
    const topId = s.inst("top").instanceId;
    const bottomId = s.inst("bottom").instanceId;
    s.state.memory = 5;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("nonNsp"), "Alliance")).toBe(false);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === optionId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === bottomId)).toBe(true);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([topId, optionId]);
    expect(s.state.players[0]!.security[1]!.faceUp).toBe(true);
  });
});

describe("EX8-069 Nature Spirits — KB Q&A rulings", () => {
  it("treats an empty security stack as having no face-up cards, so it plays without its color (Q3962)", async () => {
    const s = await playOptionFromHand("EX8-069", { battleArea: [{ card: "BT1-010", as: "red" }], security: [] });
    expect(s.state.players[0]!.security.map((card) => [card.instanceId, card.faceUp])).toEqual([
      [s.inst("option").instanceId, true],
    ]);

    const blocked = setupEngine({
      0: {
        battleArea: [{ card: "BT1-010", as: "red" }],
        hand: [{ card: "EX8-069", as: "option" }],
        security: [{ card: "BT1-009", faceUp: true }],
      },
    });
    blocked.state.memory = 10;
    await blocked.ready();
    expect(
      blocked.engine.applyIntent(0, { type: "playCard", instanceId: blocked.inst("option").instanceId }),
    ).toMatchObject({
      ok: false,
    });
  });

  it("resolves [Main] with 0 security cards by only placing itself face up in security (Q3963)", async () => {
    const s = await playOptionFromHand("EX8-069", { security: [] });

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.security.map((card) => [card.instanceId, card.faceUp])).toEqual([
      [s.inst("option").instanceId, true],
    ]);
  });

  it("stays revealed as the bottom security card and is otherwise an ordinary security card (Q3964)", async () => {
    const s = await playOptionFromHand("EX8-069", {
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

  it("is checked while left revealed and trashed like any checked security card (Q3965)", async () => {
    const s = await playOptionFromHand("EX8-069", { security: ["BT1-013"] });
    const optionId = s.inst("option").instanceId;
    expect(s.state.players[0]!.security.map((card) => [card.instanceId, card.faceUp])).toEqual([[optionId, true]]);

    await seatOneAttacksPlayer(s);

    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "securityRevealed", seat: 0, revealedCardId: "EX8-069" }),
    );
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(optionId);
  });

  it("triggers its [Security] effect when checked face up (Q3966)", async () => {
    const s = await playOptionFromHand("EX8-069", {
      hand: [{ card: traitDigimonFor["EX8-069"], as: "traitDigimon" }],
      security: ["BT1-013"],
    });
    const traitDigimonId = s.inst("traitDigimon").instanceId;
    expect(s.state.players[0]!.security[0]!.faceUp).toBe(true);

    await seatOneAttacksPlayer(s);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(traitDigimonId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(traitDigimonId);
  });

  it("turns face down with the rest of the security stack when it is shuffled (Q3967)", async () => {
    const s = await playOptionFromHand("EX8-069", {
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

  it("keeps the Security A. +1 and DP from an activated <Alliance> after the Option leaves security (Q3968)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX7-015", as: "attacker", dp: 7000 },
          { card: "BT1-010", as: "ally", dp: 3000 },
        ],
        security: [{ card: "EX8-069", as: "source", faceUp: true }],
      },
      1: { battleArea: [{ card: "BT1-072", as: "blocker" }], security: ["BT1-009", "BT1-009", "BT1-009"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("ally").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).blockingSeat() === 1);
    expect(s.perm("attacker").currentDP).toBe(10000);
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(1);

    await advance(s.engine).verb.trashFromSecurity(0, 1);
    await advance(s.engine).recompute();
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("source").instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("attacker"), "Alliance")).toBe(false);
    expect(s.perm("attacker").currentDP).toBe(10000);
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(1);

    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
