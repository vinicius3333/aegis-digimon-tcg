import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-060.js";

describe("EX6-060 Belphemon: Rage Mode", () => {
  it("trashes up to three hand cards, suspends one low-level opponent per card, and deletes all lowest-cost suspended Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Trash", target: { count: 3, upTo: true }, trackCount: "trashedCards" },
      { kind: "RepeatPerCount", countSource: "trashedCards", action: { kind: "Suspend" } },
      { kind: "Delete", target: { count: "all", filter: { superlative: "lowestPlayCost" } } },
    ]));
  it("places a Seven Great Demon Lords card under a Gate of Deadly Sins when leaving outside battle", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      leaveCause: "otherThanBattle",
      actions: [
        { kind: "PlaceUnder", target: { from: ["trash"] }, position: "bottom", underFilter: { zone: "breeding" } },
      ],
    }));
  it("publicly trashes available hand cards on play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX6-060", as: "belphe" }], hand: ["BT1-009", "BT1-010"], deck: ["BT1-011"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("belphe"));
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash.length).toBeGreaterThanOrEqual(2);
  });
});
