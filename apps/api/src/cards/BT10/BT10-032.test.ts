import { describe, expect, it } from "vitest";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../ST1/ST1-13.js";
import "../ST1/ST1-14.js";
import "../BT1/BT1-102.js";
import "../BT2/BT2-099.js";
import "../BT17/BT17-035.js";
import "../BT24/index.js";
import "./BT10-041.js";
import { compiled } from "./BT10-032.js";

describe("BT10-032 Renamon", () => {
  it("encodes both reveal buckets and an inherited owner-turn cost-2 once-per-turn watcher", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "OnPlay",
        actions: [
          expect.objectContaining({
            kind: "RevealAdd",
            revealCount: 4,
            add: [
              expect.objectContaining({ count: 1, filter: expect.objectContaining({ kind: ["Option"] }) }),
              expect.objectContaining({
                count: 1,
                filter: expect.objectContaining({ kind: ["Tamer"], colors: ["Yellow"] }),
              }),
            ],
            rest: "deckBottom",
          }),
        ],
      }),
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          expect.objectContaining({
            kind: "SubTrigger",
            event: "whenOptionUsed",
            fireCondition: expect.objectContaining({ kind: "triggerOptionCostAtLeast", value: 2 }),
          }),
        ],
      }),
    ]);
  });

  it("adds a Plug-In Option and yellow Tamer from four revealed cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT10-032", as: "source" }],
          deck: [{ card: "BT10-105", as: "plugin" }, { card: "BT10-089", as: "tamer" }, "BT10-029", "BT10-030"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.some((c) => c.instanceId === s.inst("plugin").instanceId));
    expect(player.hand.some((c) => c.instanceId === s.inst("tamer").instanceId)).toBe(true);
    expect(player.deck).toHaveLength(2);
  });

  it("rejects reveal near-matches and bottoms the exact remainder in chosen order", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT10-032", as: "source" }],
          deck: [
            { card: "BT10-105", as: "plugin" },
            { card: "ST1-14", as: "plainOption" },
            { card: "BT10-089", as: "yellowTamer" },
            { card: "BT1-085", as: "redTamer" },
          ],
        },
      },
      { autoOrderCards: false },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const pluginPick = s.decisions.at(-1)!.req;
    expect(pluginPick.options?.candidateInstanceIds).toEqual([s.inst("plugin").instanceId]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pluginPick.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("plugin").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.decisionId !== pluginPick.decisionId);
    const tamerPick = s.decisions.at(-1)!.req;
    expect(tamerPick.options?.candidateInstanceIds).toEqual([s.inst("yellowTamer").instanceId]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: tamerPick.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("yellowTamer").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const ordering = s.decisions.at(-1)!.req;
    const bottomOrder = [s.inst("redTamer").instanceId, s.inst("plainOption").instanceId];
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ordering.decisionId,
        response: { kind: "orderCards", order: bottomOrder },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(bottomOrder);
  });

  it("gives one opposing Digimon -2000 DP after a cost 2 Option is used, once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["BT10-032"] }],
          hand: [
            { card: "ST1-14", as: "firstOption" },
            { card: "ST1-14", as: "secondOption" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 5000 }] },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("firstOption").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);
    expect(s.perm("target").currentDP).toBe(3000);

    // Resolve the alias ONCE: a card in flight between zones is momentarily in none of
    // them, and `inst` throws when it polls at exactly that moment.
    const secondOptionId = s.inst("secondOption").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: secondOptionId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === secondOptionId), 5000);
    expect(s.perm("target").currentDP).toBe(3000);
  });

  it("resolves the Option and offers exactly one opposing target afterward (Q1954)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["BT10-032"] }],
        hand: [{ card: "ST1-14", as: "option" }],
      },
      1: {
        battleArea: [
          { card: "BT1-084", as: "first" },
          { card: "BT1-084", as: "second" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(optionId);
    const decision = s.state.pendingDecision!;
    expect(s.decisions.at(-1)!.req.options?.candidateInstanceIds).toEqual([
      s.perm("first").permanentId,
      s.perm("second").permanentId,
    ]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("second").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("second").currentDP === 13000);
    expect(s.perm("first").currentDP).toBe(15000);
    expect(s.perm("second").currentDP).toBe(13000);
  });

  it("does not react to a real Security Option activation (Q1955)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-041", as: "host", under: ["BT10-032"] }],
        security: [{ card: "ST1-14", as: "securityOption" }],
      },
      1: { battleArea: [{ card: "BT1-084", as: "target" }] },
    });
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));

    expect(s.perm("target").currentDP).toBe(15000);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not trigger for an Option with a use cost below 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["BT10-032"] }],
          hand: [{ card: "ST1-13", as: "cheapOption" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 5000 }] },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("cheapOption").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cheapOption").instanceId));

    expect(s.perm("target").currentDP).toBe(5000);
  });

  it("uses Glorious Burst's card-level adjusted use cost for Q1956", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-041", as: "host", under: ["BT10-032"] }],
          hand: [{ card: "BT2-099", as: "burst" }],
        },
        1: { battleArea: [{ card: "BT1-084", as: "target" }] },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    // Q1956 is about the existing card-level adjusted-cost seam. Arm that production
    // ledger directly so this test remains scoped to Option-use event propagation;
    // BT2-099's legacy self-reducer is finalized later and is independently covered.
    advance(s.engine).ledgers.modifiers.addPlayCostAdjustment(({ def }) => def.cardId === "BT2-099", -8, false);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("burst").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT2-099"));

    // Printed 9 becomes use cost 1. Glorious Burst's Main leaves 3000 DP; Renamon
    // must not trigger, or its subsequent -2000 would leave only 1000 DP.
    expect(s.state.memory).toBe(9);
    expect(s.perm("target").currentDP).toBe(3000);
  });

  it("triggers through Taomon's real reduced-payment Option use (Q1957)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "host", under: ["BT10-032"] },
            { card: "BT17-035", as: "taomon" },
          ],
          hand: [{ card: "BT1-102", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-084", as: "target" }] },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("taomon"));
    await settle(() => s.perm("target").currentDP === 13000);

    expect(s.state.memory).toBe(0); // Taomon reduced the amount paid from 2 to 0.
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
    expect(s.perm("target").currentDP).toBe(13000);
  });

  it("triggers through a real effect-driven no-cost Option use (Q5450)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "host", under: ["BT10-032"] },
            { card: "BT24-085", as: "tamer" },
          ],
          hand: [{ card: "BT24-092", as: "option" }],
        },
        1: { battleArea: [{ card: "BT11-111", as: "target" }] },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = -3;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("tamer"));
    await settle(() => s.perm("target").currentDP === 6000);

    expect(s.state.memory).toBe(-3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("option").instanceId);
    // Shock Plasma -6000, then Renamon -2000: printed use cost 3 is preserved despite free use.
    expect(s.perm("target").currentDP).toBe(6000);
  });

  it("keeps the inherited watcher scoped to its owner's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-041", as: "host", under: ["BT10-032"] },
            { card: "BT17-035", as: "taomon" },
          ],
          hand: [{ card: "ST1-14", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-084", as: "target" }] },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("taomon"));
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "ST1-14"));

    expect(s.perm("target").currentDP).toBe(15000);
  });

  it("expires the chosen -2000 modifier at the end of the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["BT10-032"] }],
          hand: [{ card: "ST1-14", as: "option" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-084", as: "target" }], deck: ["BT1-009"] },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 13000);
    await advance(s.engine).runTurn(0);

    expect(s.perm("target").currentDP).toBe(15000);
  });
});
