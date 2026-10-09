import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming, Phase, type Seat } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-006 Kakamon", () => {
  describe("GitHub #5351 public start-of-main decisions", () => {
    for (const seat of [0, 1] as const) {
      for (const memory of [-1, 2]) {
        it(`draws and gains memory at seat ${seat}, resolving relative gauge ${memory}`, async () => {
          const s = setupEngine({
            [seat]: {
              battleArea: [{ card: "EX12-006", as: "source" }],
              hand: [
                { card: "EX12-022", as: "cost" },
                { card: "BT1-009", as: "wrong" },
              ],
              deck: ["BT1-010", "BT1-011", "BT1-012"],
            },
          });
          s.state.turnSeat = seat;
          s.state.isFirstPlayersFirstTurn = false;
          s.state.memory = 2;
          const loop = s.engine.startTurnLoop();
          try {
            await advance(s.engine).waitForMainPhase(seat);
            const pending = s.state.pendingDecision!;
            const request = s.decisions.at(-1)!.req;
            expect(pending.kind).toBe("selectCards");
            expect(request.sourceCardId).toBe("EX12-006");
            expect(request.seat).toBe(seat);
            expect(request.options).toMatchObject({
              min: 0,
              max: 1,
              candidateInstanceIds: [s.inst("cost").instanceId],
            });
            // Supplemental gauge boundary: a negative opening gauge skips Main legally.
            // Set the sign only once the real start-of-main resolution is awaiting input.
            s.state.memory = memory;
            expect(
              s.engine.applyIntent(seat === 0 ? 1 : 0, {
                type: "respondDecision",
                decisionId: pending.decisionId,
                response: { kind: "selectCards", instanceIds: [s.inst("cost").instanceId] },
              }),
            ).toMatchObject({ ok: false });
            expect(
              s.engine.applyIntent(seat, {
                type: "respondDecision",
                decisionId: pending.decisionId,
                response: { kind: "selectCards", instanceIds: [s.inst("cost").instanceId] },
              }),
            ).toEqual({ ok: true });
            await advance(s.engine).waitForMainPhase(seat);
            expect(s.state.pendingDecision).toBeUndefined();
            expect(s.state.players[seat]!.trash.map((card) => card.instanceId)).toEqual([s.inst("cost").instanceId]);
            expect(s.state.players[seat]!.hand.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010", "BT1-011"]);
            expect(s.state.players[seat]!.deck.map((card) => card.cardId)).toEqual(["BT1-012"]);
            expect(s.state.memory).toBe(memory + 1);
            expect(s.events.filter((event) => event.kind === "memoryChanged" && event.reason === "gainMemory")).toEqual(
              [{ kind: "memoryChanged", from: memory, to: memory + 1, reason: "gainMemory" }],
            );
          } finally {
            s.engine.applyIntent(seat, { type: "surrender" });
            await loop;
          }
        });
      }

      for (const response of ["decline", "nonSW"] as const) {
        it(`gets neither benefit for public ${response} cost response at seat ${seat}`, async () => {
          const s = setupEngine({
            [seat]: {
              battleArea: ["EX12-006"],
              hand: [
                { card: "EX12-022", as: "cost" },
                { card: "BT1-009", as: "wrong" },
              ],
              deck: ["BT1-010", "BT1-011", "BT1-012"],
            },
          });
          s.state.turnSeat = seat;
          s.state.isFirstPlayersFirstTurn = false;
          s.state.memory = 2;
          const loop = s.engine.startTurnLoop();
          try {
            await advance(s.engine).waitForMainPhase(seat);
            expect(
              s.engine.applyIntent(seat, {
                type: "respondDecision",
                decisionId: s.state.pendingDecision!.decisionId,
                response: {
                  kind: "selectCards",
                  instanceIds: response === "decline" ? [] : [s.inst("wrong").instanceId],
                },
              }),
            ).toEqual({ ok: true });
            await advance(s.engine).waitForMainPhase(seat);
            expect(s.state.pendingDecision).toBeUndefined();
            expect(s.state.players[seat]!.trash).toHaveLength(0);
            expect(s.state.players[seat]!.hand.map((card) => card.cardId)).toEqual(["EX12-022", "BT1-009", "BT1-010"]);
            expect(s.state.players[seat]!.deck.map((card) => card.cardId)).toEqual(["BT1-011", "BT1-012"]);
            expect(s.state.memory).toBe(2);
          } finally {
            s.engine.applyIntent(seat, { type: "surrender" });
            await loop;
          }
        });
      }

      for (const blocker of ["BT3-077", "BT6-021"]) {
        for (const location of ["opponent", "mine", "breeding"] as const) {
          it(`draws with ${blocker} in ${location} at seat ${seat}; only opposing battle-area effects block memory`, async () => {
            const opponent: Seat = seat === 0 ? 1 : 0;
            const s = setupEngine({
              [seat]: {
                battleArea: ["EX12-006", ...(location === "mine" ? [blocker] : [])],
                hand: [{ card: "EX12-022", as: "cost" }],
                deck: ["BT1-010", "BT1-011", "BT1-012"],
              },
              [opponent]:
                location === "breeding"
                  ? { breeding: blocker }
                  : {
                      battleArea: location === "opponent" ? [blocker] : [],
                    },
            });
            s.state.turnSeat = seat;
            s.state.isFirstPlayersFirstTurn = false;
            s.state.memory = 2;
            const loop = s.engine.startTurnLoop();
            try {
              await advance(s.engine).waitForMainPhase(seat);
              expect(
                s.engine.applyIntent(seat, {
                  type: "respondDecision",
                  decisionId: s.state.pendingDecision!.decisionId,
                  response: { kind: "selectCards", instanceIds: [s.inst("cost").instanceId] },
                }),
              ).toEqual({ ok: true });
              await advance(s.engine).waitForMainPhase(seat);
              expect(s.state.pendingDecision).toBeUndefined();
              expect(s.state.players[seat]!.trash.map((card) => card.instanceId)).toEqual([s.inst("cost").instanceId]);
              expect(s.state.players[seat]!.hand.map((card) => card.cardId)).toEqual(["BT1-010", "BT1-011"]);
              expect(s.state.players[seat]!.deck.map((card) => card.cardId)).toEqual(["BT1-012"]);
              expect(s.state.memory).toBe(location === "opponent" ? 2 : 3);
              expect(
                s.events.filter((event) => event.kind === "memoryChanged" && event.reason === "gainMemory"),
              ).toHaveLength(location === "opponent" ? 0 : 1);
              // A normal play cost still moves the gauge: the restriction is effect-only.
              expect(
                s.engine.applyIntent(seat, {
                  type: "playCard",
                  instanceId: s.state.players[seat]!.hand[0]!.instanceId,
                }),
              ).toEqual({ ok: true });
              await settle(() =>
                s.events.some((event) => event.kind === "memoryChanged" && event.reason === "playCard"),
              );
              expect(s.events.filter((event) => event.kind === "memoryChanged" && event.reason === "playCard")).toEqual(
                [
                  {
                    kind: "memoryChanged",
                    from: location === "opponent" ? 2 : 3,
                    to: location === "opponent" ? -1 : 0,
                    reason: "playCard",
                  },
                ],
              );
            } finally {
              s.engine.applyIntent(seat, { type: "surrender" });
              await loop;
            }
          });
        }
      }

      for (const location of ["inherited", "breeding", "unpayable"] as const) {
        it(`offers no Kakamon draw/memory decision for ${location} at seat ${seat}`, async () => {
          const s = setupEngine({
            [seat]: {
              battleArea:
                location === "inherited"
                  ? [{ card: "BT1-014", under: ["EX12-006"] }]
                  : location === "unpayable"
                    ? ["EX12-006"]
                    : [],
              ...(location === "breeding" ? { breeding: "EX12-006" } : {}),
              hand: [location === "unpayable" ? "EX12-011" : "EX12-022"],
              deck: ["BT1-010", "BT1-011", "BT1-012"],
            },
          });
          s.state.turnSeat = seat;
          s.state.isFirstPlayersFirstTurn = false;
          s.state.memory = 2;
          const loop = s.engine.startTurnLoop();
          try {
            if (location === "breeding") {
              await settle(() => s.state.phase === Phase.Breeding);
            }
            const breedingResponse =
              location === "breeding" ? s.engine.applyIntent(seat, { type: "endPhase" }) : { ok: true };
            expect(breedingResponse).toEqual({ ok: true });
            await advance(s.engine).waitForMainPhase(seat);
            expect(s.state.pendingDecision).toBeUndefined();
            expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX12-006")).toHaveLength(0);
            expect(s.state.players[seat]!.trash).toHaveLength(0);
            expect(s.state.players[seat]!.hand.map((card) => card.cardId)).toEqual([
              location === "unpayable" ? "EX12-011" : "EX12-022",
              "BT1-010",
            ]);
            expect(s.state.players[seat]!.deck.map((card) => card.cardId)).toEqual(["BT1-011", "BT1-012"]);
            expect(s.state.memory).toBe(2);
          } finally {
            s.engine.applyIntent(seat, { type: "surrender" });
            await loop;
          }
        });
      }
    }
  });
  it("pays the start-of-main SW cost through the public turn loop", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-006", as: "source" }],
          hand: [
            { card: "EX12-022", as: "cost" },
            { card: "BT1-009", as: "unrelated" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 0;
    const costInstanceId = s.inst("cost").instanceId;
    const unrelatedInstanceId = s.inst("unrelated").instanceId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([costInstanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(unrelatedInstanceId);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-011"]);
    expect(s.state.memory).toBe(1);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("preserves the cost, deck, and memory when the public start-of-main effect is declined or unpayable", async () => {
    const declined = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-006", as: "source" }],
          hand: [{ card: "EX12-022", as: "cost" }],
          deck: ["BT1-010"],
        },
      },
      { autoDeclineOptional: true },
    );
    declined.state.memory = 0;
    const declinedCostId = declined.inst("cost").instanceId;
    const declinedLoop = declined.engine.startTurnLoop();
    await advance(declined.engine).waitForMainPhase(0);

    expect(declined.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([declinedCostId]);
    expect(declined.state.players[0]!.trash).toHaveLength(0);
    expect(declined.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(declined.state.memory).toBe(0);
    expect(declined.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await declinedLoop;

    const unpayable = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-006", as: "source" }],
          hand: [{ card: "BT1-009", as: "wrong" }],
          deck: ["BT1-010"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    unpayable.state.memory = 0;
    const wrongCardId = unpayable.inst("wrong").instanceId;
    const unpayableLoop = unpayable.engine.startTurnLoop();
    await advance(unpayable.engine).waitForMainPhase(0);

    expect(unpayable.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([wrongCardId]);
    expect(unpayable.state.players[0]!.trash).toHaveLength(0);
    expect(unpayable.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(unpayable.state.memory).toBe(0);
    expect(unpayable.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await unpayableLoop;
  });

  it("trashes an SW card, draws one, and gains one memory at the start of main phase", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-006", as: "source" }],
          hand: [{ card: "EX12-022", as: "cost" }],
          deck: ["BT1-009"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("source"));
    await settle(() => s.state.players[0]!.deck.length === 0);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("may decline the SW hand-trash cost and gets neither benefit", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-006", as: "source" }],
          hand: [{ card: "EX12-022", as: "cost" }],
          deck: ["BT1-010"],
        },
      },
      {},
    );
    s.state.memory = 0;

    const firing = advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("source"));
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await firing;

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.memory).toBe(0);
  });

  it("does not draw or gain memory when no SW hand card can pay the cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-006", as: "source" }],
          hand: ["BT1-009"],
          deck: ["BT1-010"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("source"));
    await settle();

    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.memory).toBe(0);
  });

  it("gives its host +2000 DP only on its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX12-006", as: "host", under: ["EX12-006"] },
          { card: "EX12-006", as: "other" },
        ],
      },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(4000);
    expect(s.perm("other").currentDP).toBe(2000);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(2000);

    s.state.turnSeat = 0;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(4000);
  });

  it("encodes one SW hand-trash cost shared by Draw 1 and Gain Memory 1", () => {
    const effect = registeredCompiledCards.get("EX12-006")!.effects[0]!;
    expect(effect.trigger).toBe("StartOfYourMainPhase");
    expect(effect.actions).toHaveLength(2);
    expect(effect.actions[0]).toMatchObject({
      kind: "Draw",
      amount: 1,
      optional: true,
      abortOnDecline: true,
      cost: {
        kind: "trash",
        target: {
          count: 1,
          filter: { zone: "hand", controller: "mine", nameOrTrait: [{ match: "trait", tokens: ["SW"] }] },
        },
      },
    });
    expect(effect.actions[1]).toEqual({ kind: "GainMemory", amount: 1 });
    expect(effect.isInherited).not.toBe(true);
    expect(registeredCompiledCards.get("EX12-006")!.effects[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }],
    });
  });

  it("does not activate its start-of-main effect during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-006", as: "source" }],
          hand: [{ card: "EX12-022", as: "cost" }],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("source"));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.memory).toBe(0);
  });

  it("digivolves for 0 by the standard red route or the level-2 Shambala alternate", async () => {
    expect(digivolutionRequirementsFor("EX12-006")).toEqual([
      { level: 2, traits: ["Shambala"], cost: 0, isAlternate: true },
    ]);

    for (const [baseCardId, useAlternateCost] of [
      ["BT1-001", false],
      ["EX12-004", true],
    ] as const) {
      const s = setupEngine({
        0: {
          breeding: { card: baseCardId, as: "base" },
          hand: [{ card: "EX12-006", as: "kakamon" }],
        },
      });
      s.state.memory = 0;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("kakamon").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "EX12-006");
      expect(s.state.memory).toBe(0);
    }
  });

  it("rejects alternate evolution over an off-color level-2 card without Shambala", () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT10-005", as: "base" },
        hand: [{ card: "EX12-006", as: "kakamon" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kakamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("does not accept a Shambala hand card that lacks the SW trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-006", as: "source" }],
          hand: [{ card: "EX12-011", as: "nearMatch" }],
          deck: ["BT1-010"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("source"));
    await settle();

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("nearMatch").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.memory).toBe(0);
  });
});
