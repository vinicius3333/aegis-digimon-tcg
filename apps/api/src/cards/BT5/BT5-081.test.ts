import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-081.js";
import "../BT10/BT10-073.js";

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
    // The normal digivolution bonus draws exactly one card; no additional draw/reveal occurs
    // when the watcher suppresses the played rookie's [On Play] effect.
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
