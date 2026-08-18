import { getCardDefinition, getCompiledCard, Phase, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../BT1/BT1-095.js";
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
