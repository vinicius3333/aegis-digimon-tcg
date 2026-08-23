import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX7-020.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("EX7-020 Paledramon", () => {
  it("trashes two evolution cards and grants Jamming/Blocker if the opponent has no stacked Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([
      { kind: "TrashDigivolution", amount: 2, fromTop: false },
      { kind: "GainKeyword", keyword: { keyword: "Jamming" }, condition: { kind: "opponentHasNone" } },
      { kind: "GainKeyword", keyword: { keyword: "Blocker" }, condition: { kind: "opponentHasNone" } },
    ]));
  it("grants Ice-Snow and inherits once-per-turn top evolution trash", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({
      kind: "GrantStatic",
      grant: "trait",
      tokens: ["Ice-Snow"],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "TrashDigivolution", amount: 1, fromTop: true }],
    });
  });

  it("trashes two cards from an opposing digivolution stack when digivolving", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX7-020", as: "pale" }] },
      1: { battleArea: [{ card: "BT1-009", under: ["BT1-010", "BT1-011"] }] },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("pale"));
    await settle(() => s.state.players[1]!.battleArea[0]!.stack.length === 0);
    expect(s.state.players[1]!.battleArea[0]!.stack).toHaveLength(0);
  });
});
