import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT14-013.js";

describe("BT14-013", () => {
  it("registers the exact persistent reducer and name-or-trait inherited attack", () => {
    expect(compiled.effects[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { isSelfRef: true },
          into: {
            or: [
              { nameOrTrait: [{ tokens: ["Tyrannomon"], match: "name" }] },
              { nameOrTrait: [{ tokens: ["Dinosaur", "Ceratopsian"], match: "trait" }] },
            ],
          },
          mode: "reduceCost",
          amount: 1,
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "EndOfYourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Attack",
          optional: true,
          drainTimingWindowDuringAttack: true,
          condition: {
            kind: "anyOf",
            conditions: [{ kind: "selfHasNameContaining", names: ["Tyrannomon"] }, { kind: "selfHasTrait" }],
          },
        },
      ],
    });
  });

  it("Q2375 reduces every qualifying digivolution by 1 for the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-013", as: "tyrannomon" }],
          hand: [
            { card: "BT14-016", as: "triceramon" },
            { card: "BT14-017", as: "dinorexmon" },
          ],
          deck: ["BT1-001", "BT1-001"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(
      () =>
        observe(s.engine).costReduction("wouldDigivolve", s.perm("tyrannomon"), getCardDefinition("BT14-016")) === 1,
    );

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tyrannomon").permanentId,
        instanceId: s.inst("triceramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tyrannomon").topCard.cardId === "BT14-016");
    expect(s.state.memory).toBe(9);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tyrannomon").permanentId,
        instanceId: s.inst("dinorexmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tyrannomon").topCard.cardId === "BT14-017");
    expect(s.state.memory).toBe(7);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    assertNoLoudGap(s);
  });

  it("Q2376/Q2377 attacks once from a Tyrannomon-named non-Dinosaur host and not while suspended", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-024", under: ["BT14-013"], as: "metalTyrannomon" }] },
        1: { security: ["BT1-085", "BT1-085"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("metalTyrannomon"));
    expect(s.perm("metalTyrannomon").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);

    s.perm("metalTyrannomon").isSuspended = false;
    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("metalTyrannomon"));
    expect(s.perm("metalTyrannomon").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);

    const suspended = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-017", under: ["BT14-013"], suspended: true, as: "dinosaur" }] },
        1: { security: ["BT1-085"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(suspended.engine).fire(EffectTiming.EndOfYourTurn, suspended.perm("dinosaur"));
    expect(suspended.state.players[1]!.security).toHaveLength(1);
    assertNoLoudGap(s);
    assertNoLoudGap(suspended);
  });

  it("naturally declares the inherited attack from the production end-of-turn window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-024", under: ["BT14-013"], as: "metalTyrannomon" }],
          deck: ["BT1-001"],
        },
        1: { security: ["BT1-085", "BT1-085"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    await advance(s.engine).runTurn(0);

    expect(s.perm("metalTyrannomon").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(true);
    assertNoLoudGap(s);
  });

  it("Q2378 allows only one of two pending inherited effects to declare an attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-024", under: ["BT14-013"], as: "first" },
            { card: "BT1-024", under: ["BT14-013"], as: "second" },
          ],
        },
        1: { security: ["BT1-085", "BT1-085"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireGlobal(EffectTiming.EndOfYourTurn);
    expect([s.perm("first"), s.perm("second")].filter((permanent) => permanent.isSuspended)).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    assertNoLoudGap(s);
  });
});
