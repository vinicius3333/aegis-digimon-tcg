import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-031.js";

describe("BT13-031 MirageGaogamon", () => {
  it("registers Evade, Tamer bounce, and the once-per-turn Thomas trigger", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      keywords: [expect.objectContaining({ keyword: "Evade" })],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        { kind: "Return", to: "hand", target: { filter: { controller: "opponent", kind: ["Tamer"] }, count: 1 } },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectAddsToOpponentHand",
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["hand"],
              payCost: false,
              optional: true,
              target: {
                filter: { controller: "mine", nameOrTrait: [{ match: "name", tokens: ["Thomas H. Norstein"] }] },
                count: 1,
              },
            },
          ],
        },
      ],
    });
  });

  it("plays Thomas when an effect adds a card to the opponent's hand", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-031", as: "mirage" }], hand: [{ card: "BT13-097", as: "thomas" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenEffectAddsToOpponentHand", { effectAddedToHandSeat: 1 });
    await settle(
      () => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-097"),
      3000,
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-097")).toBe(true);
  });

  it("exposes Evade as an active keyword", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-031", as: "mirage" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("mirage"), "Evade")).toBe(true);
  });
});
