import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-003.js";

describe("BT17-003 Bibimon", () => {
  it("exports the once-per-turn inherited Tamer-placement watcher", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          expect.objectContaining({
            kind: "SubTrigger",
            event: "onAddDigivolutionCards",
            triggerFilter: { isSelfRef: true },
            addedDigivolutionCardFilter: { kind: ["Tamer"] },
            actions: [{ kind: "GainMemory", amount: 1 }],
          }),
        ],
      }),
    );
  });

  it("Q2703: gains memory only when an effect places a Tamer in this inherited host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT6-030", under: ["BT17-003"], as: "host" },
          { card: "BT1-021", as: "otherHost" },
        ],
        hand: [
          { card: "BT1-010", as: "digimon" },
          { card: "BT1-085", as: "wrongHostTamer" },
          { card: "BT1-085", as: "hostTamer" },
        ],
      },
    });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("digimon").instanceId]);
    expect(s.state.memory).toBe(0);

    await advance(s.engine).verb.placeUnder(s.perm("otherHost").permanentId, [s.inst("wrongHostTamer").instanceId]);
    expect(s.state.memory).toBe(0);

    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("hostTamer").instanceId]);
    expect(s.state.memory).toBe(1);
    expect(s.perm("host").stack.some((card) => card.cardId === "BT1-085")).toBe(true);
  });

  it("gains memory only once per turn across separate Tamer placements", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-030", under: ["BT17-003"], as: "host" }],
        hand: [
          { card: "BT1-085", as: "firstTamer" },
          { card: "BT1-085", as: "secondTamer" },
        ],
      },
    });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("firstTamer").instanceId]);
    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("secondTamer").instanceId]);

    expect(s.state.memory).toBe(1);
    expect(s.perm("host").stack.filter((card) => card.cardId === "BT1-085")).toHaveLength(2);
  });

  it("does not gain memory on the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-030", under: ["BT17-003"], as: "host" }],
        hand: [{ card: "BT1-085", as: "tamer" }],
      },
    });
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("tamer").instanceId]);

    expect(s.state.memory).toBe(0);
    expect(s.perm("host").stack.some((card) => card.cardId === "BT1-085")).toBe(true);
  });
});
