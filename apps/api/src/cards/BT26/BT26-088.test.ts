import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-088.js";
import "../index.js";

describe("BT26-088 Hiroko Sagisaka", () => {
  it("compiles the conditional memory gain and Security self-play", () => {
    expect(getCardDefinition("BT26-088")).toMatchObject({
      nameEn: "Hiroko Sagisaka",
      colors: ["Red"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["TS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.map((e) => e.trigger)).toEqual(["StartOfYourMainPhase", "YourTurn", "Security"]);
    expect(compiled.effects[1]).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Boss", "TS"], match: "trait" }] },
          mode: "reduceCost",
          amountChoices: [{ amount: 2 }, { amount: 1 }],
          cost: { kind: "suspend" },
        },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
  });
  it("gains memory at start of main only when the opponent has a Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT26-088", as: "hiroko" }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    s.state.memory = 1;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("hiroko"));
    expect(s.state.memory).toBe(2);
    const empty = setupEngine({ 0: { battleArea: [{ card: "BT26-088", as: "hiroko" }] } });
    empty.state.memory = 1;
    await advance(empty.engine).fire(EffectTiming.OnStartMainPhase, empty.perm("hiroko"));
    expect(empty.state.memory).toBe(1);
  });
  it("suspends itself to reduce a TS Digimon's play cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-088", as: "hiroko" }],
          hand: [{ card: "BT26-008", as: "kotemon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kotemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("kotemon").instanceId),
    );

    expect(s.state.memory).toBe(0);
    expect(s.perm("hiroko").isSuspended).toBe(true);
  });

  it("does not reduce a Digimon without the Boss or TS trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-088", as: "hiroko" }],
          hand: [{ card: "BT1-009", as: "unmatched" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unmatched").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("unmatched").instanceId),
    );

    expect(s.state.memory).toBe(1);
    expect(s.perm("hiroko").isSuspended).toBe(false);
  });

  it("reduces the cost by only 1 when its controller already has a Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-088", as: "hiroko" },
            { card: "BT1-009", as: "existingDigimon" },
          ],
          hand: [{ card: "BT26-008", as: "kotemon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kotemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("kotemon").instanceId),
    );

    expect(s.state.memory).toBe(0);
    expect(s.perm("hiroko").isSuspended).toBe(true);
  });

  it("also reduces a non-TS Boss Digimon by 2 when its controller has no Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-088", as: "hiroko" }],
          hand: [{ card: "BT3-058", as: "boss" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("boss").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("boss").instanceId),
    );

    expect(s.state.memory).toBe(0);
    expect(s.perm("hiroko").isSuspended).toBe(true);
  });

  it("may decline the reduction and then pays the full play cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-088", as: "hiroko" }],
          hand: [{ card: "BT26-008", as: "kotemon" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kotemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("kotemon").instanceId),
    );

    expect(s.state.memory).toBe(0);
    expect(s.perm("hiroko").isSuspended).toBe(false);
  });

  it("cannot reduce a TS Digimon's cost while this Tamer is already suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-088", as: "hiroko", suspended: true }],
          hand: [{ card: "BT26-008", as: "kotemon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kotemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("kotemon").instanceId),
    );

    expect(s.state.memory).toBe(0);
    expect(s.perm("hiroko").isSuspended).toBe(true);
  });

  it("plays itself without paying its cost when checked in security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT26-088", as: "hiroko" }] },
      1: { battleArea: [{ card: "AD1-001", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const hirokoId = s.inst("hiroko").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === hirokoId));

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === hirokoId)).toBe(false);
    expect(s.state.memory).toBe(0);
  });
});
