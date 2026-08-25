import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT23-080.js";

describe("BT23-080 Yu Nogi", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-080")).toMatchObject({
      cardId: "BT23-080",
      nameEn: "Yu Nogi",
      colors: ["Blue", "Yellow"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["CS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("gains start-main memory only with an opposing Digimon on Yu's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT23-080", as: "yu" }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    const fire = () =>
      (s.engine as unknown as { fireTiming(timing: EffectTiming): Promise<void> }).fireTiming(
        EffectTiming.OnStartMainPhase,
      );
    await fire();
    expect(s.state.memory).toBe(1);
    s.state.turnSeat = 1;
    await fire();
    expect(s.state.memory).toBe(1);
  });

  it("places the deleted CS Digimon on top of security and returns this Tamer to deck bottom", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-080", as: "yu" },
            { card: "BT23-006", as: "subject" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const subjectId = s.perm("subject").permanentId;
    await advance(s.engine).verb.deletePermanent([subjectId], "byEffect");

    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === subjectId)).toBe(false);
    expect(s.state.players[0]!.security[0]?.cardId).toBe("BT23-006");
    expect(s.state.players[0]!.deck.some((card) => card.cardId === "BT23-080")).toBe(true);
  });

  it("prevents battle deletion by moving the exact CS subject to top security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-080", as: "yu" },
            { card: "BT23-006", as: "subject" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const subjectId = s.perm("subject").topCard!.instanceId;
    const deleted = await advance(s.engine).verb.deletePermanent([s.perm("subject").permanentId], "byBattle");
    expect(deleted).toBe(0);
    expect(s.state.players[0]!.security[0]?.instanceId).toBe(subjectId);
  });

  it("may decline the cost, leaving Yu in play and allowing deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-080", as: "yu" },
            { card: "BT23-006", as: "subject" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const deleted = await advance(s.engine).verb.deletePermanent([s.perm("subject").permanentId], "byEffect");
    expect(deleted).toBe(1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT23-080")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("keeps the replacement limited to CS Digimon", () => {
    const replacement = (compiled.effects.find((entry) => entry.trigger === "AllTurns") as any).actions[0];
    expect(replacement.event).toBe("wouldBeDeleted");
    expect(replacement.sourceFilter.nameOrTrait).toEqual([{ tokens: ["CS"], match: "trait" }]);
    expect(replacement.actions[0].source.sourceRef).toBe("triggerSubject");
    expect(replacement.actions[0].cost.to).toBe("deckBottom");
  });
});
