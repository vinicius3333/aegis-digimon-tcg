import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-039.js";

describe("EX7-039", () => {
  // Only the trash is optional: once it is paid, the draw and the memory gain are mandatory,
  // so the GainMemory action must never carry `optional` (it would raise a second prompt).
  it("draws one and gains 1 memory by trashing a Rock Dragon or Earth Dragon from hand", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions).toMatchObject([
      { kind: "Draw", amount: 1, cost: { kind: "trash" } },
      { kind: "GainMemory", amount: 1, optional: false },
    ]));
  it("has Machine Dragon as a rule trait and inherits +2000 DP during the opponent's turn", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({
      kind: "GrantStatic",
      tokens: ["Machine Dragon"],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      duration: "permanent",
    });
  });

  it("gains the memory without a second prompt once the trash cost is paid", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX7-039", as: "jazamon" }], hand: ["BT2-011"], deck: ["BT1-001"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("jazamon"));
    await settle(() => s.state.memory === 1);

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT2-011")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true);
    expect(s.decisions.filter((decision) => decision.req.kind === "optional")).toHaveLength(1);
  });

  it("does not draw or gain memory without a qualifying hand card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX7-039", as: "jazamon" }], deck: ["BT1-001"] } });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("jazamon"));
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
