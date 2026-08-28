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

  it.each(["EX8-047", "EX8-046"])("gains memory when trashed from a Mineral or Rock host (%s)", async (host) => {
    const s = setupEngine({
      0: { battleArea: [{ card: host, as: "host", under: [{ card: "EX8-005", as: "discarded" }] }] },
    });
    await s.ready();
    s.state.memory = 0;
    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("host").permanentId,
      [s.inst("discarded").instanceId],
      0,
    );
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });

  it("does not gain memory when this card is trashed from a non-Mineral/Rock host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "host", under: [{ card: "EX8-005", as: "discarded" }] }] },
    });
    await s.ready();
    s.state.memory = 0;
    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("host").permanentId,
      [s.inst("discarded").instanceId],
      0,
    );
    expect(s.state.memory).toBe(0);
  });

  it("does not gain memory when another digivolution card is trashed but Tumblemon remains in the stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "EX8-055",
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
