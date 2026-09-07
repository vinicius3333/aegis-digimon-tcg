import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-049.js";
import "../index.js";

describe("BT21-049 Woodmon", () => {
  it("preserves the WG alternate Digivolution and inherited Piercing", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["WG"], cost: 2, isAlternate: true }]);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        isInherited: true,
        keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }],
      }),
    );
  });

  it("optionally suspends one Digimon on play and when digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions).toEqual([
        {
          kind: "Suspend",
          target: { filter: { controllerDefault: "any", kind: ["Digimon"] }, count: 1 },
          optional: true,
        },
      ]);
    }
  });

  it("once per turn suspends an opposing Digimon when an opposing Digimon is played while this is suspended", () => {
    const allTurns = compiled.effects.find((effect) => effect.trigger === "AllTurns");
    expect(allTurns).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn" });
    expect(allTurns?.actions).toEqual([
      {
        kind: "SubTrigger",
        event: "whenPlayed",
        sourceFilter: { controller: "opponent", kind: ["Digimon"] },
        actions: [
          {
            kind: "Suspend",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            condition: { kind: "selfIsSuspended", raw: "this Digimon is suspended" },
          },
        ],
      },
    ]);
  });

  it("enters through the public play intent with its optional On Play effect registered", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      { 0: { hand: [{ card: "BT21-049", as: "woodmon" }] }, 1: { battleArea: [{ card: "BT1-009", as: "target" }] } },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").topCard.instanceId);
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("woodmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("woodmon").instanceId) &&
        s.perm("target").isSuspended,
    );
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("Q4554: On Play may suspend one of your own Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT21-049", as: "woodmon" }],
          battleArea: [{ card: "BT1-009", as: "ownTarget" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("ownTarget").topCard.instanceId);
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("woodmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ownTarget").isSuspended);
    expect(s.perm("ownTarget").isSuspended).toBe(true);
    expect(s.perm("woodmon").topCard.cardId).toBe("BT21-049");
  });

  it("retains complete compiled coverage and Piercing as a keyword surface", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT21-049", as: "woodmon" }] } });
    await s.ready();
    expect(s.perm("woodmon").topCard?.cardId).toBe("BT21-049");
  });

  it("publicly carries inherited Piercing through Woodmon into Cherrymon combat", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-048", as: "base" }],
          hand: [
            { card: "BT21-049", as: "woodmon" },
            { card: "BT21-050", as: "cherrymon" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "target", suspended: true }],
          security: [{ card: "BT1-010", as: "security" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("woodmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT21-049");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("cherrymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT21-050");
    expect(s.perm("base").topCard.cardId).toBe("BT21-050");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "permanent", permanentId: targetId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved") && !observe(s.engine).isAttacking());
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(false);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.perm("base").topCard.cardId).toBe("BT21-050");
  });

  it("Q4553 triggers after Dokugumon suspends Woodmon during the opponent's play", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-049", as: "woodmon" }] },
        1: {
          battleArea: [{ card: "BT1-009", as: "target" }],
          hand: [
            { card: "P-163", as: "dokugumon" },
            { card: "BT1-010", as: "secondPlayed" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("woodmon").topCard.instanceId, s.perm("target").topCard.instanceId);
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("dokugumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("woodmon").isSuspended && s.perm("target").isSuspended);

    expect(s.perm("woodmon").isSuspended).toBe(true);
    expect(s.perm("target").isSuspended).toBe(true);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("secondPlayed").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-010"));
    expect(s.perm("secondPlayed").isSuspended).toBe(false);
  });

  it("publicly declines the optional On Play suspension and preserves the target", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT21-049", as: "woodmon" }] }, 1: { battleArea: [{ card: "BT1-009", as: "target" }] } },
      { autoDeclineOptional: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("woodmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-049"));
    expect(s.perm("target").isSuspended).toBe(false);
  });

  it("publicly suspends a Digimon through the alternate WG evolution", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-048", as: "base" }], hand: [{ card: "BT21-049", as: "woodmon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").topCard.instanceId);
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("woodmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT21-049" && s.perm("target").isSuspended);
    expect(s.state.memory).toBe(1);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("does not suspend an opposing Digimon after a play while Woodmon is unsuspended", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-049", as: "woodmon" }] },
        1: {
          battleArea: [{ card: "BT1-009", as: "target" }],
          hand: [{ card: "BT1-010", as: "played" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-010"));

    expect(s.perm("target").isSuspended).toBe(false);
  });

  it("alternate-digivolves from a level-3 WG Digimon for 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-048", as: "mushroomon" }],
        hand: [{ card: "BT21-049", as: "woodmon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("mushroomon").permanentId,
        instanceId: s.inst("woodmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("mushroomon").topCard.instanceId === s.inst("woodmon").instanceId);
    expect(s.state.memory).toBe(1);
  });
});
