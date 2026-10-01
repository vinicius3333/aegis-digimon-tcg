import { getCardDefinition, getCompiledCard, Phase, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-075.js";
import "../BT1/BT1-080.js";
import "../BT1/BT1-095.js";
import "../BT1/BT1-108.js";
import "../BT1/BT1-109.js";
import "../BT10/BT10-100.js";
import "./BT8-057.js";

async function unsuspendForActivePhase(s: EngineSetup, seat: Seat): Promise<string[]> {
  return (s.engine as unknown as { unsuspendForActivePhase(seat: Seat): Promise<string[]> }).unsuspendForActivePhase(
    seat,
  );
}

describe("BT8-057 Shivamon", () => {
  it("matches its official metadata and typed effect contract", () => {
    expect(getCardDefinition("BT8-057")).toMatchObject({
      nameEn: "Shivamon",
      colors: ["Green"],
      level: 6,
      playCost: 12,
      dp: 12000,
    });
    expect(getCompiledCard("BT8-057")).toMatchObject({ coverage: "full", residual: [] });
  });

  it("prevents the opponent from playing an Option while all of its owner's Digimon are suspended", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-057", suspended: true }] },
      1: {
        battleArea: [{ card: "BT1-010", suspended: true }],
        hand: [{ card: "BT1-095", as: "option" }],
      },
    });
    s.state.turnSeat = 1;
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }).ok,
    ).toBe(false);
    expect(s.state.players[1]!.hand).toContainEqual(s.inst("option"));
    assertNoLoudGap(s);
  });

  it("allows the opponent to play an Option when one of its owner's Digimon is unsuspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-057", suspended: true },
            { card: "BT8-046", suspended: false },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "target", suspended: true }],
          hand: [{ card: "BT1-095", as: "option" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 5;
    await s.ready();
    const optionId = s.inst("option").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "playCard",
        instanceId: optionId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => !s.perm("target").isSuspended && s.state.players[1]!.trash.some((card) => card.instanceId === optionId),
    );

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("trashes the opponent's security when it unsuspends during its owner's Active phase", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-057", as: "shivamon", suspended: true }] },
      1: { security: [{ card: "BT1-009", as: "security" }] },
    });
    s.state.phase = Phase.Active;
    await s.ready();

    await unsuspendForActivePhase(s, 0);
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("shivamon").isSuspended).toBe(false);
    expect(s.state.players[1]!.trash).toContainEqual(s.inst("security"));
    assertNoLoudGap(s);
  });

  it("does not trash security when an effect unsuspends it during the Main phase", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-057", as: "shivamon", suspended: true }] },
      1: { security: [{ card: "BT1-009", as: "security" }] },
    });
    s.state.phase = Phase.Main;
    await s.ready();

    await advance(s.engine).verb.unsuspend([s.perm("shivamon").permanentId]);

    expect(s.perm("shivamon").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toContainEqual(s.inst("security"));
    expect(s.state.players[1]!.trash).not.toContainEqual(s.inst("security"));
    assertNoLoudGap(s);
  });
});

describe("BT8-057 Shivamon — KB Q&A rulings", () => {
  it("does not negate a digivolution cost reduction from an Option used before its Digimon were all suspended (Q1736)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-075", as: "base" }],
        hand: [
          { card: "BT1-109", as: "smashedPotatoes" },
          { card: "BT1-108", as: "blockedOption" },
          { card: "BT1-080", as: "evolving" },
        ],
      },
      1: { battleArea: [{ card: "BT8-057", as: "shivamon" }] },
    });
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("smashedPotatoes").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-109"));
    expect(s.state.memory).toBe(4);

    await advance(s.engine).verb.suspend([s.perm("shivamon").permanentId], 0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blockedOption").instanceId })).toEqual({
      ok: false,
      reason: "play-prohibited",
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT1-080");

    expect(s.state.memory).toBe(4);
    assertNoLoudGap(s);
  });

  it("still lets the opponent activate <Delay> on an Option already in its battle area (Q1737)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-051", as: "yellowSource" }],
        hand: [
          { card: "BT10-100", as: "delayOption" },
          { card: "BT10-100", as: "blockedOption" },
        ],
      },
      1: { battleArea: [{ card: "BT8-057", as: "shivamon" }] },
    });
    s.state.memory = 5;
    await s.ready();
    const delayOptionId = s.inst("delayOption").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: delayOptionId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === delayOptionId),
    );
    expect(s.state.memory).toBe(2);

    s.state.turnCount += 1;
    await advance(s.engine).verb.suspend([s.perm("shivamon").permanentId], 0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blockedOption").instanceId })).toEqual({
      ok: false,
      reason: "play-prohibited",
    });

    const delayPermanent = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === delayOptionId,
    )!;
    const delayEffects = observe(s.engine).activatableEffects(delayPermanent) as Array<{ effectKey: string }>;
    expect(delayEffects).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: delayOptionId,
        effectKey: delayEffects[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === delayOptionId));

    expect(s.state.memory).toBe(4);
    assertNoLoudGap(s);
  });
});
