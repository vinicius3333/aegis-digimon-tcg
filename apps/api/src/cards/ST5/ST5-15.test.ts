import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./ST5-15.js";

describe("ST5-15 Laser Eye", () => {
  it("is fully represented as up-to-two De-Digivolve 1 with the level boundary", () => {
    expect(runtimeCompiledCard("ST5-15")).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "Main",
          actions: [{ kind: "DeDigivolve", amount: 1, stopAtLevel: 3, target: { count: 2, upTo: true } }],
        },
        { trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] },
      ],
    });
  });

  it("De-Digivolves up to 2 opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["ST5-03"], hand: [{ card: "ST5-15", as: "option" }] },
        1: {
          battleArea: [
            { card: "ST5-12", under: [{ card: "ST5-09", as: "base1" }], as: "first" },
            { card: "ST5-13", under: [{ card: "ST5-09", as: "base2" }], as: "second" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("first").topCard.cardId === "ST5-09" && s.perm("second").topCard.cardId === "ST5-09");
    expect(s.state.players[1]!.trash.filter((c) => c.cardId === "ST5-12" || c.cardId === "ST5-13")).toHaveLength(2);
  });
  it("activates Main from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "ST5-15", as: "option", faceUp: true }] },
        1: { battleArea: [{ card: "ST5-12", under: ["ST5-09"], as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    expect(s.perm("target").topCard.cardId).toBe("ST5-09");
  });
});
