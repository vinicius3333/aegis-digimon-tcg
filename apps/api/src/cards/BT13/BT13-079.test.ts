import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-079.js";

describe("BT13-079 Falcomon", () => {
  it("grants Retaliation to one purple Digimon until the opponent's turn ends", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "GainKeyword",
      target: { filter: { controller: "mine", kind: ["Digimon"], colors: ["Purple"] }, count: 1 },
      keyword: { keyword: "Retaliation", raw: "＜Retaliation＞" },
      duration: "untilOpponentTurnEnd",
    });
  });

  it("lets the opponent trash a card when this card is deleted outside battle", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions?.[0]).toMatchObject({
      kind: "Trash",
      chooser: "opponent",
      target: { filter: { controller: "opponent", zone: "hand" }, count: 1 },
      condition: {
        kind: "not",
        condition: { kind: "triggerRemovalCause", removalCause: "byBattle" },
        raw: "deleted outside of a battle",
      },
    });
  });

  it("trashes an opposing hand card when deleted outside battle", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT1-015", as: "host", under: ["BT13-079"] }] }, 1: { hand: ["BT1-001"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);

    expect(s.state.players[1]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-001");
  });

  it("grants Retaliation to a real own purple Digimon on play", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-079", as: "falcomon" },
            { card: "BT13-080", as: "purpleTarget" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("purpleTarget").permanentId, s.perm("purpleTarget").topCard!.instanceId);
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("falcomon"));

    expect(observe(s.engine).hasKeyword(s.perm("purpleTarget"), "Retaliation")).toBe(true);
  });

  it("does not trash from hand when the inherited host is deleted in battle", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT1-015", as: "host", under: ["BT13-079"] }] }, 1: { hand: ["BT1-001"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byBattle");

    expect(s.state.players[1]!.hand).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });
});
