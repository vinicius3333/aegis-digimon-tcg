import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle } from "../../engine/testkit/harness.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX8-008.js";
import "./index.js";

describe("EX8-008", () => {
  it("gains 1 memory on deletion", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
    }));
  it("inherits +2000 DP during your turn", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      duration: "permanent",
    }));
  it("applies inherited DP on a live host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: [{ card: "EX8-008", as: "candle" }] }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(5000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(3000);
  });

  it("gains 1 memory when deleted", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-008", as: "candle" }] } });
    await s.ready();
    s.state.memory = 0;
    await advance(s.engine).verb.deletePermanent([s.perm("candle").permanentId], "byEffect");
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });

  it("digivolves for 0 from an off-color level-2 NSo card and rejects an off-color non-NSo card", async () => {
    const eligible = setupEngine({
      0: { breeding: { card: "EX8-006", as: "nsoEgg" }, hand: [{ card: "EX8-008", as: "candle" }] },
    });
    eligible.state.memory = 0;
    await eligible.ready();
    expect(
      eligible.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eligible.perm("nsoEgg").permanentId,
        instanceId: eligible.inst("candle").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => eligible.perm("nsoEgg").topCard.instanceId === eligible.inst("candle").instanceId);
    expect(eligible.state.memory).toBe(0);

    const ineligible = setupEngine({
      0: { breeding: { card: "BT2-005", as: "blackEgg" }, hand: [{ card: "EX8-008", as: "candle" }] },
    });
    await ineligible.ready();
    expect(
      ineligible.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: ineligible.perm("blackEgg").permanentId,
        instanceId: ineligible.inst("candle").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
