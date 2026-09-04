import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-048.js";

describe("EX7-048", () => {
  it("reveals 6 and may use a Three Musketeers Option without paying its cost", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "RevealAdd",
        revealCount: 6,
        add: [{ count: 1, to: "useOption", payCost: false, optional: true }],
        rest: "deckTopOrBottom",
      });
  });
  it("prevents a Three Musketeers Digimon from leaving play by trashing an Option in its digivolution cards", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "otherThanYourEffect",
      mode: "prevent",
      cost: {
        kind: "trash",
        target: {
          count: 1,
          filter: {
            zone: "digivolutionCards",
            kind: ["Option"],
            hostFilter: { isSelfRef: true },
          },
        },
      },
    }));

  it("publicly pays the replacement with its under-stack Option and stays in play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-048", as: "gundra", under: ["EX7-066"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("gundra"), "Blocker")).toBe(true);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("gundra").permanentId], "byEffect")).toBe(0);
    expect(s.state.players[0]!.battleArea).toContain(s.perm("gundra"));
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX7-066")).toBe(true);
  });
});
