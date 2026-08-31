import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
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
          hand: [
            { card: "P-126", as: "yolei" },
            { card: "P-119", as: "hawkmon" },
          ],
        },
      },
      { autoChooseOption: true, preferOptionIndex: 0, autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("yolei").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("hawkmon").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("hawkmon").instanceId)).toBe(
      true,
    );
    const beforeStart = s.state.memory;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("yolei"));
    await settle();
    expect(s.state.memory).toBe(beforeStart + 1);
    assertNoLoudGap(s);
  });
});
