import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-073.js";

describe("BT23-073 Eater Bit", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-073")).toMatchObject({
      cardId: "BT23-073",
      nameEn: "Eater Bit",
      colors: ["White"],
      kinds: ["Digimon"],
      playCost: 3,
      dp: 1000,
      evoCosts: [],
      forms: ["Eater"],
      attributes: ["-"],
      types: ["Hudie", "CS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

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

  it("deletes itself to prevent another Hudie from leaving through an opponent effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-073", as: "bit" },
            { card: "BT23-048", as: "ally" },
          ],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const allyId = s.perm("ally").permanentId;
    await advance(s.engine).verb.deletePermanent([allyId], "byEffect");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === allyId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT23-073")).toBe(false);
  });

  it("places itself under breeding Mother Eater to prevent another Hudie from leaving", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT22-007", as: "mother" },
          battleArea: [
            { card: "BT23-073", as: "bit" },
            { card: "BT23-048", as: "ally" },
          ],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, preferOptionIndex: 1, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const allyId = s.perm("ally").permanentId;
    const bitId = s.perm("bit").topCard!.instanceId;
    await advance(s.engine).verb.deletePermanent([allyId], "byEffect");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === allyId)).toBe(true);
    expect(s.perm("mother").stack.some((card) => card.instanceId === bitId)).toBe(true);
  });

  it("from breeding reduces the first Eater play cost by 1", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT22-007", under: ["BT23-073"], as: "mother" },
          hand: [{ card: "BT23-073", as: "bit" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bit").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT23-073"));
    expect(s.state.memory).toBe(3);
  });
});
