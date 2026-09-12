import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-129.js";

describe("P-129 T.K. Takaishi", () => {
  it("uses the second On Play mode to digivolve a Digimon into Angemon for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-033", as: "host" }],
          hand: [
            { card: "P-129", as: "tk" },
            { card: "BT1-055", as: "angemon" },
          ],
        },
      },
      { autoChooseOption: true, preferOptionIndex: 1, autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tk").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("angemon").instanceId);
    expect(s.perm("host").topCard.instanceId).toBe(s.inst("angemon").instanceId);
    expect(s.state.memory).toBe(7);
    assertNoLoudGap(s);
  });

  it("plays Patamon from hand through the first On Play mode", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "P-129", as: "tk" },
            { card: "BT1-048", as: "patamon" },
          ],
        },
      },
      { autoChooseOption: true, preferOptionIndex: 0, autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tk").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("patamon").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("patamon").instanceId)).toBe(
      true,
    );
    assertNoLoudGap(s);
  });

  it("does not gain memory when security counts are equal", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-129", as: "tk" }],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009"],
        },
        1: { hand: ["BT1-009"], deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"], security: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.phase).toBe(Phase.Main);
    expect(s.state.memory).toBe(2);
    advance(s.engine).endMainPhaseIfOpen(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("gains one memory at start of main when ahead on security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-129", as: "tk" }],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: { hand: ["BT1-009"], deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"], security: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.phase).toBe(Phase.Main);
    expect(s.state.memory).toBe(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("plays from security for free and resolves a legal On Play choice without changing memory", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT1-048", as: "patamon" }],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          security: [{ card: "P-129", as: "tk" }],
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
    const securityChecksBefore = s.events.filter((event) => event.kind === "securityChecked").length;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("tk").instanceId) &&
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("patamon").instanceId) &&
        s.state.pendingDecision === undefined &&
        s.events.filter((event) => event.kind === "securityChecked").length > securityChecksBefore &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.memory).toBe(3);
    assertNoLoudGap(s);
  });
});
