import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-081.js";
import "../BT10/BT10-073.js";
import "../BT12/BT12-016.js";
import "../BT9/BT9-017.js";
import "../EX2/EX2-073.js";

describe("BT5-081 ChaosGallantmon", () => {
  it("may delete another own Digimon to delete an opposing level 5 when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-012", as: "base" },
            { card: "BT1-010", as: "cost" },
          ],
          hand: [{ card: "BT5-081", as: "evolving" }],
        },
        1: { battleArea: ["AD1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]?.battleArea.length === 0);

    expect(s.state.players[0]?.battleArea).toHaveLength(1);
    expect(s.perm("base").topCard.cardId).toBe("BT5-081");
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("cost").instanceId)).toBe(true);
  });

  it("may decline the When Digivolving deletion cost and leaves both targets unchanged", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-012", as: "base" },
            { card: "BT5-073", as: "cost" },
          ],
          hand: [{ card: "BT5-081", as: "evolving" }],
        },
        1: { battleArea: [{ card: "AD1-002", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT5-081");

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === s.perm("cost").permanentId)).toBe(
      true,
    );
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === s.perm("target").permanentId)).toBe(
      true,
    );
  });

  it("plays a purple level 3 after another own Digimon is deleted without activating its On Play effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-081", as: "chaos" },
            { card: "BT5-073", as: "deleted" },
            { card: "BT5-073", as: "secondDeleted" },
          ],
          trash: [
            { card: "BT10-073", as: "rookie" },
            { card: "BT10-073", as: "secondRookie" },
            { card: "BT5-075", as: "wrongLevel" },
            { card: "BT1-009", as: "wrongColor" },
          ],
          deck: ["BT10-073", "BT10-073", "BT10-073", "BT10-073"],
        },
        1: {
          battleArea: [{ card: "BT5-073", as: "opponentDeleted" }],
          trash: [{ card: "BT10-073", as: "opponentRookie" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const rookieId = s.inst("rookie").instanceId;
    await s.engine.recomputeContinuousEffects();

    await advance(s.engine).verb.deletePermanent([s.perm("opponentDeleted").permanentId], "byEffect");
    await settle();
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === rookieId)).toBe(true);
    expect(s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("opponentRookie").instanceId)).toBe(
      true,
    );
    await advance(s.engine).verb.deletePermanent([s.perm("deleted").permanentId], "byEffect");
    await settle(
      () => s.state.players[0]?.battleArea.some((permanent) => permanent.topCard?.instanceId === rookieId) === true,
    );

    expect(s.state.players[0]?.deck).toHaveLength(4);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("secondRookie").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("wrongLevel").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("wrongColor").instanceId)).toBe(
      true,
    );
    await advance(s.engine).verb.deletePermanent([s.perm("secondDeleted").permanentId], "byEffect");
    await settle();
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("secondRookie").instanceId)).toBe(
      true,
    );
  });

  it("may decline playing a qualifying purple level 3 after an own deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-081", as: "chaos" },
            { card: "BT5-073", as: "deleted" },
          ],
          trash: [{ card: "BT10-073", as: "rookie" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.engine.recomputeContinuousEffects();

    await advance(s.engine).verb.deletePermanent([s.perm("deleted").permanentId], "byEffect");
    await settle();

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("rookie").instanceId)).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("rookie").instanceId),
    ).toBe(false);
  });

  it("observes its own When Digivolving cost deletion after entering play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-080", as: "base" },
            { card: "BT5-073", as: "cost" },
          ],
          hand: [{ card: "BT5-081", as: "evolving" }],
          trash: [{ card: "BT10-073", as: "rookie" }],
          deck: ["BT10-073", "BT10-073", "BT10-073", "BT10-073"],
        },
        1: { battleArea: [{ card: "AD1-002", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("rookie").instanceId),
    );

    expect(s.perm("base").topCard.cardId).toBe("BT5-081");
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it("does not play from the deletion watcher during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-081", as: "chaos" },
            { card: "BT5-073", as: "deleted" },
          ],
          trash: [{ card: "BT10-073", as: "rookie" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    await advance(s.engine).verb.deletePermanent([s.perm("deleted").permanentId], "byEffect");
    await settle();

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("rookie").instanceId)).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("rookie").instanceId),
    ).toBe(false);
  });

  it("does not delete an opposing Digimon above level 5", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-012", as: "base" },
            { card: "BT5-073", as: "cost" },
          ],
          hand: [{ card: "BT5-081", as: "evolving" }],
        },
        1: { battleArea: [{ card: "BT5-081", as: "highLevel" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT5-081");
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === s.perm("cost").permanentId)).toBe(
      true,
    );
    expect(s.perm("highLevel")).toBeDefined();
  });
});

describe("BT5-081 ChaosGallantmon — KB Q&A rulings", () => {
  it("does not react to a purple Digimon deleted before ChaosGallantmon entered play (Q1380)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-073", as: "purpleDeleted" },
            { card: "BT5-073", as: "laterDeleted" },
          ],
          trash: [
            { card: "BT5-081", as: "chaos" },
            { card: "BT10-073", as: "rookie" },
          ],
          deck: ["BT10-073", "BT10-073", "BT10-073", "BT10-073"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const rookieId = s.inst("rookie").instanceId;
    const purpleDeletedId = s.perm("purpleDeleted").topCard.instanceId;
    const rookieOnField = (): boolean =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === rookieId);
    const verbs = advance(s.engine).verb;

    verbs.enterEffectResolution(0);
    try {
      await verbs.deletePermanent([s.perm("purpleDeleted").permanentId], "byEffect");
      await verbs.playInstances([s.inst("chaos").instanceId], "BT5-107");
    } finally {
      verbs.leaveEffectResolution();
    }
    await settle();

    // The deleted Pillomon is also a legal level 3 purple target in trash, so check that nothing was played at all.
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId).sort()).toEqual(["BT5-073", "BT5-081"]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([rookieId, purpleDeletedId]),
    );

    await verbs.deletePermanent([s.perm("laterDeleted").permanentId], "byEffect");
    await settle(rookieOnField);
    expect(rookieOnField()).toBe(true);
  });

  it("lets WarGrowlmon's no-deletion follow-up reach Gallantmon (X Antibody) but not ChaosGallantmon or level 7 Crimson Mode (Q2146)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-016", as: "war" }],
          hand: [
            { card: "BT5-081", as: "chaos" },
            { card: "EX2-073", as: "crimson" },
            { card: "BT9-017", as: "gallantmonX" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    const chaosId = s.inst("chaos").instanceId;
    const crimsonId = s.inst("crimson").instanceId;
    const gallantmonXId = s.inst("gallantmonX").instanceId;
    // The auto-selector would pick these first if the engine ever offered them.
    preferInstanceIds.push(chaosId, crimsonId);
    s.state.memory = 10;

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("war"));
    await settle(() => s.perm("war").topCard.cardId === "BT9-017");

    const offeredCandidates = s.decisions
      .filter(({ req }) => req.kind === "selectCards")
      .flatMap(({ req }) => req.options?.candidateInstanceIds ?? []);
    expect(offeredCandidates).not.toContain(chaosId);
    expect(offeredCandidates).not.toContain(crimsonId);
    expect(s.perm("war").topCard.instanceId).toBe(gallantmonXId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([chaosId, crimsonId]),
    );
  });
});
