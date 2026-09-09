import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-033.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

async function runEndOfTurn(s: ReturnType<typeof setupEngine>): Promise<void> {
  s.state.isFirstPlayersFirstTurn = false;
  const turn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(0);
  advance(s.engine).endMainPhaseIfOpen(0);
  await turn;
}

describe("EX9-033", () => {
  it("free-plays a level-four Puppet from trash once at the end of a real turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-033", as: "source" }],
          deck: ["BT1-009", "BT1-009"],
          trash: ["BT22-032", "BT22-032"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await runEndOfTurn(s);
    await settle();
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX9-033", "BT22-032"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT22-032"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("chooses only one tied lowest-level Digimon and cannot repeat after another battle deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-033", as: "source" },
            { card: "BT1-071", as: "first" },
            { card: "BT1-071", as: "second" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-071", as: "victim", suspended: true, dp: 1000 },
            { card: "BT1-009", as: "lowA" },
            { card: "BT1-009", as: "lowB" },
            { card: "BT1-071", as: "nextVictim", suspended: true, dp: 1000 },
          ],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("first").permanentId,
        target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();
    const survivors = s.state.players[1]!.battleArea;
    expect(survivors).toHaveLength(2);
    expect(survivors.filter(({ topCard }) => topCard.cardId === "BT1-009")).toHaveLength(1);
    expect(survivors.some(({ permanentId }) => permanentId === s.perm("nextVictim").permanentId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("second").permanentId,
        target: { kind: "permanent", permanentId: s.perm("nextVictim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId).sort()).toEqual(["BT1-009", "BT1-071", "BT1-071"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("gives own Puppet Digimon Alliance and Blocker", () =>
    expect(
      compiled.effects?.find(
        (entry) => entry.trigger === "AllTurns" && entry.actions.some((action) => action.kind === "GainKeyword"),
      ),
    ).toMatchObject({
      actions: [
        { kind: "GainKeyword", keyword: { keyword: "Alliance" } },
        { kind: "GainKeyword", keyword: { keyword: "Blocker" } },
      ],
    }));
  it("once per turn plays a level 4-or-lower Puppet from trash at end of turn", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          target: { filter: { levelComparison: { op: "lte", value: 4 } } },
        },
      ],
    }));
  it("watches deletion of any other Digimon", () =>
    expect(
      compiled.effects?.find((entry) => entry.trigger === "AllTurns" && entry.frequency === "OncePerTurn"),
    ).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { controller: "any", excludeSelf: true, kind: ["Digimon"] },
        },
      ],
    }));

  it("grants both keywords to an own Puppet and not an opposing Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX9-033", as: "source" },
          { card: "EX9-024", as: "puppet" },
          { card: "TOKEN-Diaboromon", as: "token" },
          { card: "BT1-071", as: "ownNonPuppet" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "opponent" },
          { card: "EX9-024", as: "opponentPuppet" },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("puppet"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("puppet"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("token"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("token"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("ownNonPuppet"), "Alliance")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("opponent"), "Alliance")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("opponentPuppet"), "Alliance")).toBe(false);
  });

  it("deletes the opposing lowest-level Digimon when another Digimon is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-033", as: "source" },
            { card: "EX9-024", as: "other" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest" },
            { card: "EX9-032", as: "otherOpponent" },
          ],
        },
      },
      { autoOrderTriggers: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("other").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.every((p) => p.topCard.cardId !== "EX9-024"));
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT1-009")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "EX9-032")).toBe(true);
  });

  it("also triggers when an opposing Digimon is deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-033", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest" },
            { card: "EX9-032", as: "deleted" },
          ],
        },
      },
      { autoOrderTriggers: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("deleted").permanentId]);
    await settle(() => s.state.players[1]!.battleArea.every((p) => p.topCard.cardId !== "BT1-009"));
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT1-009")).toBe(false);
  });

  it("refuses the optional trash play and rejects Puppet level five", async () => {
    const declined = setupEngine(
      { 0: { battleArea: [{ card: "EX9-033", as: "source" }], trash: ["EX9-024"], deck: ["BT1-009"] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await runEndOfTurn(declined);
    await settle();
    expect(declined.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["EX9-024"]);

    const tooHigh = setupEngine(
      { 0: { battleArea: [{ card: "EX9-033", as: "source" }], trash: ["EX9-032"], deck: ["BT1-009"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await runEndOfTurn(tooHigh);
    await settle();
    expect(tooHigh.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["EX9-032"]);
  });

  it("plays a level-four-or-lower Puppet from trash at end of turn without cost", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX9-033", as: "source" }], trash: ["EX9-024"], deck: ["BT1-009"] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await runEndOfTurn(s);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX9-024"));
    expect(s.state.players[0]!.trash.some((c) => c.cardId === "EX9-024")).toBe(false);
  });
});
