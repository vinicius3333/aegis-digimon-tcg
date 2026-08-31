import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
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
    const s = setupEngine({
      0: { battleArea: [{ card: "P-129", as: "tk" }], security: ["BT1-001"] },
      1: { security: ["BT1-001"] },
    });
    s.state.memory = 0;
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("gains one memory at start of main when ahead on security", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "P-129", as: "tk" }], security: ["BT1-001", "BT1-002"] },
      1: { security: ["BT1-001"] },
    });
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("tk"));
    await settle();
    expect(s.state.memory).toBe(1);
  });
});
