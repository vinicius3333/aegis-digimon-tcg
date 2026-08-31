import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-031.js";

describe("BT18-031 Neemon", () => {
  it("mandatorily adds a Hybrid card and a yellow inherited-effect Tamer, then bottoms the rest", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          rest: "deckBottom",
          add: [
            { count: 1, to: "hand" },
            { count: 1, to: "hand" },
          ],
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "GainMemory", amount: 1 }] }],
    });
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT18-031", as: "neemon" }],
          deck: [
            { card: "BT12-009", as: "hybrid" },
            { card: "AD1-023", as: "inheritedTamer" },
            { card: "BT1-009", as: "nonmatch" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("neemon").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT12-009")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "AD1-023")).toBe(true);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("nonmatch").instanceId]);
    assertNoLoudGap(s);
  });

  it("adds every available match while rejecting a yellow Tamer without inherited effects", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT18-031", as: "neemon" }],
          deck: [
            { card: "BT12-009", as: "hybrid" },
            { card: "BT1-087", as: "plainYellowTamer" },
            { card: "BT1-009", as: "nonmatch" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("neemon").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("hybrid").instanceId]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("plainYellowTamer").instanceId,
      s.inst("nonmatch").instanceId,
    ]);
    assertNoLoudGap(s);
  });

  it("adds only one card for each reveal category when multiple Hybrid cards are shown", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT18-031", as: "neemon" }],
          deck: [
            { card: "BT12-009", as: "firstHybrid" },
            { card: "BT12-009", as: "secondHybrid" },
            { card: "AD1-023", as: "inheritedTamer" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("neemon").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("firstHybrid").instanceId,
      s.inst("inheritedTamer").instanceId,
    ]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("secondHybrid").instanceId,
    ]);
    assertNoLoudGap(s);
  });

  it("gains memory only for the first inherited-effect Tamer its controller plays during their turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-031", as: "neemon" }],
        hand: [
          { card: "BT17-086", as: "firstInheritedTamer" },
          { card: "BT17-086", as: "secondInheritedTamer" },
          { card: "BT1-087", as: "plainYellowTamer" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("plainYellowTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 6);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstInheritedTamer").instanceId })).toEqual(
      { ok: true },
    );
    await settle(() => s.state.memory === 4);
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondInheritedTamer").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);
  });

  it("does not gain memory for an inherited-effect Tamer played by the opponent", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT18-031", as: "neemon" }] },
      1: { hand: [{ card: "BT17-086", as: "opponentTamer" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(7);
    assertNoLoudGap(s);
  });
});
