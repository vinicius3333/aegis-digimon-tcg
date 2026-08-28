import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-009.js";

describe("BT18-009 Shamanmon", () => {
  it("blocks opponent non-Tamer memory gain while preserving Tamer effects", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "AllTurns",
      actions: [{ kind: "RestrictMemoryGain", seat: "opponent", exceptTamerEffects: true, duration: "permanent" }],
    });
    const s = setupEngine({ 0: { battleArea: [{ card: "BT18-009", as: "shamanmon" }] } });
    await s.ready();
    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Digimon"])).toBe(false);
    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Option"])).toBe(false);
    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Tamer"])).toBe(true);
    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Digimon", "Tamer"])).toBe(true);
    expect(observe(s.engine).canGainMemoryFromEffect(0, ["Digimon"])).toBe(true);
  });

  it("blocks a natural opponent Digimon On Deletion memory gain", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-009", as: "shamanmon" }],
          hand: [{ card: "BT18-008", as: "goblimon" }],
        },
        1: { battleArea: [{ card: "BT14-069", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("goblimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("target").permanentId));
    expect(s.state.memory).toBe(7);
  });

  it("digivolves from a red level 2 for 0 and preserves the source stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-001", as: "egg" }],
        hand: [{ card: "BT18-009", as: "shamanmon" }],
      },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("shamanmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT18-009");
    expect(s.state.memory).toBe(2);
    expect(s.perm("egg").stack.at(-1)?.cardId).toBe("BT1-001");
  });
});
