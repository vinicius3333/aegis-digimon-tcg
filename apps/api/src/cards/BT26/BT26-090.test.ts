import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { compiled } from "./BT26-090.js";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT26-090 compiled behavior", () => {
  it("proves Q7143 memory threshold and suspended TS Option use shape", () => {
    expect(getCardDefinition("BT26-090")).toMatchObject({
      nameEn: "Kanan Yuki",
      colors: ["Green"],
      kinds: ["Tamer"],
      playCost: 3,
      types: ["ADAMAS", "TS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.find((effect) => effect.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: { kind: "memoryAtMost", controller: "mine", value: 4 },
    });
    expect(compiled.effects.find((effect) => effect.trigger === "EndOfYourTurn")?.actions[0]).toMatchObject({
      kind: "UseOptionWithoutCost",
      from: ["hand"],
      payCost: true,
      allowMultiColor: true,
      reduceCostByOpponentMemory: true,
      optional: true,
      target: {
        count: 1,
        filter: {
          controller: "mine",
          zone: "hand",
          kind: ["Option"],
          nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
        },
      },
      cost: { kind: "suspend", target: { isSelf: true } },
    });
  });

  it("keeps the opponent-memory reduction gap explicit", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "EndOfYourTurn")?.actions[0]).toMatchObject({
      reduceCostByOpponentMemory: true,
    });
    expect(irNode(compiled.effects.find((effect) => effect.trigger === "EndOfYourTurn")?.actions[0]!).raw).toContain(
      "opponent has",
    );
  });

  it("gains memory only when its controller has four or less", async () => {
    const low = setupEngine({ 0: { battleArea: [{ card: "BT26-090", as: "kanan" }] } });
    low.state.memory = 4;
    await advance(low.engine).fire(EffectTiming.OnStartMainPhase, low.perm("kanan"));
    expect(low.state.memory).toBe(5);

    const high = setupEngine({ 0: { battleArea: [{ card: "BT26-090", as: "kanan" }] } });
    high.state.memory = 5;
    await advance(high.engine).fire(EffectTiming.OnStartMainPhase, high.perm("kanan"));
    expect(high.state.memory).toBe(5);

    const opponentSide = setupEngine({ 0: { battleArea: [{ card: "BT26-090", as: "kanan" }] } });
    opponentSide.state.memory = -3;
    await advance(opponentSide.engine).fire(EffectTiming.OnStartMainPhase, opponentSide.perm("kanan"));
    expect(opponentSide.state.memory).toBe(-2);
  });

  it("suspends itself and reduces a TS Option's paid cost by the opponent's memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-090", as: "kanan" }],
          hand: [{ card: "BT25-093", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = -3;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("kanan"));
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));

    expect(s.perm("kanan").isSuspended).toBe(true);
    expect(s.state.memory).toBe(-5);
  });

  it("can use a multicolor TS Option when both color requirements are met", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-090", as: "kanan" },
            { card: "BT1-045", as: "yellowSource" },
          ],
          hand: [{ card: "BT24-094", as: "multicolorOption" }],
          security: [{ card: "BT1-001", as: "oldSecurity", faceUp: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = -3;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("kanan"));
    await settle(() =>
      s.state.players[0]!.security.some(({ instanceId }) => instanceId === s.inst("multicolorOption").instanceId),
    );

    expect(s.perm("kanan").isSuspended).toBe(true);
    expect(s.state.memory).toBe(-3);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toContain(
      s.inst("multicolorOption").instanceId,
    );
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("oldSecurity").instanceId);
  });

  it("still requires every color of a multicolor TS Option", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-090", as: "kanan" }],
          hand: [{ card: "BT24-094", as: "multicolorOption" }],
          security: [{ card: "BT1-001", faceUp: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = -3;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("kanan"));

    expect(s.perm("kanan").isSuspended).toBe(false);
    expect(s.state.memory).toBe(-3);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      s.inst("multicolorOption").instanceId,
    );
  });

  it("floors the opponent-memory reduction at zero instead of gaining memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-090", as: "kanan" }],
          hand: [{ card: "BT25-093", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = -6;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("kanan"));
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("option").instanceId));

    expect(s.perm("kanan").isSuspended).toBe(true);
    expect(s.state.memory).toBe(-6);
  });

  it("may decline the Option use without suspending or paying its cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-090", as: "kanan" }],
          hand: [{ card: "BT25-093", as: "option" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = -3;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("kanan"));

    expect(s.perm("kanan").isSuspended).toBe(false);
    expect(s.state.memory).toBe(-3);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("option").instanceId)).toBe(true);
  });

  it("cannot suspend itself to use a non-TS Option", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-090", as: "kanan" }],
          hand: [{ card: "BT1-108", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = -1;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("kanan"));

    expect(s.perm("kanan").isSuspended).toBe(false);
    expect(s.state.memory).toBe(-1);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("option").instanceId)).toBe(true);
  });

  it("cannot use the TS Option while this Tamer is already suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-090", as: "kanan", suspended: true }],
          hand: [{ card: "BT25-093", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = -3;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("kanan"));

    expect(s.state.memory).toBe(-3);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("option").instanceId)).toBe(true);
  });

  it("plays itself without paying its cost when checked in security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT26-090", as: "kanan" }] },
      1: { battleArea: [{ card: "AD1-001", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const kananId = s.inst("kanan").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === kananId));

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === kananId)).toBe(false);
    expect(s.state.memory).toBe(0);
  });
});
