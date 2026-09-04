import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-040.js";

describe("EX6-040 TiaLudomon", () => {
  it("places itself under a level 4 or Legend-Arms Digimon for +2000 DP", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      target: { fromSelectionRef: "digivolveHost" },
      cost: { kind: "place", position: "bottom", bindHostAs: "digivolveHost" },
      additionalCost: { kind: "payMemory", memory: 1 },
    }));
  it("grants Blocker and Reboot on stack addition and inherits +2000 DP", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onAddDigivolutionCards",
      sourceFilter: { isSelfRef: true },
      actions: [
        { kind: "GainKeyword", keyword: { keyword: "Blocker" } },
        { kind: "GainKeyword", keyword: { keyword: "Reboot" } },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
    });
  });

  it("publicly pays 1 and places TiaLudomon under an eligible level 4 host", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX6-008", as: "host" }], hand: [{ card: "EX6-040", as: "tia" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.OnDeclaration, s.inst("tia"));
    await settle(() => s.perm("host").stack.some((card) => card.instanceId === s.inst("tia").instanceId));
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("tia").instanceId)).toBe(true);
    expect(s.state.memory).toBe(2);
    expect(s.perm("host").currentDP).toBe(6000);
  });
});
