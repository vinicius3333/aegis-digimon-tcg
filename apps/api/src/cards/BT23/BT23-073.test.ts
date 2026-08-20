import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-073.js";

describe("BT23-073 Eater Bit", () => {
  it("deletes an opposing level 3 while leaving a non-level-3 Digimon in play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT23-073", as: "bit" }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "level3" },
          { card: "BT23-101", as: "other" },
        ],
      },
    });
    const level3Id = s.perm("level3").permanentId;
    const otherId = s.perm("other").permanentId;
    await (
      s.engine as unknown as {
        fireTiming(timing: EffectTiming, trigger: Record<string, unknown>): Promise<void>;
      }
    ).fireTiming(EffectTiming.OnPlay, { subjectPermanentId: s.perm("bit").permanentId });

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === level3Id)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === otherId)).toBe(true);
  });

  it("deletes an opponent level 3 Digimon on play", () => {
    const onPlay = (compiled.effects.find((entry) => entry.trigger === "OnPlay") as any).actions[0];
    expect(onPlay).toMatchObject({
      kind: "Delete",
      target: { count: 1, filter: { controller: "opponent", levels: [3] } },
    });
  });

  it("offers the two correct leave-prevention costs for another Eater/Hudie Digimon", () => {
    const replacement = (compiled.effects.find((entry) => entry.trigger === "AllTurns") as any).actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "otherThanYourEffect",
      sourceFilter: { controller: "mine", excludeSelf: true },
    });
    const prevent = replacement.actions[0];
    expect(prevent.costOptions.map((cost: any) => cost.kind)).toEqual(["deleteOwn", "place"]);
    expect(prevent.costOptions[1]).toMatchObject({
      targetIsPermanent: true,
      destination: "digivolutionStack",
      position: "bottom",
      host: { filter: { zone: "breeding", nameOrTrait: [{ tokens: ["Mother Eater"], match: "name" }] } },
    });
  });

  it("keeps the inherited Eater play-cost reduction once per turn in breeding", () => {
    const inherited = compiled.effects.find((entry) => entry.trigger === "YourTurn") as any;
    expect(inherited).toMatchObject({ isInherited: true, isBreeding: true, frequency: "OncePerTurn" });
    expect(inherited.actions[0]).toMatchObject({ kind: "Replacement", event: "wouldBePlayed" });
  });
});
