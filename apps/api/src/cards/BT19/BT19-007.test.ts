import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT19-007 Guilmon", () => {
  it.each(["BT19-080", "BT19-077"])("gains 1 memory with %s at the start of its main phase", async (support) => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT19-007", as: "guilmon" }, { card: support }] } });
    s.state.memory = 0;

    await advance(s.engine).runTurn(0);

    expect(s.state.memory).toBe(1);
  });

  it("does not gain memory without Takato Matsuki or Calumon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT19-007", as: "guilmon" }, { card: "BT19-081" }] } });
    s.state.memory = 0;

    await advance(s.engine).runTurn(0);

    expect(s.state.memory).toBe(0);
  });

  it.each([
    [0, true],
    [1, false],
  ])("applies its numeric DP deletion bonus at memory %i: %s", async (memory, deletesTarget) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-012", as: "base", under: ["BT19-007"] }],
          hand: [{ card: "BT19-015", as: "host" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 9000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = memory + 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0, 20);

    expect(s.state.players[1]!.battleArea).toHaveLength(deletesTarget ? 0 : 1);
  });

  it("does not add to a DP maximum that references the source Digimon's DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-014", as: "host", under: ["BT19-007"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 13000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = -1;
    await advance(s.engine).recompute();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 20);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
