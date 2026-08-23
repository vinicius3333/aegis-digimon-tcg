import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT24-021.js";
import "../index.js";

describe("BT24-021 SnowGoblimon", () => {
  it("reveals three cards for one Demon/Shaman Digimon and one Titan card", () => {
    const reveal = compiled.effects.find((effect) => effect.trigger === "OnPlay")?.actions?.[0] as any;
    expect(reveal).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
    expect(reveal.add).toHaveLength(2);
  });

  it("digivolves this Demon/Titan Digimon from trash after the hand is trashed", () => {
    const inherited = compiled.effects.find((effect) => effect.isInherited) as any;
    const action = inherited.actions[0].actions[0];
    expect(action.target).toMatchObject({ filter: { isSelfRef: true }, isSelf: true });
    expect(action.condition).toMatchObject({ kind: "selfHasTrait" });
    expect(action).toMatchObject({
      kind: "Digivolve",
      from: ["trash"],
      payCost: true,
      reduceCost: 1,
      optional: true,
    });
  });

  it("uses an exact Tsunomon alternate evolution requirement", () => {
    expect(compiled.digivolutionRequirement).toContainEqual({
      namesExact: ["Tsunomon"],
      cost: 0,
      isAlternate: true,
    });
  });

  it("adds one Shaman Digimon and one Titan card from the top three", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-021", as: "snowGoblimon" }],
          deck: [
            { card: "BT24-014", as: "shaman" },
            { card: "BT24-015", as: "titan" },
            { card: "BT1-009", as: "miss" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("snowGoblimon"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("shaman").instanceId, s.inst("titan").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("miss").instanceId]);
  });

  it("digivolves its Titan host into Titamon from trash with cost reduced by one, once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-072", as: "host", under: ["BT24-021"] }],
          hand: [
            { card: "BT1-009", as: "firstDiscard" },
            { card: "BT1-010", as: "secondDiscard" },
          ],
          trash: [
            { card: "P-209", as: "titamon" },
            { card: "BT24-072", as: "secondTitan" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).verb.trash([s.inst("firstDiscard").instanceId], 0);
    await settle(() => s.perm("host").topCard.instanceId === s.inst("titamon").instanceId);
    await advance(s.engine).verb.trash([s.inst("secondDiscard").instanceId], 0);

    expect(s.perm("host").topCard.instanceId).toBe(s.inst("titamon").instanceId);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("secondTitan").instanceId);
  });

  it.each([
    ["exact Tsunomon", "BT11-006", 0],
    ["level 2 TS Digi-Egg", "BT24-003", 1],
  ])("digivolves from %s for cost 0", async (_label, baseCard, alternateRequirementIndex) => {
    const s = setupEngine({
      0: {
        breeding: { card: baseCard, as: "base" },
        hand: [{ card: "BT24-021", as: "snowGoblimon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("snowGoblimon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("snowGoblimon").instanceId);

    expect(s.state.memory).toBe(5);
  });
});
