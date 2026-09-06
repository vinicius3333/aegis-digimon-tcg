import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT25_032 } from "./BT25-032.js";
import "../index.js";

describe("BT25-032 Liollmon", () => {
  it("reveals three and adds one card from each required trait pool", () => {
    const effect = BT25_032.effects?.find((entry) => entry.trigger === "OnPlay");
    expect(effect?.actions?.[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
    const revealAdd = effect?.actions?.[0] as { add?: unknown } | undefined;
    expect(revealAdd?.add).toEqual([
      expect.objectContaining({
        count: 1,
        to: "hand",
        filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }] },
      }),
      expect.objectContaining({
        count: 1,
        to: "hand",
        filter: {
          controllerDefault: "mine",
          colors: ["Yellow"],
          nameOrTrait: [{ tokens: ["BEATBREAK"], match: "trait" }],
        },
      }),
    ]);
  });

  it("keeps inherited Barrier", () => {
    expect(BT25_032.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Static",
          isInherited: true,
          keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }],
        }),
      ]),
    );
  });

  it("naturally plays and takes distinct cards for the Glowing Dawn and yellow BEATBREAK slots", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-032", as: "liollmon" }],
          deck: [
            { card: "BT25-035", as: "first" },
            { card: "BT25-032", as: "second" },
            { card: "BT25-046", as: "wrongColor" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("first").instanceId, s.inst("second").instanceId);
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("liollmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("first").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("first").instanceId, s.inst("second").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("wrongColor").instanceId]);
    expect(s.state.memory).toBe(0);
  });

  it("uses the printed off-color Lv.2 Glowing Dawn alternate evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-003", as: "base" }],
          hand: [{ card: "BT25-032", as: "liollmon" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoChooseOption: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("liollmon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT25-032");
    expect(s.perm("base").topCard?.cardId).toBe("BT25-032");
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("rejects a same-level non-Glowing-Dawn base for the alternate evolution", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-002", as: "wrongBase" }], hand: [{ card: "BT25-032", as: "liollmon" }] },
    });
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wrongBase").permanentId,
        instanceId: s.inst("liollmon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("liollmon").instanceId);
  });

  it("selects a Glowing Dawn card and a yellow BEATBREAK card from separate branches", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-032", as: "liollmon" }],
          deck: [
            { card: "BT25-046", as: "greenBoth" },
            { card: "BT25-079", as: "purpleBeatbreak" },
            { card: "BT1-009", as: "miss" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("liollmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("greenBoth").instanceId));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT25-046"]));
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT25-079", "BT1-009"]);
  });

  it("does not take a non-yellow BEATBREAK card for the second slot", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT25-032", as: "liollmon" }], deck: ["BT25-079", "BT1-009", "BT1-010"] } },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const beforeEvents = s.events.length;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("liollmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.length > beforeEvents);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT25-079", "BT1-009", "BT1-010"]);
  });

  it("rejects a yellow card without the BEATBREAK trait", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT25-032", as: "liollmon" }], deck: ["BT1-051", "BT1-009", "BT1-010"] } },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const beforeEvents = s.events.length;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("liollmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.length > beforeEvents);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-051", "BT1-009", "BT1-010"]);
  });

  it("does not count one overlapping card twice when only one matching card is revealed", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT25-032", as: "liollmon" }], deck: ["BT25-035", "BT1-009", "BT1-010"] } },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const beforeEvents = s.events.length;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("liollmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.length > beforeEvents);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT25-035"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
  });

  it("exposes inherited Barrier and accepts payment through a public battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-051", as: "host", under: ["BT25-032"], dp: 5000, suspended: true }],
        security: ["BT1-001"],
      },
      1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 6000 }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(
      s.engine.applyIntent(0, { type: "respondBarrier", permanentId: s.perm("host").permanentId, accept: true }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("refuses inherited Barrier and permits deletion", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-051", as: "host", under: ["BT25-032"], dp: 5000, suspended: true }],
        security: ["BT1-001"],
      },
      1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 6000 }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(
      s.engine.applyIntent(0, { type: "respondBarrier", permanentId: s.perm("host").permanentId, accept: false }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("cannot pay inherited Barrier with no security cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-051", as: "host", under: ["BT25-032"], dp: 5000, suspended: true }] },
      1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 6000 }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.events.some((event) => event.kind === "barrierPrompt")).toBe(false);
  });
});
