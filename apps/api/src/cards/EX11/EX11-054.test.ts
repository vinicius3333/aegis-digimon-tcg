import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-054.js";

describe("EX11-054 Owen Dreadnought", () => {
  it("preserves the printed Tamer and complete compiled coverage", () => {
    expect(getCardDefinition("EX11-054")).toMatchObject({
      nameEn: "Owen Dreadnought",
      colors: ["Red"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["LIBERATOR"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("suspends to draw and boosts only a Progress Digimon when a Reptile is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-025", as: "progress" },
            { card: "EX11-054", as: "owen" },
          ],
          hand: [{ card: "BT1-010", as: "reptile" }],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("reptile").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("progress").currentDP === 10000, 600);

    expect(s.perm("owen").isSuspended).toBe(true);
    expect(s.perm("progress").currentDP).toBe(10000);
    assertNoLoudGap(s);
  });

  it("suspends to draw and boosts Progress when a Dragonkin is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-189", as: "progress" },
            { card: "EX11-054", as: "owen" },
          ],
          hand: [{ card: "BT21-035", as: "dragonkin" }],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dragonkin").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("progress").currentDP === 9000);

    expect(s.perm("owen").isSuspended).toBe(true);
    expect(s.perm("progress").currentDP).toBe(9000);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("rejects a near-trait Dragon and leaves the suspend reward untouched", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-189", as: "progress" },
            { card: "EX11-054", as: "owen" },
          ],
          hand: [{ card: "BT11-022", as: "dragon" }],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const handBefore = s.state.players[0]!.hand.length;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dragon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("dragon").topCard.cardId === "BT11-022");

    expect(s.perm("owen").isSuspended).toBe(false);
    expect(s.perm("progress").currentDP).toBe(6000);
    expect(s.state.players[0]!.hand).toHaveLength(handBefore - 1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("boosts exactly one of multiple Progress Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-025", as: "firstProgress" },
            { card: "P-189", as: "secondProgress" },
            { card: "EX11-054", as: "owen" },
          ],
          hand: [{ card: "BT21-035", as: "dragonkin" }],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dragonkin").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("owen").isSuspended);

    expect([s.perm("firstProgress").currentDP, s.perm("secondProgress").currentDP].sort((a, b) => a - b)).toEqual([
      6000, 10000,
    ]);
    expect(s.perm("firstProgress").currentDP + s.perm("secondProgress").currentDP).toBe(16000);
    assertNoLoudGap(s);
  });

  it("cannot pay the suspend cost again while Owen remains suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-189", as: "progress" },
            { card: "EX11-054", as: "owen" },
          ],
          hand: [
            { card: "BT21-035", as: "first" },
            { card: "BT21-035", as: "second" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("owen").isSuspended);
    expect(s.perm("progress").currentDP).toBe(9000);
    const decisionsBefore = s.decisions.length;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("progress").currentDP).toBe(9000);
    expect(s.decisions.length).toBe(decisionsBefore);
    assertNoLoudGap(s);
  });

  it("leaves Owen unsuspended and draws nothing when the suspend cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-025", as: "progress" },
            { card: "EX11-054", as: "owen" },
          ],
          hand: [{ card: "BT1-010", as: "reptile" }],
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const handBefore = s.state.players[0]!.hand.length;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("reptile").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => false, 60);

    expect(s.decisions.some((d) => d.req.kind === "optional")).toBe(true);
    expect(s.perm("owen").isSuspended).toBe(false);
    // The Reptile left the hand, and no <Draw 1> replaced it.
    expect(s.state.players[0]!.hand.length).toBe(handBefore - 1);
    assertNoLoudGap(s);
  });

  it("suspends to draw and boosts Progress when a Reptile digivolves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-025", as: "progress" },
            { card: "EX11-054", as: "owen" },
            { card: "BT1-010", as: "reptileBase" },
          ],
          hand: [{ card: "BT21-017", as: "reptileEvolution" }],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("reptileBase").permanentId,
        instanceId: s.inst("reptileEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("progress").currentDP === 10000);
    expect(s.perm("owen").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("sets memory to 3 at the start of its owner's turn when memory is 2 or less", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX11-054", as: "owen" }], deck: ["BT1-009", "BT1-013"] },
      1: { deck: ["BT1-009", "BT1-013"] },
    });
    s.state.memory = 2;
    const turn = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.memory).toBe(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turn;
    assertNoLoudGap(s);
  });

  it("does not reset memory when the start-of-turn threshold is exceeded", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX11-054", as: "owen" }], deck: ["BT1-009", "BT1-013"] },
      1: { deck: ["BT1-009", "BT1-013"] },
    });
    s.state.memory = 3;
    const turn = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.memory).toBe(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turn;
    assertNoLoudGap(s);
  });

  it("plays itself from security through a public security check", async () => {
    const s = setupEngine({
      0: { security: [{ card: "EX11-054", as: "owen", faceUp: false }] },
      1: { battleArea: [{ card: "BT1-080", as: "attacker", dp: 20_000 }], security: ["BT1-013"] },
    });
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX11-054"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX11-054")).toBe(true);
    assertNoLoudGap(s);
  });

  it("publishes exact Reptile/Dragonkin watchers and full compiled coverage", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    const allTurns = compiled.effects.find((effect) => effect.trigger === "AllTurns");
    expect(allTurns?.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ event: "whenPlayed", sourceFilter: expect.any(Object) }),
        expect.objectContaining({ event: "whenOneOfYoursDigivolves", sourceFilter: expect.any(Object) }),
      ]),
    );
    for (const action of allTurns?.actions ?? []) {
      if (action.kind !== "SubTrigger") continue;
      expect(action.sourceFilter).toMatchObject({
        controller: "mine",
        kind: ["Digimon"],
        nameOrTrait: [
          { match: "trait", tokens: ["Reptile"] },
          { match: "trait", tokens: ["Dragonkin"], orPrevious: true },
        ],
      });
      expect(action.actions).toMatchObject([
        { kind: "Draw", cost: { kind: "suspend", target: { isSelf: true } }, abortOnDecline: true },
        { kind: "ModifyDP", target: { filter: { keywords: ["Progress"] } }, amount: 3000 },
      ]);
    }
  });
});
