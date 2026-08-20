import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-085.js";

describe("BT23-085 Ryuji Mishima", () => {
  it("suspends Ryuji and uses a single-color CS Option when an own Hudie Digimon suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-085", as: "ryuji" },
            { card: "BT23-101", as: "hudie" },
          ],
          hand: [{ card: "BT23-100", as: "option" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;

    await s.engine.recomputeContinuousEffects();
    await advance(s.engine).fireSubTrigger("whenSuspended", {
      subjectPermanentId: s.perm("hudie").permanentId,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));

    expect(s.perm("ryuji").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === optionId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
  });

  it("gains memory when a CS Digimon is present", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase") as any;
    expect(effect.actions[0]).toMatchObject({ kind: "GainMemory", amount: 1, condition: { kind: "youHave" } });
  });

  it("grants one Hudie Digimon DP-reduction immunity, Reboot, and Blocker", () => {
    const actions = (compiled.effects.find((entry) => entry.trigger === "OnPlay") as any).actions;
    expect(actions[0]).toMatchObject({
      kind: "Restrict",
      restriction: "dpImmune",
      byOpponentEffectsOnly: true,
      duration: "untilOpponentTurnEnd",
    });
    expect(actions.slice(1).map((action: any) => action.keyword.keyword)).toEqual(["Reboot", "Blocker"]);
    expect(actions.every((action: any) => action.target.sameTarget === true || action === actions[0])).toBe(true);
  });

  it("uses a single-color CS Option from hand when a Hudie Digimon suspends", () => {
    const watcher = (compiled.effects.find((entry) => entry.trigger === "AllTurns") as any).actions[0];
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      cost: { kind: "suspend", target: { isSelf: true, filter: { isSelfRef: true } } },
    });
    expect(watcher.actions[0]).toMatchObject({
      kind: "UseOptionWithoutCost",
      from: ["hand"],
      filter: { kind: ["Option"], singleColor: true },
      optional: true,
    });
  });
});
