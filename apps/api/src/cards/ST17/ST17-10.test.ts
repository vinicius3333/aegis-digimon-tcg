import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST17-10 Henry Wong", () => {
  it("gains 1 memory at the start of your Main Phase when the opponent has a Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST17-10", as: "henry" }] },
      1: { battleArea: [{ card: "BT1-009" }] },
    });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("henry"));

    expect(s.state.memory).toBe(1);
  });

  it("plays itself from Security without paying its play cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "ST17-10", as: "henry", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("henry"));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "ST17-10")).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("places Henry, Gargomon, and Rapidmon under one Terriermon before the free MegaGargomon digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST17-02", as: "terriermon" },
            { card: "ST17-10", as: "henry" },
          ],
          trash: [{ card: "ST17-05" }, { card: "ST17-07" }],
          hand: [{ card: "ST17-08", as: "mega" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("henry"));
    await settle(() => s.perm("terriermon").topCard.cardId === "ST17-08");

    expect(s.perm("terriermon").topCard.cardId).toBe("ST17-08");
    expect(s.perm("terriermon").stack).toHaveLength(4);
    expect(observe(s.engine).hasKeyword(s.perm("terriermon"), "Rush")).toBe(true);
  });
});
