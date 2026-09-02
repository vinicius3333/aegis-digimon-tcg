import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT25_028 } from "./BT25-028.js";
import "../index.js";

describe("BT25-028 Dianamon", () => {
  it("applies the level-6 cost reduction only while an opponent has a level 6+ Digimon", () => {
    const effect = BT25_028.effects?.find((entry) => entry.trigger === "Static");
    expect(effect?.actions?.[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      sourceFilter: { isSelfRef: true },
    });
    const nested = effect?.actions?.[0] as { actions?: unknown[] } | undefined;
    expect(nested?.actions?.[0]).toMatchObject({
      kind: "Replacement",
      mode: "reduceCost",
      amount: 5,
      condition: {
        kind: "opponentHas",
        filter: { controllerDefault: "opponent", kind: ["Digimon"], levelComparison: { op: "gte", value: 6 } },
      },
    });
  });

  it("targets the snapshot of low-stack Digimon, then deletes one remaining unsuspended Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_028.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "Restrict",
        restriction: "suspend",
        duration: "untilOpponentTurnEnd",
        whileMatchesTargetFilter: true,
        target: { filter: { controller: "opponent", kind: ["Digimon"], digivolutionCardsAtMost: 1 }, count: "all" },
      });
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", kind: ["Digimon"], unsuspended: true }, count: 1 },
      });
    }
  });

  it("triggers the All Turns discard-and-DNA sequence for any Digimon being played or digivolving", () => {
    const effect = BT25_028.effects?.find((entry) => entry.trigger === "AllTurns");
    expect(effect?.frequency).toBe("OncePerTurn");
    expect(effect?.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ event: "whenPlayed", sourceFilter: { controllerDefault: "any", kind: ["Digimon"] } }),
        expect.objectContaining({
          event: "whenAnyDigivolves",
          sourceFilter: { controllerDefault: "any", kind: ["Digimon"] },
        }),
        expect.objectContaining({ event: "whenPlayed" }),
        expect.objectContaining({ event: "whenAnyDigivolves" }),
      ]),
    );
    for (const watcher of effect?.actions?.filter((action) => action.kind === "SubTrigger") ?? []) {
      expect(watcher.actions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ kind: "TrashDigivolution", amount: 4, scope: "acrossDigimon", optional: true }),
          expect.objectContaining({
            kind: "DnaDigivolve",
            materials: { filter: { controller: "mine", kind: ["Digimon"] }, count: 2 },
            into: {
              controllerDefault: "mine",
              zone: "hand",
              nameOrTrait: [{ tokens: ["GraceNovamon"], match: "name" }],
            },
            payCost: true,
            optional: true,
          }),
        ]),
      );
    }
  });

  it("reduces play cost only against an opponent level 6 or higher", async () => {
    const reduced = setupEngine({
      0: { hand: [{ card: "BT25-028", as: "diana" }] },
      1: { battleArea: [{ card: "BT1-043", as: "level6" }] },
    });
    reduced.state.memory = 7;
    expect(reduced.engine.applyIntent(0, { type: "playCard", instanceId: reduced.inst("diana").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => reduced.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-028"));
    expect(reduced.state.memory).toBe(0);

    const below = setupEngine({
      0: { hand: [{ card: "BT25-028", as: "diana" }] },
      1: { battleArea: [{ card: "BT25-017", as: "level5" }] },
    });
    below.state.memory = 7;
    expect(below.engine.applyIntent(0, { type: "playCard", instanceId: below.inst("diana").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => below.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-028"));
    expect(below.state.memory).toBe(-5);
  });

  it("keeps the low-stack lock live for entrants, releases it at 2 sources, and expires at turn end", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT25-028", as: "diana" }] },
        1: {
          battleArea: [{ card: "BT1-009", as: "initial", suspended: true }],
          hand: [
            { card: "BT1-014", as: "level4" },
            { card: "BT1-020", as: "level5" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("diana").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-028"));

    const entrant = s.putOnBoard(1, { card: "BT1-009", as: "entrant" });
    await s.ready();
    await advance(s.engine).verb.suspend([entrant.permanentId]);
    // KB Q6294: a Digimon entering after resolution is affected while it has at most 1 source.
    expect(entrant.isSuspended).toBe(false);

    const initial = s.perm("initial");
    await advance(s.engine).verb.unsuspend([initial.permanentId]);
    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: initial.permanentId,
        instanceId: s.inst("level4").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => initial.topCard.cardId === "BT1-014");
    await advance(s.engine).verb.suspend([initial.permanentId]);
    expect(initial.isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: initial.permanentId,
        instanceId: s.inst("level5").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => initial.topCard.cardId === "BT1-020");
    await advance(s.engine).verb.suspend([initial.permanentId]);
    // KB Q6295: after two legal evolutions, the Digimon can suspend with 2 sources.
    expect(initial.isSuspended).toBe(true);

    const stacked = s.putOnBoard(1, {
      card: "BT1-009",
      as: "stacked",
      under: ["BT1-009", "BT1-009"],
    });
    await s.ready();
    await advance(s.engine).verb.suspend([stacked.permanentId]);
    expect(stacked.isSuspended).toBe(true);

    advance(s.engine).ledgers.continuous.sweep(s.state, "opponentTurnEnd", 1);
    await advance(s.engine).verb.suspend([entrant.permanentId]);
    expect(entrant.isSuspended).toBe(true);
  });

  it("trashes four opponent digivolution cards and then DNA digivolves into GraceNovamon on a play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-028", as: "diana" },
            { card: "BT1-025", as: "redPartner" },
          ],
          hand: [
            { card: "BT25-103", as: "grace" },
            { card: "BT1-009", as: "played" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim", under: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    const victimStackIds = s.perm("victim").stack.map((card) => card.instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-103") &&
        s.state.players[1]!.trash.length >= victimStackIds.length,
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining(victimStackIds));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-103")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT25-103")).toBe(false);
  });

  it("triggers the All Turns watcher when Dianamon itself is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-025", as: "redPartner" }],
          hand: [{ card: "BT25-028", as: "diana" }],
        },
        1: {
          battleArea: [
            {
              card: "BT1-009",
              as: "victim",
              suspended: true,
              under: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("diana").instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-028") &&
        s.perm("victim").stack.length === 0,
    );
    expect(s.perm("victim").stack).toHaveLength(0);
  });

  it("fires the same discard watcher when any Digimon digivolves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-028", as: "diana" }],
          hand: [{ card: "BT1-009", as: "evolution" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim", under: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const host = s.putOnBoard(0, { card: "BT1-001", as: "host" });
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: host.permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("victim").stack.length === 0);
    expect(s.perm("victim").stack).toHaveLength(0);
  });

  it("is once per turn across a play and a later digivolution event", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-028", as: "diana" }],
          hand: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-009", as: "second" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim", under: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"] }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT1-009"));
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "BT1-009").length === 2);
    expect(s.perm("victim").stack).toHaveLength(4);
  });

  it("inherited When Attacking prevents one opponent Digimon from suspending", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker", under: ["BT25-028"] }] },
        1: { security: ["BT1-001", "BT1-001"], battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    await advance(s.engine).verb.suspend([s.perm("target").permanentId]);
    expect(s.perm("target").isSuspended).toBe(false);
  });
});
