import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-227.js";
import "./P-228.js";
import "./P-229.js";
import "./P-230.js";
import "./P-231.js";
import "./P-232.js";

const cases = [
  ["P-227", "EX8-065", "ryutaro"],
  ["P-228", "EX8-066", "suzune"],
  ["P-229", "EX9-067", "mirai"],
  ["P-230", "BT19-084", "winr"],
  ["P-231", "BT20-086", "altea"],
  ["P-232", "BT20-090", "yuuki"],
] as const;

describe.each(cases)("%s intrinsic Delay target boundaries", (emblem, tamer, tamerAlias) => {
  it("does not consume the source or hand card for a level-6 non-LIBERATOR candidate", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: emblem, as: "emblem" },
            { card: "BT19-052", as: "base" },
          ],
          hand: [
            { card: tamer, as: tamerAlias },
            { card: "BT1-080", as: "candidate" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.perm("emblem").placedByEffect = true;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst(tamerAlias).instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("base").topCard.cardId).toBe("BT19-052");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("candidate").instanceId)).toBe(true);
    expect(s.perm("emblem").topCard.cardId).toBe(emblem);
  });

  it("does not consume the source or hand card for a level-7 LIBERATOR candidate", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: emblem, as: "emblem" },
            { card: "BT20-077", as: "base" },
          ],
          hand: [
            { card: tamer, as: tamerAlias },
            { card: "BT20-102", as: "candidate" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.perm("emblem").placedByEffect = true;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst(tamerAlias).instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("base").topCard.cardId).toBe("BT20-077");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("candidate").instanceId)).toBe(true);
    expect(s.perm("emblem").topCard.cardId).toBe(emblem);
  });
});
