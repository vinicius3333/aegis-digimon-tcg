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

  it("respects the 6000 DP boundary for deletion and memory gain", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX7-012", as: "lava" }] },
      1: { battleArea: [{ card: "BT1-009", dp: 7000, as: "target" }] },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("lava"));
    await settle(() => false, 20);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);

    s.state.memory = 3;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("lava"));
    await settle(() => false, 20);
    expect(s.state.memory).toBe(4);

    const blocked = setupEngine({
      0: { battleArea: [{ card: "EX7-012", as: "lava" }] },
      1: { battleArea: [{ card: "BT1-009", dp: 6000, as: "target" }] },
    });
    await blocked.ready();
    blocked.state.memory = 3;
    await advance(blocked.engine).fire(EffectTiming.WhenDigivolving, blocked.perm("lava"));
    await settle(() => false, 20);
    expect(blocked.state.memory).toBe(3);
  });

  it("uses inherited Security Attack +1 to check two security cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "attacker", under: ["EX7-012"] }] },
      1: { security: ["EX7-069", "EX7-069"] },
    });
    await s.ready();
    expect(s.perm("attacker").securityAttack).toBe(2);
  });
});
