import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-154.js";

describe("P-154 Maildramon", () => {
  it("encodes the opponent-effect leave replacement for other Knightmon-text Digimon", () => {
    const replacement = runtimeCompiledCard("P-154")!.effects[0]!;
    expect(replacement).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: {
            controller: "mine",
            excludeSelf: true,
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Knightmon"], match: "text" }],
          },
          leaveCause: "byOpponentEffect",
          cost: {
            kind: "place",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            targetIsPermanent: true,
            destination: "digivolutionStack",
            position: "bottom",
            host: "triggerSource",
          },
        },
      ],
    });
  });

  it("encodes inherited Blocker", () => {
    expect(runtimeCompiledCard("P-154")!.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Static",
          isInherited: true,
          keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
        }),
      ]),
    );
  });

  it("does not replace removal of a Digimon without Knightmon in its text", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "P-154", as: "mail" },
          { card: "BT1-009", as: "nonKnightmon" },
        ],
      },
    });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("nonKnightmon").permanentId], "byEffect");
    await settle();
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT1-009")).toBe(false);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "P-154")).toBe(true);
  });

  it("places itself under another Knightmon-text Digimon to prevent an opponent effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-154", as: "mail" },
            { card: "AD1-018", as: "knight" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const knightId = s.perm("knight").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    try {
      expect(await advance(s.engine).verb.deletePermanent([knightId], "byEffect")).toBe(0);
    } finally {
      advance(s.engine).verb.leaveEffectResolution();
    }
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === knightId)).toBe(true);
    expect(s.perm("knight").stack.map((card) => card.cardId)).toContain("P-154");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "P-154")).toBe(false);
  });
});
