import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-017.js";
import "./index.js";

describe("BT20-017 Jesmon", () => {
  it("encodes the complete token and keeps the attack inside the played-Digimon watcher", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "PlayToken",
            tokens: [
              {
                name: "Atho, René & Por",
                keywords: [
                  { keyword: "Reboot" },
                  { keyword: "Blocker" },
                  { keyword: "Decoy", colors: ["Red", "Black"] },
                ],
              },
            ],
            count: 1,
            payCost: false,
            optional: true,
          },
        ],
      });
    }
    expect(compiled.effects.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 8000 } },
                count: 1,
              },
            },
            { kind: "Attack", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 }, optional: true },
          ],
        },
      ],
    });
  });

  it("optionally plays the 6000-DP white token with all three printed keywords", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT20-017", as: "jesmon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("jesmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "TOKEN-AthoRenePor-Token"),
    );

    const token = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "TOKEN-AthoRenePor-Token")!;
    expect(token.currentDP).toBe(6000);
    expect(observe(s.engine).hasKeyword(token, "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(token, "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(token, "Decoy")).toBe(true);
  });

  it("can refuse the optional token on public play", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT20-017", as: "jesmon" }] } }, { autoDeclineOptional: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("jesmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT20-017"));
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("reaches Jesmon from a legal SaviorHuckmon stack through public evolution", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-014", as: "base" }], hand: [{ card: "BT20-017", as: "jesmon" }] },
        1: {
          battleArea: [
            { card: "BT20-014", dp: 8000, as: "boundary" },
            { card: "BT20-014", dp: 8001, as: "high" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("jesmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT20-017");
    expect(s.perm("base").topCard.cardId).toBe("BT20-017");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT20-014"]);
  });

  it("once per turn deletes an 8000-DP target after another Digimon is played, then may decline the attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-017", as: "jesmon" }],
          hand: [
            { card: "BT20-010", as: "firstPlay" },
            { card: "BT20-010", as: "secondPlay" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT20-014", dp: 8000, as: "boundary" },
            { card: "BT20-014", dp: 7000, as: "secondEligible" },
            { card: "BT20-017", dp: 8001, as: "tooLarge" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const boundaryId = s.perm("boundary").permanentId;
    const highId = s.perm("tooLarge").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstPlay").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === boundaryId));
    expect(s.perm("jesmon").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === highId)).toBe(true);
    expect(s.perm("tooLarge")).toBeDefined();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondPlay").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => false, 50);
    expect(s.perm("secondEligible")).toBeDefined();
  });

  it("accepts the watcher attack after deleting an 8000-DP target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-017", as: "jesmon" }],
          hand: [{ card: "BT20-010", as: "played" }],
          deck: ["BT20-047", "BT20-047"],
        },
        1: { battleArea: [{ card: "BT20-014", dp: 8000, as: "target" }], deck: ["BT20-047", "BT20-047"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle(() =>
      s.events.some((event) => event.kind === "attackDeclared" && event.attackerCardId === "BT20-017"),
    );
    expect(s.events.some((event) => event.kind === "attackDeclared" && event.attackerCardId === "BT20-017")).toBe(true);
  });

  it("resets the once-per-turn watcher after a real opponent turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-017", as: "jesmon" }],
          hand: [
            { card: "BT20-010", as: "first" },
            { card: "BT20-010", as: "second" },
          ],
          deck: ["BT20-047", "BT20-047", "BT20-047"],
        },
        1: {
          battleArea: [
            { card: "BT20-014", dp: 7000, as: "target" },
            { card: "BT20-014", dp: 7000, as: "target2" },
          ],
          deck: ["BT20-047", "BT20-047", "BT20-047"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await ownTurn;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await nextOwnTurn;
  });

  it("does not trigger from a Tamer play or an opponent Digimon play", async () => {
    const tamer = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-017", as: "jesmon" }], hand: [{ card: "BT20-090", as: "tamer" }] },
        1: { battleArea: [{ card: "BT20-014", dp: 8000, as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    tamer.state.memory = 3;
    await tamer.ready();
    expect(tamer.engine.applyIntent(0, { type: "playCard", instanceId: tamer.inst("tamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => tamer.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "BT20-090"));
    expect(tamer.state.players[1]!.battleArea.some((perm) => perm.topCard.cardId === "BT20-014")).toBe(true);

    const opponent = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-017", as: "jesmon" }] },
        1: { hand: [{ card: "BT20-010", as: "played" }], battleArea: [{ card: "BT20-014", dp: 8000, as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    opponent.state.turnSeat = 1;
    opponent.state.memory = 3;
    await opponent.ready();
    expect(
      opponent.engine.applyIntent(1, { type: "playCard", instanceId: opponent.inst("played").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => opponent.state.players[1]!.battleArea.some((perm) => perm.topCard.cardId === "BT20-010"));
    expect(opponent.state.players[1]!.battleArea.some((perm) => perm.topCard.cardId === "BT20-014")).toBe(true);
  });

  it("accepts the token after paid public evolution on the legal Huckmon stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-014", suspended: true, under: ["BT20-008", "BT20-013"], as: "savior" }],
          hand: [{ card: "BT20-017", as: "jesmon" }],
          deck: ["BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("savior").permanentId,
        instanceId: s.inst("jesmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "TOKEN-AthoRenePor-Token") &&
        s.state.pendingDecision === undefined,
    );
    expect(s.perm("savior").topCard.cardId).toBe("BT20-017");
    expect(s.perm("savior").stack.map((card) => card.cardId)).toEqual(["BT20-008", "BT20-013", "BT20-014"]);
    const token = s.state.players[0]!.battleArea.find((perm) => perm.topCard.cardId === "TOKEN-AthoRenePor-Token")!;
    expect(token.baseDP).toBe(6000);
    expect(token.currentDP).toBe(8000); // Both legal inherited sources grant all own Digimon +1000.
    expect(s.state.memory).toBe(0);
  });
});
