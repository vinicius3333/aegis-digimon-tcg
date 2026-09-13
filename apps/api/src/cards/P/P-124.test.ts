import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-124.js";

describe("P-124 Davis Motomiya", () => {
  it("uses the second On Play mode to digivolve a Digimon into ExVeemon for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-064", as: "host" }],
          hand: [
            { card: "P-124", as: "davis" },
            { card: "BT12-022", as: "exveemon" },
          ],
        },
      },
      { autoChooseOption: true, preferOptionIndex: 1, autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("davis").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("exveemon").instanceId);
    expect(s.perm("host").topCard.instanceId).toBe(s.inst("exveemon").instanceId);
    expect(s.state.memory).toBe(7);
    assertNoLoudGap(s);
  });

  it("plays Veemon from hand and gains memory on the next main phase with a [Free] Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-124", as: "davis" }, { card: "BT2-021", as: "veemon" }, "BT1-009"],
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
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("davis").instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("veemon").instanceId) &&
        s.state.pendingDecision === undefined &&
        s.state.phase === Phase.Main &&
        s.state.turnSeat === 0,
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("veemon").instanceId)).toBe(
      true,
    );
    expect(s.state.memory).toBe(beforePlay - 3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    // A voluntary pass establishes 3 memory for the incoming player; Davis then gains 1.
    expect(s.state.memory).toBe(4);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("does not gain memory at the start of your main phase without a [Free] Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-124", as: "davis" }], deck: ["BT1-009"], security: ["BT1-009"] },
        1: { deck: ["BT1-009"], security: ["BT1-009"] },
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
          hand: [{ card: "BT11-023", as: "veemon" }],
          deck: ["BT1-009"],
          security: [{ card: "P-124", as: "davis" }],
        },
        1: {
          battleArea: [{ card: "BT1-025", as: "attacker" }],
          deck: ["BT1-009"],
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
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard?.instanceId === s.inst("davis").instanceId,
        ) &&
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard?.instanceId === s.inst("veemon").instanceId,
        ),
    );

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.memory).toBe(3);
    assertNoLoudGap(s);
  });
});
