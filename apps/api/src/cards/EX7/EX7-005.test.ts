import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-005.js";
describe("EX7-005 Kapurimon", () => {
  it("inherits a once-per-turn Three Musketeers Option watcher", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          triggerFilter: { isSelfRef: true },
          addedDigivolutionCardFilter: {
            kind: ["Option"],
            nameOrTrait: [{ tokens: ["Three Musketeers"], match: "trait" }],
          },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    }));

  it("publicly gains memory when an effect places a Three Musketeers Option under its host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["EX7-005"] }],
        hand: [{ card: "EX7-066", as: "option" }],
      },
    });
    await s.ready();
    s.state.memory = 2;

    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("option").instanceId]);

    expect(s.state.memory).toBe(3);
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });

  it("ignores another stack and non-matching cards without consuming its once-per-turn use", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "host", under: ["EX7-005"] },
          { card: "BT1-009", as: "other" },
        ],
        hand: [
          { card: "EX7-066", as: "otherOption" },
          { card: "BT1-104", as: "plainOption" },
          { card: "EX7-059", as: "musketeerDigimon" },
          { card: "EX7-066", as: "first" },
          { card: "EX7-070", as: "second" },
        ],
      },
    });
    await s.ready();
    s.state.memory = 2;
    const place = async (host: string, card: string) => {
      await advance(s.engine).verb.placeUnder(s.perm(host).permanentId, [s.inst(card).instanceId]);
      expect(s.perm(host).stack.some((source) => source.instanceId === s.inst(card).instanceId)).toBe(true);
    };

    await place("other", "otherOption");
    expect(s.state.memory).toBe(2);
    await place("host", "plainOption");
    expect(s.state.memory).toBe(2);
    await place("host", "musketeerDigimon");
    expect(s.state.memory).toBe(2);
    await place("host", "first");
    expect(s.state.memory).toBe(3);
    await place("host", "second");
    expect(s.state.memory).toBe(3);
  });

  it("does not gain memory during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["EX7-005"] }],
        hand: [{ card: "EX7-066", as: "option" }],
      },
    });
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = -2;
    await advance(s.engine).recompute();

    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("option").instanceId]);

    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
    expect(s.state.memory).toBe(-2);
  });
});
