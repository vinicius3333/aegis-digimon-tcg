import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST14-08.js";
// BT19-071 is the neutral production producer for the deck-mill trigger below.
import "../../cards/BT19/BT19-071.js";

describe("ST14-08 Beelzemon", () => {
  it("mills 4, gains memory per 10 trash, and gains Security Attack +1", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST14-07", as: "beel" }],
        hand: [{ card: "ST14-08", as: "beelCard" }],
        trash: Array.from({ length: 6 }, () => "BT1-009"),
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
      },
    });
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("beel").permanentId,
        instanceId: s.inst("beelCard").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 10);
    expect(s.state.players[0]!.trash).toHaveLength(10);
    expect(s.state.memory).toBe(7);
    expect(observe(s.engine).keywordAmount(s.perm("beel"), "SecurityAttack")).toBe(1);
  });

  it("uses its All Turns once-per-turn memory trigger only once", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST14-08", as: "beel" }],
        trash: [
          ...Array.from({ length: 10 }, () => "BT1-009"),
          { card: "BT19-071", as: "miller1" },
          { card: "BT19-071", as: "miller2" },
        ],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
      },
    });
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).verb.playInstances([s.inst("miller1").instanceId]);
    await settle(() => s.state.players[0]!.deck.length === 2);
    await advance(s.engine).verb.playInstances([s.inst("miller2").instanceId]);
    await settle();
    expect(s.state.memory).toBe(1);
  });

  it("scales the memory gain for every full 10 cards in trash", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST14-08", as: "beel" }],
        trash: [...Array.from({ length: 20 }, () => "BT1-009"), { card: "BT19-071", as: "miller" }],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    await s.ready();
    await advance(s.engine).verb.playInstances([s.inst("miller").instanceId]);
    await settle(() => s.state.players[0]!.deck.length === 0);
    expect(s.state.memory).toBe(2);
  });
});
