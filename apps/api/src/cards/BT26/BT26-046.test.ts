import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-046.js";
import "../index.js";

describe("BT26-046 Gryphonmon", () => {
  it("encodes printed Piercing/Vortex, suspended-Digimon cost reduction, and Q7039 independent targets", () => {
    expect(digivolutionRequirementsFor("BT26-046")).toContainEqual({
      level: 5,
      traits: ["TS"],
      cost: 3,
      isAlternate: true,
    });
    expect(compiled.effects?.[0]?.keywords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keyword: "Piercing" }),
        expect.objectContaining({ keyword: "Vortex" }),
      ]),
    );
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Static",
      actions: [{ kind: "Replacement", mode: "reduceCost", amount: 4 }],
    });
    expect(compiled.effects?.[2]?.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "Suspend" }),
        expect.objectContaining({ kind: "Restrict", restriction: "unsuspend" }),
        expect.objectContaining({ kind: "Restrict", restriction: "beDeletedInBattle" }),
      ]),
    );
    expect(compiled.effects?.[0]?.actions).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "GrantStatic", grant: "trait", tokens: ["Avian"] })]),
    );
  });

  it("publicly suspends and locks an opponent target while protecting one of your Digimon in battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-046", as: "gryphonmon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("gryphonmon"));

    expect(s.perm("opponent").isSuspended).toBe(true);
    const continuous = (
      s.engine as unknown as { continuous: { hasRestriction: (id: string, kind: string) => boolean } }
    ).continuous;
    expect(continuous.hasRestriction(s.perm("opponent").permanentId, "unsuspend")).toBe(true);
    expect(continuous.hasRestriction(s.perm("gryphonmon").permanentId, "beDeletedInBattle")).toBe(true);
  });
});
