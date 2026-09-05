import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-056.js";

describe("EX6-056 Beelzemon", () => {
  it("has Rush, trashes four deck cards, and de-digivolves an opponent by two when your trash has ten cards", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords?.[0]?.keyword).toBe("Rush");
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "TrashTopDeck", amount: 4 },
      { kind: "DeDigivolve", amount: 2, stopAtLevel: 3, condition: { kind: "youHave", count: 10 } },
    ]);
  });
  it("places a Seven Great Demon Lords card under a Gate of Deadly Sins in breeding when leaving outside battle", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      leaveCause: "otherThanBattle",
      sourceFilter: { isSelfRef: true },
      actions: [{ kind: "PlaceUnder", target: { from: ["trash"] }, underFilter: { zone: "breeding" } }],
    }));
  it("publicly trashes four cards from the deck on play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX6-056", as: "beelze" }],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        trash: Array.from({ length: 10 }, () => "BT1-009"),
      },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("beelze"));
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.trash.length).toBeGreaterThanOrEqual(14);
  });
});
