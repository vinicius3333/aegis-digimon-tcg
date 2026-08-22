import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT14-017.js";

describe("BT14-017", () => {
  it("gains Blitz on digivolution", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")).toMatchObject({ actions: [{ kind: "GainKeyword", keyword: { keyword: "Blitz" }, duration: "forTheTurn" }] }));
  it("gets +4000 DP and restricts opposing low-DP Digimon while memory is at least one", () => expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({ actions: [{ kind: "Aura", effect: { amount: 4000 }, while: { kind: "memoryAtLeast", value: 1 } }, { kind: "RestrictPlay", seat: "opponent", filter: { dpAtMost: 6000 }, while: { kind: "memoryAtLeast", value: 1 } }] }));

  it("buffs itself and blocks an opposing low-DP play while memory is positive", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT14-017", as: "dino" }] },
      1: { hand: [{ card: "BT14-007", as: "candidate" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 1;
    await s.ready();
    expect(s.perm("dino").currentDP).toBe(15000);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("candidate").instanceId }).ok).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("dino"), "play")).toBe(false);
  });
});
