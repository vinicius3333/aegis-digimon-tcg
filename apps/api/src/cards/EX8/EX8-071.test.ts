import { describe, expect, it } from "vitest";
import { getCardDefinition, PlayerState } from "@aegis/shared";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";
import { compiled } from "./EX8-071.js";

describe("EX8-071", () => {
  it("matches the committed catalog identity and every printed clause", () => {
    expect(getCardDefinition("EX8-071")).toMatchObject({
      cardId: "EX8-071",
      nameEn: "Nightmare Soldiers",
      colors: ["Purple"],
      kinds: ["Option"],
      playCost: 2,
      dp: 0,
      evoCosts: [],
      forms: ["-"],
      attributes: ["-"],
      types: ["NSo"],
      effectText: expect.stringContaining("no face-up security cards"),
      securityEffectText: expect.stringContaining("level 5 or lower Digimon"),
    });
    expect(getCardDefinition("EX8-071")?.effectText).toContain("bottom security card");
    expect(getCardDefinition("EX8-071")?.inheritedEffectText).toBeUndefined();
  });
  it("waives its color requirement with no face-up security cards and grants all NSo Digimon Scapegoat", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      condition: { kind: "noFaceUpSecurity", raw: "you have no face-up security cards" },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Scapegoat" },
      target: {
        filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["NSo"], match: "trait" }] },
        count: "all",
      },
      duration: "permanent",
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
  it("contains the printed Security, static, All Turns, and Main effects", () =>
    expect(compiled.effects).toHaveLength(4));
  it("plays the exact level-5-or-lower NSo card from hand through Security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          security: [{ card: "EX8-071", as: "option", faceUp: true }],
          hand: [
            { card: "EX8-013", as: "nso" },
            { card: "EX8-062", as: "tooHigh" },
            { card: "BT1-010", as: "offTrait" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const instanceId = s.inst("nso").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      (s.state.players[1] as PlayerState).battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId),
    );

    expect(
      (s.state.players[1] as PlayerState).battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId),
    ).toBe(true);
    expect(
      (s.state.players[1] as PlayerState).hand.some((card) => card.instanceId === s.inst("tooHigh").instanceId),
    ).toBe(true);
    expect(
      (s.state.players[1] as PlayerState).hand.some((card) => card.instanceId === s.inst("offTrait").instanceId),
    ).toBe(true);
  });
  it("grants Scapegoat only to NSo and performs mandatory ordered Main placement", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX8-059", as: "nso" },
          { card: "BT1-010", as: "nonNso" },
        ],
        hand: [{ card: "EX8-071", as: "option" }],
        security: [
          { card: "EX8-071", as: "source", faceUp: true },
          { card: "BT1-010", as: "bottom" },
        ],
      },
    });
    const optionId = s.inst("option").instanceId;
    const topId = s.inst("source").instanceId;
    const bottomId = s.inst("bottom").instanceId;
    s.state.memory = 5;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("nso"), "Scapegoat")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("nonNso"), "Scapegoat")).toBe(false);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === optionId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === bottomId)).toBe(true);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([topId, optionId]);
    expect(s.state.players[0]!.security[1]!.faceUp).toBe(true);
  });
  it("does not waive the color requirement while security contains a face-up card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-010", as: "red" }],
        hand: [{ card: "EX8-071", as: "option" }],
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
  it("plays with no face-up security even when the option color is absent", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "EX8-071", as: "option" }], security: [] } });
    s.state.memory = 2;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(s.state.players[0]!.security[0]!.faceUp).toBe(true);
  });
  it("may decline the optional Security play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
        1: {
          security: [{ card: "EX8-071", as: "securityCard", faceUp: true }],
          hand: [{ card: "EX8-059", as: "nso" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const nsoId = s.inst("nso").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !s.state.pendingDecision);
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === nsoId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === nsoId)).toBe(false);
  });
  it("uses the granted Scapegoat to survive a losing battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-057", as: "nso", suspended: true },
            { card: "BT1-010", as: "sacrifice" },
          ],
          security: [{ card: "EX8-071", as: "source", faceUp: true }],
        },
        1: { battleArea: [{ card: "BT1-016", as: "attacker", dp: 20000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("nso").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("sacrifice").instanceId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("sacrifice").instanceId)).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("nso").permanentId),
    ).toBe(true);
  });
  it("may decline Scapegoat, allowing the NSo Digimon to be deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-057", as: "nso", suspended: true },
            { card: "BT1-010", as: "sacrifice" },
          ],
          security: [{ card: "EX8-071", as: "source", faceUp: true }],
        },
        1: { battleArea: [{ card: "BT1-016", as: "attacker", dp: 20000 }] },
      },
      {},
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("nso").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("nso").instanceId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("nso").instanceId)).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("sacrifice").permanentId),
    ).toBe(true);
  });
  it("lapses the face-up security grants when Nightmare Soldiers leaves security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX8-057", as: "nso" }],
        security: [{ card: "EX8-071", as: "source", faceUp: true }],
      },
      1: { battleArea: [{ card: "BT1-016", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("nso"), "Scapegoat")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(observe(s.engine).hasKeyword(s.perm("nso"), "Scapegoat")).toBe(false);
  });
});
