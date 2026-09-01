import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-004.js";

describe("BT22-004 Wanyamon", () => {
  it("requires effect provenance for its inherited stack-add watcher", () => {
    const watcher = compiled.effects[0]?.actions[0] as any;
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "onAddDigivolutionCards",
      sourceFilter: { controllerDefault: "mine", byEffect: true },
      triggerFilter: { isSelfRef: true },
      addedDigivolutionCardFilter: {
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
      },
    });
  });

  it("may digivolve its inherited host into a CS Digimon for 1 less after a CS card is added", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-043", under: ["BT22-004", "BT22-044"], as: "host" }],
          hand: [{ card: "BT22-047", as: "next" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    s.state.memory = 3;
    const added = s.perm("host").stack.find((card) => card.cardId === "BT22-044")!;

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("host").permanentId,
      addedDigivolutionCardInstanceIds: [added.instanceId],
      byEffectSeat: 0,
    });
    await settle(() => s.perm("host").topCard?.cardId === "BT22-047");

    expect(s.perm("host").topCard?.cardId).toBe("BT22-047");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT22-004", "BT22-044", "BT22-043"]);
    expect(s.state.memory).toBe(2);
  });

  it("does not offer the evolution for a non-CS addition or a different stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-043", under: ["BT22-004", "BT1-009"], as: "host" },
            { card: "BT22-043", under: ["BT22-044"], as: "otherHost" },
          ],
          hand: ["BT22-047"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const nonCs = s.perm("host").stack.find((card) => card.cardId === "BT1-009")!;
    const cs = s.perm("otherHost").stack.find((card) => card.cardId === "BT22-044")!;

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("host").permanentId,
      addedDigivolutionCardInstanceIds: [nonCs.instanceId],
    });
    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("otherHost").permanentId,
      addedDigivolutionCardInstanceIds: [cs.instanceId],
      byEffectSeat: 0,
    });

    expect(s.perm("host").topCard?.cardId).toBe("BT22-043");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT22-047")).toBe(true);
  });

  it("allows the player to refuse the optional evolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT22-043", under: ["BT22-004", "BT22-044"], as: "host" }],
        hand: ["BT22-047"],
      },
    });
    await s.ready();
    const added = s.perm("host").stack.find((card) => card.cardId === "BT22-044")!;

    const pending = advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("host").permanentId,
      addedDigivolutionCardInstanceIds: [added.instanceId],
      byEffectSeat: 0,
    });
    await settle(() => s.decisions.some((decision) => decision.req.kind === "optional"), 60);
    const prompt = s.decisions.find((decision) => decision.req.kind === "optional");
    expect(prompt).toBeDefined();
    if (prompt !== undefined) {
      s.engine.applyIntent(prompt.seat, {
        type: "respondDecision",
        decisionId: prompt.req.decisionId,
        response: { kind: "optional", accept: false },
      });
    }
    await pending;

    expect(s.perm("host").topCard?.cardId).toBe("BT22-043");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT22-047")).toBe(true);
  });
});
