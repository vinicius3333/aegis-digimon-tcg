import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-047.js";

describe("EX7-047", () => {
  it("reveals 4 and may play NSp Digimon from among them up to a total play cost of 7", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 4,
      add: [{ count: "all", totalPlayCostBudget: 7, to: "play", optional: true }],
      rest: "deckBottom",
    }));
  it("can DNA digivolve into an NSp card from hand once per turn at end of turn", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "DnaDigivolve", optional: true, materials: { count: 2 }, into: { zone: "hand" } }],
    }));
  it("requires a level 5 NSp Digimon for the alternate evolution", () =>
    expect(compiled.digivolutionRequirement).toContainEqual(
      expect.objectContaining({ level: 5, traits: ["NSp"], cost: 3, isAlternate: true }),
    ));

  it("publicly plays eligible NSp Digimon from the top four up to the total cost 7 boundary", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-047", as: "eldra" }],
          deck: ["EX7-038", "EX7-041", "EX7-045", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("eldra"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX7-041"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX7-038")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX7-041")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX7-045")).toBe(false);
    expect(s.state.players[0]!.deck.at(-2)?.cardId).toBe("EX7-045");
    expect(observe(s.engine).hasKeyword(s.perm("eldra"), "Blocker")).toBe(true);
  });

  it("DNA digivolves two legal NSp materials at end of turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-047", as: "eldra" },
            { card: "BT1-040", as: "blueMaterial" },
            { card: "BT10-064", as: "blackMaterial" },
          ],
          hand: [{ card: "BT18-041", as: "dna" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("blueMaterial").permanentId, s.perm("blackMaterial").permanentId);
    s.state.memory = 5;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("eldra"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT18-041"));

    const result = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT18-041");
    expect(result).toBeDefined();
    expect(result!.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT1-040", "BT10-064"]));
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });
});
