import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-059.js";

describe("BT18-059 Zenimon", () => {
  it("blocks opponent non-Tamer memory gain while preserving Tamer effects", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "AllTurns",
      actions: [{ kind: "RestrictMemoryGain", seat: "opponent", exceptTamerEffects: true, duration: "permanent" }],
    });
    const s = setupEngine({ 0: { battleArea: [{ card: "BT18-059", as: "zenimon" }] } });
    await s.ready();

    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Digimon"])).toBe(false);
    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Option"])).toBe(false);
    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Tamer"])).toBe(true);
    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Digimon", "Tamer"])).toBe(true);
    expect(observe(s.engine).canGainMemoryFromEffect(0, ["Digimon"])).toBe(true);
    assertNoLoudGap(s);
  });

  it("lapses immediately when Zenimon leaves play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT18-059", as: "zenimon" }] } });
    await s.ready();
    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Digimon"])).toBe(false);

    await advance(s.engine).verb.deletePermanent([s.perm("zenimon").permanentId], "byRule");

    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Digimon"])).toBe(true);
    assertNoLoudGap(s);
  });

  it("digivolves from a black level 2 for zero and preserves the source stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-005", as: "egg" }],
        hand: [{ card: "BT18-059", as: "zenimon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("zenimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT18-059");

    expect(s.state.memory).toBe(2);
    expect(s.perm("egg").stack.at(-1)?.cardId).toBe("BT18-005");
    assertNoLoudGap(s);
  });
});
