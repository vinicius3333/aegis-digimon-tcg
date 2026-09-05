import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
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

  it("publicly grants Blocker and Reboot only when its own host gains a stack card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX6-040", as: "host", under: ["EX6-008"] },
          { card: "EX6-008", as: "other" },
        ],
        hand: [{ card: "BT1-009", as: "added" }],
      },
    });
    await s.ready();
    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("added").instanceId]);
    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("host").permanentId,
      addedDigivolutionCardInstanceIds: [s.inst("added").instanceId],
      byEffectSeat: 0,
    });
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "Blocker")).toBe(false);
  });

  it("publicly applies the inherited +2000 DP on the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX6-008", as: "host", under: ["EX6-040"] }] } });
    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(6000);
  });
});
