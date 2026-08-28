import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./ST5-16.js";

describe("ST5-16 Dark Side Attack", () => {
  it("is fully represented with the play-cost-seven boundary", () => {
    expect(runtimeCompiledCard("ST5-16")).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "Main",
          actions: [{ kind: "Delete", target: { count: 1, filter: { playCost: { op: "lte", value: 7 } } } }],
        },
        { trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] },
      ],
    });
  });

  it("deletes an opposing Digimon with play cost 7 or less", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["ST5-03"], hand: [{ card: "ST5-16", as: "option" }] },
        1: {
          battleArea: [
            { card: "ST5-09", as: "target" },
            { card: "ST5-12", as: "tooExpensive" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.trash.some((c) => c.cardId === "ST5-09")).toBe(true);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("tooExpensive").permanentId);
  });
  it("activates Main from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "ST5-16", as: "option", faceUp: true }] },
        1: { battleArea: [{ card: "ST5-09", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
