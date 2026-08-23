import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX7-012.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("EX7-012 Lavogaritamon", () => {
  it("deletes a 6000 DP or lower Digimon on play", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { dp: { op: "lte", value: 6000 } } },
    }));
  it("gains memory when no opposing Digimon is at 6000 DP or less and inherits Security Attack +1", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: { kind: "opponentHasNone" },
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords?.[0]).toMatchObject({
      keyword: "SecurityAttack",
      amount: 1,
    });
  });

  it("deletes an eligible opponent on play and gains memory when none qualifies on digivolving", async () => {
    const deletion = setupEngine({
      0: { battleArea: [{ card: "EX7-012", as: "lava" }] },
      1: { battleArea: [{ card: "BT1-009", dp: 6000 }] },
    });
    await deletion.ready();
    await advance(deletion.engine).fire(EffectTiming.OnPlay, deletion.perm("lava"));
    await settle(() => deletion.state.players[1]!.battleArea.length === 0);
    expect(deletion.state.players[1]!.battleArea).toHaveLength(0);

    const gain = setupEngine({
      0: { battleArea: [{ card: "EX7-012", as: "lava" }] },
      1: { battleArea: [{ card: "BT1-009", dp: 7000 }] },
    });
    await gain.ready();
    gain.state.memory = 3;
    await advance(gain.engine).fire(EffectTiming.WhenDigivolving, gain.perm("lava"));
    await settle(() => gain.state.memory === 4);
    expect(gain.state.memory).toBe(4);
  });
});
