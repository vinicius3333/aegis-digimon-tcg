import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST5-09.js";

describe("ST5-09 MetalGreymon", () => {
  it("gives an own Digimon Blocker when digivolving", async () => {
    const preferred: string[] = [];
    const s = setupEngine({ 0: { battleArea: [{ card: "ST5-08", as: "base" }, { card: "ST5-03", as: "target" }], hand: [{ card: "ST5-09", as: "evolving" }] } }, { autoSelectCards: true, preferInstanceIds: preferred });
    preferred.push(s.perm("target").permanentId);
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("target"), "Blocker"));
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Blocker")).toBe(true);
  });

  it("may grant Blocker to itself and keeps it after another digivolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST5-08", as: "self" }],
        hand: [
          { card: "ST5-09", as: "metalGreymon" },
          { card: "ST5-12", as: "machinedramon" },
        ],
      },
    }, { autoSelectCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("self").permanentId,
      instanceId: s.inst("metalGreymon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("self"), "Blocker"));
    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("self").permanentId,
      instanceId: s.inst("machinedramon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("self").topCard.instanceId === s.inst("machinedramon").instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("self"), "Blocker")).toBe(true);
  });
});
