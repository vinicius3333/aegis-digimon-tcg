import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-031.js";
import "./index.js";

describe("BT17-031", () => {
  it("reveals three and adds a Kyubimon/Taomon/Sakuyamon or Rika Nonaka option", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          rest: "deckBottom",
          add: [
            { count: 1, to: "hand" },
            { count: 1, to: "hand", orFilters: [{ kind: ["Option"], playCostGte: 2 }] },
          ],
        },
      ],
    });
  });

  it("gives an opposing Digimon Security Attack -1 after a cost 2+ option as inherited", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOptionUsed",
          fireCondition: { kind: "triggerOptionCostAtLeast", value: 2 },
          actions: [
            {
              kind: "GainKeyword",
              keyword: { keyword: "SecurityAttack", amount: -1 },
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
      ],
    });
  });

  it("adds one named Digimon and Rika while bottom-decking the remainder", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-031", as: "renamon" }],
          deck: [
            { card: "BT17-032", as: "kyubimon" },
            { card: "BT17-085", as: "rika" },
            { card: "BT1-029", as: "remainder" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    const kyubimonId = s.inst("kyubimon").instanceId;
    const rikaId = s.inst("rika").instanceId;
    const remainderId = s.inst("remainder").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("renamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === rikaId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([kyubimonId, rikaId]),
    );
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(remainderId);
  });

  it("reduces Security Attack only for an option use cost of at least 2", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-032", under: ["BT17-031"], as: "host" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenOptionUsed", { usedOptionCost: 1, subjectPermanentId: "cheap-option" });
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);

    await advance(s.engine).fireSubTrigger("whenOptionUsed", {
      usedOptionCost: 2,
      subjectPermanentId: "qualifying-option",
    });
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
  });

  it("triggers after a real cost-2 Option is used from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-032", under: ["BT17-031"], as: "host" }],
          hand: [{ card: "BT1-102", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-102"));

    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
  });

  it("adds a cost-2 Option through the second slot's alternative filter", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-031", as: "renamon" }],
          deck: [
            { card: "BT17-032", as: "kyubimon" },
            { card: "BT1-102", as: "option" },
            { card: "BT1-029", as: "remainder" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    const kyubimonId = s.inst("kyubimon").instanceId;
    const optionId = s.inst("option").instanceId;
    const remainderId = s.inst("remainder").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("renamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === optionId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([kyubimonId, optionId]),
    );
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(remainderId);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === remainderId)).toBe(false);
  });

  it("adds nothing and bottom-decks all three when none of the revealed cards qualify", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-031", as: "renamon" }],
          deck: [
            { card: "BT1-029", as: "r1" },
            { card: "BT1-010", as: "r2" },
            { card: "BT1-011", as: "r3" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    const renamonId = s.inst("renamon").instanceId;
    const restIds = [s.inst("r1").instanceId, s.inst("r2").instanceId, s.inst("r3").instanceId];

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: renamonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === renamonId));

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(expect.arrayContaining(restIds));
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses a second grant in the same turn and targets exactly one of two opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-032", under: ["BT17-031"], as: "host" }],
          hand: [
            { card: "BT1-102", as: "option1" },
            { card: "BT1-102", as: "option2" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "t1" },
            { card: "BT1-010", as: "t2" },
          ],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    const seenAmount = () =>
      observe(s.engine).keywordAmount(s.perm("t1"), "SecurityAttack") +
      observe(s.engine).keywordAmount(s.perm("t2"), "SecurityAttack");

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option1").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-102"));
    expect(seenAmount()).toBe(-1);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option2").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-102").length === 2);
    expect(seenAmount()).toBe(-1);
    expect(
      [
        observe(s.engine).keywordAmount(s.perm("t1"), "SecurityAttack"),
        observe(s.engine).keywordAmount(s.perm("t2"), "SecurityAttack"),
      ].filter((amount) => amount === -1),
    ).toHaveLength(1);
  });

  it("grants again on the next own turn after the once-per-turn use is spent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-032", under: ["BT17-031"], as: "host" }],
          hand: [
            { card: "BT1-102", as: "first" },
            { card: "BT1-102", as: "second" },
          ],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009", "BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }], deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-010"] },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-102"));
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);

    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 10;

    // Open seat 0's next Main for real so the second Option use fires through the production
    // play seam, then close it. The keyword granted last own turn ended at the opponent's turn.
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.turnSeat).toBe(0);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-102").length === 2);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);

    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });
});
