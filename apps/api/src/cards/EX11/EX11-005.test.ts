import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX11-005.js";

describe("EX11-005 Yaamon", () => {
  it("keeps the optional trash digivolution and conditional hand cleanup together", () => {
    const effect = runtimeCompiledCard("EX11-005")!.effects[0]!;
    expect(effect).toMatchObject({ trigger: "StartOfYourMainPhase", isInherited: true });
    expect(effect.actions[0]).toMatchObject({
      kind: "Digivolve",
      optional: true,
      from: ["trash"],
      reduceCost: 1,
      payCost: true,
      into: { nameOrTrait: [{ tokens: ["Dark Dragon", "Evil Dragon"], match: "trait" }] },
    });
    expect(effect.actions[1]).toMatchObject({
      kind: "Trash",
      target: { count: 2 },
      condition: { kind: "ifThisEffectDigivolved" },
    });
  });

  it("pays the reduced cost, keeps the legal stack, draws, and then trashes 2 cards (Q5791)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-048", as: "host", under: ["EX11-005"] }],
          hand: [
            { card: "BT1-001", as: "firstHand" },
            { card: "BT1-002", as: "secondHand" },
          ],
          deck: [{ card: "BT1-003", as: "bonusDraw" }],
          trash: [{ card: "EX11-049", as: "punkmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("host"));
    await settle(() => s.perm("host").topCard.instanceId === s.inst("punkmon").instanceId);

    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX11-005", "EX11-048"]);
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(
      [s.inst("firstHand"), s.inst("secondHand"), s.inst("bonusDraw")].filter((card) =>
        s.state.players[0]!.trash.some((trashed) => trashed.instanceId === card.instanceId),
      ),
    ).toHaveLength(2);
    assertNoLoudGap(s);
  });

  it("with an empty hand, trashes the bonus draw after digivolving when possible (Q5792)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-048", as: "host", under: ["EX11-005"] }],
          deck: [{ card: "BT1-001", as: "bonusDraw" }],
          trash: [{ card: "EX11-049", as: "punkmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("host"));
    await settle(() => s.perm("host").topCard.instanceId === s.inst("punkmon").instanceId);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
    expect(s.state.memory).toBe(8);
    assertNoLoudGap(s);
  });

  it("may decline without evolving or trashing its hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-048", as: "host", under: ["EX11-005"] }],
          hand: [{ card: "BT1-001", as: "kept" }],
          trash: [{ card: "EX11-049", as: "punkmon" }],
        },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("host"));
    await settle();

    expect(s.perm("host").topCard.cardId).toBe("EX11-048");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("punkmon").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("kept").instanceId);
    expect(s.state.memory).toBe(10);
    assertNoLoudGap(s);
  });

  it("rejects a legal-level purple card without the Dark Dragon or Evil Dragon trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-048", as: "host", under: ["EX11-005"] }],
          hand: [{ card: "BT1-001", as: "kept" }],
          trash: [{ card: "BT10-074", as: "wrongTrait" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("host"));
    await settle();

    expect(s.perm("host").topCard.cardId).toBe("EX11-048");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("wrongTrait").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("kept").instanceId);
    expect(s.state.memory).toBe(10);
    assertNoLoudGap(s);
  });

  it("does not source the qualifying Digimon from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-048", as: "host", under: ["EX11-005"] }],
          hand: [{ card: "EX11-049", as: "punkmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("host"));
    await settle();

    expect(s.perm("host").topCard.cardId).toBe("EX11-048");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("punkmon").instanceId);
    expect(s.state.memory).toBe(10);
    assertNoLoudGap(s);
  });

  it("does not trigger at the start of the opponent's main phase", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-048", as: "host", under: ["EX11-005"] }],
          trash: [{ card: "EX11-049", as: "punkmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("host"));
    await settle();

    expect(s.perm("host").topCard.cardId).toBe("EX11-048");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("punkmon").instanceId);
    expect(s.state.memory).toBe(10);
    assertNoLoudGap(s);
  });
});
