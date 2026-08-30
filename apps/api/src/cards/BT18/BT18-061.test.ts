import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT18-061.js";
import "./index.js";

describe("BT18-061 Trailmon", () => {
  it("reveals three and places a qualifying black level-four card under itself", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[1]).toMatchObject({
      trigger: "EndOfOpponentsTurn",
      frequency: "OncePerTurn",
      actions: [{ kind: "PlayWithoutCost", fromOwnDigivolutionStack: true, optional: true }],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "Aura", while: { kind: "selfHasTrait" } }],
    });
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT18-061", as: "trailmon" }],
          deck: ["BT11-040", "BT1-010", "BT18-088"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("trailmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.stack.some((card) => card.cardId === "BT11-040")),
    );

    const trailmon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT18-061")!;
    expect(trailmon.stack.some((card) => card.cardId === "BT11-040")).toBe(true);
    expect(trailmon.stack).toHaveLength(1);
    expect(s.state.memory).toBe(6);
    assertNoLoudGap(s);
  });

  it("independently accepts a Tamer and may refuse while excluding wrong cards", async () => {
    const accepted = setupEngine(
      {
        0: {
          hand: [{ card: "BT18-061", as: "trailmon" }],
          deck: ["BT18-088", "BT1-010", "BT1-078"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    accepted.state.memory = 4;
    expect(
      accepted.engine.applyIntent(0, { type: "playCard", instanceId: accepted.inst("trailmon").instanceId }),
    ).toEqual({
      ok: true,
    });
    await settle(() => accepted.perm("trailmon").stack.some(({ cardId }) => cardId === "BT18-088"));
    expect(accepted.perm("trailmon").stack.map(({ cardId }) => cardId)).toEqual(["BT18-088"]);
    expect(accepted.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT1-010", "BT1-078"]),
    );

    const refused = setupEngine(
      {
        0: {
          hand: [{ card: "BT18-061", as: "trailmon" }],
          deck: ["BT18-088", "BT11-040", "BT1-010"],
        },
      },
      { autoSelectCards: false, autoChooseOption: true },
    );
    expect(
      refused.engine.applyIntent(0, { type: "playCard", instanceId: refused.inst("trailmon").instanceId }),
    ).toEqual({
      ok: true,
    });
    await settle(() => refused.state.pendingDecision?.kind === "selectCards");
    const decision = refused.state.pendingDecision!;
    expect(
      refused.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => refused.state.pendingDecision === undefined);
    expect(refused.perm("trailmon").stack).toHaveLength(0);
    expect(refused.state.players[0]!.deck).toHaveLength(3);
    assertNoLoudGap(accepted);
    assertNoLoudGap(refused);
  });

  it("plays a Tamer only from this stack at opponent-turn end and only once", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-061", as: "trailmon", under: ["BT18-088", "BT18-091"] },
            { card: "BT1-078", as: "other", under: ["BT18-093"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.EndOfOpponentsTurn, s.perm("trailmon"));
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT18-088"));
    expect(s.perm("trailmon").stack).toHaveLength(1);
    expect(s.perm("other").stack.map(({ cardId }) => cardId)).toEqual(["BT18-093"]);
    const areaAfterFirst = s.state.players[0]!.battleArea.length;

    await advance(s.engine).fire(EffectTiming.EndOfOpponentsTurn, s.perm("trailmon"));
    expect(s.state.players[0]!.battleArea).toHaveLength(areaAfterFirst);
    expect(s.perm("trailmon").stack).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("resolves the end-of-opponent-turn play from a natural completed turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-061", as: "trailmon", under: ["BT18-088"] }],
        },
        1: { deck: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    // The turn machine needs a positive entry gauge to open seat 1's Main phase; the
    // end-of-opponent-turn timing still fires when that natural turn subsequently ends.
    s.state.memory = 4;
    await s.ready();

    await advance(s.engine).runTurn(1);

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT18-088")).toBe(true);
    expect(s.perm("trailmon").stack).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("grants inherited Collision only to a Machine host during its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT18-061", as: "machine", under: ["BT18-061"] },
          { card: "BT1-030", as: "nonMachine", under: ["BT18-061"] },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("machine"), "Collision")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("nonMachine"), "Collision")).toBe(false);
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("machine"), "Collision")).toBe(false);
    assertNoLoudGap(s);
  });
});
