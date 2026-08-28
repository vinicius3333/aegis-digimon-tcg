import { describe, expect, it } from "vitest";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { compiled } from "./EX9-046.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-046", () => {
  it("reveals three and adds a Negamon-text card and Abbadomon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "deckBottom",
      add: [
        { to: "hand", filter: { nameOrTrait: [{ tokens: ["Negamon"], match: "text" }] } },
        { to: "hand", filter: { nameOrTrait: [{ tokens: ["Abbadomon"], match: "name" }] } },
      ],
    }));
  it("inherits +1000 DP", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }],
    }));
  it("reveals the top three and adds both matching cards while bottoming the rest", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX9-046", as: "source" }], deck: ["BT1-009", "EX9-055", "BT1-010"] } },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    const player = s.state.players[0] as PlayerState;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => player.hand.some((card) => card.cardId === "EX9-055"));
    expect(player.hand.some((card) => card.cardId === "EX9-055")).toBe(true);
    expect(player.deck.at(-1)?.cardId).toBe("BT1-010");
  });
});
