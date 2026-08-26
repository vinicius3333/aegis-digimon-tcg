import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { EffectTiming } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT18-043 Tinkermon", () => {
  it("reduces a qualifying multicolor digivolution by one memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT18-043", as: "tinkermon" }], hand: [{ card: "BT11-052", as: "evolving" }] },
    });
    await s.ready();
    s.state.memory = 10;
    const initialMemory = s.state.memory;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("tinkermon"));

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tinkermon").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tinkermon").topCard?.instanceId === s.inst("evolving").instanceId);

    expect(s.perm("tinkermon").topCard?.cardId).toBe("BT11-052");
    expect(s.state.memory).toBe(initialMemory - 2);
    assertNoLoudGap(s);
  });

  it("does not reduce another Digimon's evolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT18-043", as: "tinkermon" },
          { card: "BT1-064", as: "other" },
        ],
        hand: [{ card: "BT11-052", as: "evolving" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("other").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("other").topCard?.instanceId === s.inst("evolving").instanceId);

    expect(s.state.memory).toBe(7);
    assertNoLoudGap(s);
  });

  it("reduces a qualifying Tamer evolution by 1 with more than 5 Hybrid sources", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT18-043", as: "tinkermon" },
          { card: "BT7-085", as: "takuya", under: Array.from({ length: 6 }, () => "BT7-021") },
        ],
        hand: [{ card: "BT18-018", as: "emperor" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takuya").permanentId,
        instanceId: s.inst("emperor").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard?.instanceId === s.inst("emperor").instanceId);

    expect(s.state.memory).toBe(6);
    expect(s.perm("takuya").stack).toHaveLength(7);
    assertNoLoudGap(s);
  });

  it("does not activate from the breeding area under Q2968", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT18-043", as: "tinkermon" },
        hand: [{ card: "BT11-052", as: "evolving" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tinkermon").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tinkermon").topCard?.instanceId === s.inst("evolving").instanceId);

    expect(s.state.memory).toBe(7);
    assertNoLoudGap(s);
  });

  it("grants inherited Piercing to its evolved host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-060", as: "host", under: [{ card: "BT18-043", as: "source" }] }] },
    });
    await s.ready();

    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
    assertNoLoudGap(s);
  });
});
