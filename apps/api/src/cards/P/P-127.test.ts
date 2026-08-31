import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-127.js";

describe("P-127 Kari Kamiya", () => {
  it("uses the second On Play mode to digivolve a Digimon into Gatomon for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-033", as: "host" }],
          hand: [
            { card: "P-127", as: "kari" },
            { card: "BT2-036", as: "gatomon" },
          ],
        },
      },
      { autoChooseOption: true, preferOptionIndex: 1, autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kari").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("gatomon").instanceId);
    expect(s.perm("host").topCard.instanceId).toBe(s.inst("gatomon").instanceId);
    expect(s.state.memory).toBe(7);
    assertNoLoudGap(s);
  });

  it("plays Salamon from hand through the first On Play mode", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "P-127", as: "kari" },
            { card: "BT3-033", as: "salamon" },
          ],
        },
      },
      { autoChooseOption: true, preferOptionIndex: 0, autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kari").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("salamon").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("salamon").instanceId)).toBe(
      true,
    );
    assertNoLoudGap(s);
  });

  it("does not gain memory merely when security counts are equal", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "P-127", as: "kari" }], security: ["BT1-001"] },
      1: { security: ["BT1-001"] },
    });
    s.state.memory = 0;
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("gains one memory at start of main when behind on security", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "P-127", as: "kari" }], security: ["BT1-001"] },
      1: { security: ["BT1-001", "BT1-002"] },
    });
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("kari"));
    await settle();
    expect(s.state.memory).toBe(1);
  });
});
