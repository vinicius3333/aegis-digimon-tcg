import { describe, expect, it } from "vitest";
import { PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX8-072.js";

describe("EX8-072", () => {
  it("registers the mandatory Main delete effect", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Main")?.actions).toHaveLength(2);
  });
  it("registers the [Trash][Your Turn] Barbamon (X Antibody) watcher", () => {
    expect(compiled.effects.find((entry) => entry.isFromTrash)).toMatchObject({ trigger: "YourTurn" });
  });
  it("registers the printed security activation", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Security")).toMatchObject({ isSecurity: true });
  });
  it("deletes an opponent level 7 or lower Digimon even when their hand has fewer than 5 cards", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX8-072", as: "option" }], battleArea: [{ card: "BT2-070", as: "purpleSource" }] },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => (s.state.players[1] as PlayerState).battleArea.length === 0);
    expect((s.state.players[1] as PlayerState).battleArea).toHaveLength(0);
  });

  it("recounts the hand after trashing before applying the level maximum", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX8-072", as: "option" }], battleArea: [{ card: "BT2-070", as: "purple-source" }] },
        1: {
          hand: [
            { card: "BT1-010", as: "hand-1" },
            { card: "BT1-010", as: "hand-2" },
            { card: "BT1-010", as: "hand-3" },
            { card: "BT1-010", as: "hand-4" },
            { card: "BT1-010", as: "hand-5" },
            { card: "BT1-010", as: "hand-6" },
          ],
          battleArea: [{ card: "AD1-004", as: "level-six" }],
        },
      },
      { autoSelectCards: true },
    );

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => (s.state.players[1] as PlayerState).battleArea.length === 0);

    expect((s.state.players[1] as PlayerState).hand).toHaveLength(5);
    expect((s.state.players[1] as PlayerState).trash).toHaveLength(2);
    expect((s.state.players[1] as PlayerState).battleArea).toHaveLength(0);
  });
  it("activates the Main deletion effect when revealed from security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
        1: { security: [{ card: "EX8-072", as: "option" }] },
      },
      { autoSelectCards: true },
    );
    const targetId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: targetId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => (s.state.players[0] as PlayerState).battleArea.length === 0);
    expect((s.state.players[0] as PlayerState).battleArea).toHaveLength(0);
  });
  it("returns itself from trash to deck bottom and activates Main after Barbamon X evolves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-059", as: "barbamon" }],
          hand: [{ card: "EX8-063", as: "barbamonX" }],
          trash: [{ card: "EX8-072", as: "option" }],
          deck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    s.state.memory = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("barbamon").permanentId,
        instanceId: s.inst("barbamonX").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.deck.some((card) => card.instanceId === optionId) &&
        s.state.players[1]!.battleArea.length === 0,
    );
    expect(s.state.players[0]!.deck.at(-1)!.instanceId).toBe(optionId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it.each([
    ["level 6 at the reduced ceiling", "AD1-004", true],
    ["level 7 above the reduced ceiling", "EX8-064", false],
  ] as const)("applies signed post-trash scaling to %s", async (_label, targetCardId, shouldDelete) => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX8-072", as: "option" }], battleArea: ["BT2-070"] },
        1: {
          hand: ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"],
          battleArea: [{ card: targetCardId, as: "target" }],
        },
      },
      { autoSelectCards: true },
    );
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.length === 4);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === targetCardId)).toBe(
      !shouldDelete,
    );
  });

  it("keeps level 8 above the printed ceiling even before signed reductions", () => {
    const deletion = compiled.effects
      .find((effect) => effect.trigger === "Main")
      ?.actions.find((action) => action.kind === "Delete");
    expect(deletion).toMatchObject({
      target: { filter: { levelComparison: { op: "lte", value: 7 } } },
      scaling: { levelCeilingAdd: -1 },
    });
  });

  it("may refuse the trash return cost and does not activate Main", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX6-059", as: "barbamon" }],
        hand: [{ card: "EX8-063", as: "barbamonX" }],
        trash: [{ card: "EX8-072", as: "option" }],
      },
      1: { battleArea: [{ card: "BT1-010", as: "target" }] },
    });
    const optionId = s.inst("option").instanceId;
    s.state.memory = 1;
    await s.ready();
    const evolution = Promise.resolve(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("barbamon").permanentId,
        instanceId: s.inst("barbamonX").instanceId,
        useAlternateCost: true,
      }),
    );
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await evolution;
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("does not arm the trash effect when the source is outside trash", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX6-059", as: "barbamon" }],
        hand: [
          { card: "EX8-063", as: "barbamonX" },
          { card: "EX8-072", as: "option" },
        ],
      },
      1: { battleArea: [{ card: "BT1-010", as: "target" }] },
    });
    s.state.memory = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("barbamon").permanentId,
        instanceId: s.inst("barbamonX").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("barbamon").topCard.cardId === "EX8-063");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX8-072")).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("aborts the pending trash trigger when its exact source leaves trash before resolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX6-059", as: "barbamon" }],
        hand: [{ card: "EX8-063", as: "barbamonX" }],
        trash: [{ card: "EX8-072", as: "option" }],
      },
      1: { battleArea: [{ card: "BT1-010", as: "target" }] },
    });
    const optionId = s.inst("option").instanceId;
    s.state.memory = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("barbamon").permanentId,
        instanceId: s.inst("barbamonX").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    await advance(s.engine).verb.returnToHand([optionId]);
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === optionId)).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
