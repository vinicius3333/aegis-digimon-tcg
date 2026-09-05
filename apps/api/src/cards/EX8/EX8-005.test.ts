import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-005.js";

describe("EX8-005", () => {
  it("inherits gaining 1 memory when discarded from a Mineral or Rock host", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onDigivolutionCardsDiscardedBatch",
      sourceFilter: { isSelfRef: true },
      hostFilter: { nameOrTrait: [{ tokens: ["Mineral", "Rock"], match: "trait" }] },
      actions: [{ kind: "GainMemory", amount: 1 }],
    }));

  it.each([
    ["EX8-047", 5],
    ["EX8-046", 5],
    ["BT2-055", 6],
  ] as const)("checks the %s host after an opposing public On Play discards Tumblemon", async (host, memory) => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX8-022", as: "frigimon" }] },
        1: { battleArea: [{ card: host, as: "host", under: [{ card: "EX8-005", as: "discarded" }] }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    const sourceId = s.inst("discarded").instanceId;
    const playedId = s.inst("frigimon").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: playedId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === sourceId));
    await settle(() => s.state.memory === memory);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(sourceId);
    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === playedId)).toBe(true);
    // Frigimon costs 5 and gains 1 after removing the last source. Tumblemon's
    // opposing-controller memory gain subtracts 1 only for Mineral/Rock hosts.
    expect(s.state.memory).toBe(memory);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not gain memory when another digivolution card is trashed but Tumblemon remains in the stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "EX8-048",
            as: "host",
            under: [
              { card: "EX8-005", as: "tumblemon" },
              { card: "EX8-046", as: "otherSource" },
            ],
          },
        ],
      },
    });
    await s.ready();
    s.state.memory = 0;
    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("host").permanentId,
      [s.inst("otherSource").instanceId],
      0,
    );
    expect(s.state.memory).toBe(0);
  });
});
