import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-050.js";

describe("EX6-050 Feresmon", () => {
  it("has Blocker and gains memory/trashes the opponent's hand on digivolving/deletion based on hand size", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords?.[0]?.keyword).toBe("Blocker");
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([
      { kind: "GainMemory", amount: 1, condition: { kind: "zoneCount", op: "lte", value: 5 } },
      { kind: "Trash", controller: "opponent", condition: { kind: "zoneCount", op: "gte", value: 7 } },
    ]);
  });
  it("inherits optional opponent hand trash, or plays a purple level 3 from trash if they decline", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        { kind: "Trash", controller: "opponent", optional: true },
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          optional: true,
          condition: { kind: "ifThisEffectDidNotAct" },
        },
      ],
    }));
  it("publicly gains 1 memory on digivolving while the opponent has five cards or fewer", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX6-050", as: "feres" }] } }, { autoAcceptOptional: true });
    await s.ready();
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("feres"));
    expect(s.state.memory).toBe(1);
  });
  it("publicly trashes one opponent hand card on digivolving at seven cards without gaining memory", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-050", as: "feres" }] },
        1: { hand: Array.from({ length: 7 }, () => "BT1-010") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("feres"));
    await settle(() => s.state.players[1]!.hand.length === 6);
    expect(s.state.players[1]!.hand).toHaveLength(6);
    expect(s.state.memory).toBe(0);
  });
});
