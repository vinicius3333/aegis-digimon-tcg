import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-126.js";

describe("P-126 Yolei Inoue", () => {
  it("uses the second On Play mode to digivolve a Digimon into Aquilamon for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-010", as: "host" }],
          hand: [
            { card: "P-126", as: "yolei" },
            { card: "BT13-011", as: "aquilamon" },
          ],
        },
      },
      { autoChooseOption: true, preferOptionIndex: 1, autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("yolei").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("aquilamon").instanceId);
    expect(s.perm("host").topCard.instanceId).toBe(s.inst("aquilamon").instanceId);
    expect(s.state.memory).toBe(7);
    assertNoLoudGap(s);
  });

  it("plays Hawkmon from hand through the first On Play mode", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-126", as: "yolei" }, { card: "P-119", as: "hawkmon" }, "BT1-009"],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009"],
        },
        1: { hand: ["BT1-009"], deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"], security: ["BT1-009"] },
      },
      { autoChooseOption: true, preferOptionIndex: 0, autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const beforePlay = s.state.memory;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("yolei").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("hawkmon").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("hawkmon").instanceId)).toBe(
      true,
    );
    expect(s.state.memory).toBe(beforePlay - 3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(4);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("does not gain memory at the start of your main phase without a [Free] Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-126", as: "yolei" }],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009"],
        },
        1: { hand: ["BT1-009"], deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(2);
    advance(s.engine).endMainPhaseIfOpen(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("plays from security for free and resolves a legal On Play choice without changing memory", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-119", as: "hawkmon" }],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          security: [{ card: "P-126", as: "yolei" }],
        },
        1: {
          battleArea: [{ card: "BT1-025", as: "attacker" }],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009"],
        },
      },
      { autoChooseOption: true, preferOptionIndex: 0, autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("yolei").instanceId) &&
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("hawkmon").instanceId),
    );
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.memory).toBe(3);
    assertNoLoudGap(s);
  });
});
