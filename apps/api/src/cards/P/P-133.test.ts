import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./P-133.js";

describe("P-133 Shoto Kazama", () => {
  it("suspends this Tamer and gains memory when your Digimon digivolves into Avian", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-133", as: "shoto" },
            { card: "BT10-071", as: "host" },
          ],
          hand: [{ card: "BT13-082", as: "peckmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("peckmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("peckmon").instanceId);
    expect(s.perm("host").topCard.instanceId).toBe(s.inst("peckmon").instanceId);
    expect(s.perm("shoto").isSuspended).toBe(true);
    expect(s.state.memory).toBe(9);
    assertNoLoudGap(s);
  });

  it("plays Pteromon from hand on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "P-133", as: "shoto" },
            { card: "P-131", as: "pteromon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shoto").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("pteromon").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("pteromon").instanceId)).toBe(
      true,
    );
    assertNoLoudGap(s);
  });

  it("plays itself from security without paying its play cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "P-133", as: "shoto" }] } });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("shoto"));
    await settle();
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("shoto").instanceId)).toBe(true);
  });
});
