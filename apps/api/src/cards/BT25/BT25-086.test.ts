import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT25-086 Dan Yuki", () => {
  it("matches the catalog identity and TS trait", () => {
    expect(getCardDefinition("BT25-086")).toMatchObject({
      cardId: "BT25-086",
      nameEn: "Dan Yuki",
      colors: ["Red"],
      kinds: ["Tamer"],
      types: ["ADAMAS", "TS"],
      playCost: 3,
    });
  });

  it("gains 1 at start main at exactly 4 memory, but not above the boundary (Q6405)", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT25-086", as: "dan" }] } });
    s.state.memory = 4;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("dan"));
    expect(s.state.memory).toBe(5);
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("dan"));
    expect(s.state.memory).toBe(5);
  });

  it("suspends Dan, gives +1000 per opponent memory, and lets the chosen TS Digimon attack (Q6406-Q6407)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-086", as: "dan" },
            { card: "BT25-008", as: "attacker" },
          ],
        },
        1: { security: [{ card: "BT1-001" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = -5;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("dan"));
    expect(s.perm("dan").isSuspended).toBe(true);
    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(s.perm("attacker").currentDP).toBe(getCardDefinition("BT25-008")!.dp + 5000);
  });

  it("does nothing when Dan is already suspended because the by-cost can't be paid", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-086", as: "dan", suspended: true },
            { card: "BT25-008", as: "target" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = -3;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("dan"));
    expect(s.perm("target").isSuspended).toBe(false);
    expect(s.perm("target").currentDP).toBe(getCardDefinition("BT25-008")!.dp);
  });

  it("excludes non-TS and breeding Digimon from the target pool", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-086", as: "dan" },
            { card: "BT1-009", as: "plain" },
          ],
          breeding: { card: "BT25-008", as: "breedingTs" },
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = -2;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("dan"));
    expect(s.perm("dan").isSuspended).toBe(false);
    expect(s.perm("plain").currentDP).toBe(getCardDefinition("BT1-009")!.dp);
  });

  it("plays itself for free from a real Security check", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT25-086", as: "dan" }] },
      1: { battleArea: [{ card: "AD1-001", as: "attacker", dp: 20000 }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("dan").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("dan").instanceId),
    ).toBe(true);
  });

  it("allows only one of two simultaneous Dan end-turn effects to launch an attack (Q6408)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-086", as: "firstDan" },
            { card: "BT25-086", as: "secondDan" },
            { card: "BT25-008", as: "attacker" },
          ],
          deck: ["BT1-001"],
        },
        1: { security: ["BT1-001", "BT1-002"], deck: ["BT1-003"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;

    expect(s.perm("firstDan").isSuspended).toBe(true);
    expect(s.perm("secondDan").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
