import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-001.js";
import "../index.js";

describe("EX5-001 Sunmon", () => {
  it("once per turn may digivolve itself from hand when an effect adds its top card to its stack", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "Digivolve", from: ["hand"], reduceCost: 1, target: { filter: { isSelfRef: true } } }],
        },
      ],
    });
  });

  it("digivolves through the public placement trigger and only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["EX5-001"] }],
          hand: [
            { card: "BT1-014", as: "firstEvolution" },
            { card: "BT1-014", as: "secondEvolution" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 2;
    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("host").permanentId,
      addedDigivolutionCardInstanceIds: [s.inst("firstEvolution").instanceId],
      byEffectSeat: 0,
    });
    await settle(
      () => !s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("firstEvolution").instanceId),
    );
    expect(s.perm("host").topCard?.cardId).toBe("BT1-014");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("firstEvolution").instanceId)).toBe(
      false,
    );
    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("host").permanentId,
      addedDigivolutionCardInstanceIds: [s.inst("secondEvolution").instanceId],
      byEffectSeat: 0,
    });
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("secondEvolution").instanceId)).toBe(
      true,
    );
  });

  it("does not react when another Digimon receives the placed card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "host", under: ["EX5-001"] },
          { card: "BT1-009", as: "other" },
        ],
        hand: [{ card: "BT1-014", as: "evolution" }],
      },
    });
    await s.ready();
    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("other").permanentId,
      addedDigivolutionCardInstanceIds: [s.inst("evolution").instanceId],
      byEffectSeat: 0,
    });
    expect(s.perm("host").topCard?.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("evolution").instanceId)).toBe(true);
  });
});
