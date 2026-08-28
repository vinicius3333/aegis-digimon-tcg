import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { EffectTiming } from "@aegis/shared";
import "./BT19-078.js";

describe("BT19-078 ADR-01 Jeri", () => {
  it("compiles DP scaling, restricted Main relocation, and optional inherited redirect", () => {
    const card = runtimeCompiledCard("BT19-078");
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.effects.find((e) => e.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: -1000,
      scaling: { unit: "digivolutionCardsOfFiltered" },
    });
    expect(card?.effects.find((e) => e.trigger === "Main")?.actions[0]).toMatchObject({
      kind: "PlaceUnder",
      targetIsPermanent: true,
      underFilter: { excludeCardsNamed: ["ADR-01 Jeri"] },
    });
    expect(card?.effects.find((e) => e.trigger === "OpponentsTurn")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenOpponentAttacks",
      actions: [
        { kind: "PlayWithoutCost", fromOwnDigivolutionStack: true },
        { kind: "RedirectAttack", optional: true },
      ],
    });
  });

  it("reduces one opposing Digimon by 1000 for each card under one Mother D-Reaper", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-078", as: "jeri" },
            { card: "EX2-007", as: "mother", under: ["EX2-046", "EX2-046"] },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 6000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("jeri"));
    expect(s.perm("victim").currentDP).toBe(4000);
  });
});
