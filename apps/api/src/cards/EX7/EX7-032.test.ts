import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX7-032.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("EX7-032", () => {
  it("plays Shoto Kazama from hand when digivolving with one or fewer Tamers", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      condition: {
        kind: "zoneCount",
        seat: "mine",
        zone: "battleArea",
        filter: { kind: ["Tamer"] },
        op: "lte",
        value: 1,
      },
      target: { count: 1 },
    }));
  it("inherits once-per-turn memory gain after a Digimon is deleted in battle", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenDeletesInBattle",
      sourceFilter: { isSelfRef: true },
      actions: [{ kind: "GainMemory", amount: 1 }],
    }));
  it("plays Shoto Kazama from hand when there is one or fewer Tamers", async () => {
    const s = setupEngine(
      { 0: { hand: ["EX7-064"], battleArea: [{ card: "EX7-032", as: "galemon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("galemon"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX7-064")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX7-064")).toBe(false);
  });

  it("does not play Shoto when two Tamers are already in play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: ["EX7-064"],
          battleArea: [
            { card: "EX7-032", as: "galemon" },
            { card: "EX7-064", as: "first" },
            { card: "BT1-085", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("galemon"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX7-064")).toBe(true);
  });
});
