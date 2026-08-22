import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX11-020.js";
import "../index.js";

describe("EX11-020 Hanimon", () => {
  it("plays a Shoemon from hand when deleted outside battle", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-020", as: "hanimon" }], hand: [{ card: "EX11-019", as: "shoemon" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 10;
    await advance(s.engine).fire(EffectTiming.OnDeletion, s.perm("hanimon"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX11-019"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX11-019")).toBe(true);
  });
});
