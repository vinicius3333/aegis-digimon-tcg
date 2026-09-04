import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-063.js";

describe("EX2-063 Kazu Shioda", () => {
  it("may suspend when a Machine becomes suspended to draw 1 then trash 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-031", as: "machine" },
            { card: "EX2-063", as: "kazu" },
          ],
          hand: ["BT1-001"],
          deck: ["BT1-002"],
        },
        1: { security: ["BT1-003"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("machine").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("kazu").isSuspended && s.state.players[0]!.trash.length === 1);
    expect(s.perm("kazu").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });

  it("gains memory at Start of Main only with a Cyborg or Machine in play", async () => {
    const matching = setupEngine({
      0: {
        battleArea: [
          { card: "EX2-031", as: "machine" },
          { card: "EX2-063", as: "kazu" },
        ],
        deck: ["BT1-001"],
        security: ["BT1-002"],
      },
    });
    matching.state.memory = 2;
    await matching.ready();
    await advance(matching.engine).fireGlobal(EffectTiming.OnStartMainPhase);
    expect(matching.state.memory).toBe(3);

    const nonMatching = setupEngine({
      0: {
        battleArea: [
          { card: "EX2-014", as: "other" },
          { card: "EX2-063", as: "kazu" },
        ],
        deck: ["BT1-001"],
        security: ["BT1-002"],
      },
    });
    nonMatching.state.memory = 2;
    await nonMatching.ready();
    await advance(nonMatching.engine).fireGlobal(EffectTiming.OnStartMainPhase);
    expect(nonMatching.state.memory).toBe(2);
  });

  it("fires its All Turns draw-then-trash response during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: { deck: ["BT1-001"], security: ["BT1-002"] },
        1: {
          battleArea: [
            { card: "EX2-063", as: "kazu" },
            { card: "EX2-031", as: "machine" },
          ],
          deck: ["BT1-003", "BT1-004"],
          hand: ["BT1-005"],
          security: ["BT1-006"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const turn = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    await advance(s.engine).verb.suspend([s.perm("machine").permanentId]);
    expect(s.perm("kazu").isSuspended).toBe(true);
    expect(s.state.players[1]!.hand).toHaveLength(2);
    expect(s.state.players[1]!.trash).toHaveLength(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turn;
  });

  it("does not draw or trash when the suspension response is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-063", as: "kazu" },
            { card: "EX2-031", as: "machine" },
          ],
          deck: ["BT1-001"],
          hand: ["BT1-002"],
        },
        1: { security: ["BT1-003"] },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSuspended", { subjectPermanentId: s.perm("machine").permanentId });
    expect(s.perm("kazu").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("plays EX2-063 from Security without paying its cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-050", as: "attacker" }], security: ["BT1-001"] },
      1: { security: [{ card: "EX2-063", as: "securityKazu" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("securityKazu").instanceId),
    );
    expect(
      s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("securityKazu").instanceId),
    ).toBe(true);
  });
});
