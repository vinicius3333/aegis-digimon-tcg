import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
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
          affectsAll: true,
          cost: {
            kind: "place",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            targetIsPermanent: true,
            shedOwnCards: true,
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
            { card: "P-154", as: "mail", under: [{ card: "BT2-052", as: "mailSource" }] },
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
    expect(s.perm("knight").stack.map((card) => card.instanceId)).toEqual([s.inst("mail").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("mailSource").instanceId]);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "P-154")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("knight"), "Blocker")).toBe(true);
  });

  it("prevents all simultaneous Knightmon-text Digimon from leaving for one placement", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-154", as: "mail" },
            { card: "AD1-018", as: "knight1" },
            { card: "AD1-018", as: "knight2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const knight1Id = s.perm("knight1").permanentId;
    const knight2Id = s.perm("knight2").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    try {
      expect(await advance(s.engine).verb.deletePermanent([knight1Id, knight2Id], "byEffect")).toBe(0);
    } finally {
      advance(s.engine).verb.leaveEffectResolution();
    }

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual(
      expect.arrayContaining([knight1Id, knight2Id]),
    );
    const knightStacks = [s.perm("knight1"), s.perm("knight2")].filter((permanent) =>
      permanent.stack.some((card) => card.instanceId === s.inst("mail").instanceId),
    );
    expect(knightStacks).toHaveLength(1);
  });
});
