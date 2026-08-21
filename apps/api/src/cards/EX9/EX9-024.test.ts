import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX9-024.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("EX9-024", () => {
  it("returns a Puppet Digimon from trash by trashing a card from hand on play", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "Return", to: "hand", optional: true, cost: { kind: "trash" }, target: { count: 1 } }));
  it("inherits a once-per-turn attack-ending effect by deleting another Digimon", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenOpponentAttacks", actions: [{ kind: "EndAttack", cost: { kind: "deleteOwn" } }] }] }));

  it("trashes a hand card before returning a Puppet Digimon from trash", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-024", as: "source" }], hand: ["BT1-001"], trash: ["EX9-024"] },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    expect(s.state.players[0].hand.some((card) => card.cardId === "BT1-001")).toBe(false);
    expect(s.state.players[0].hand.some((card) => card.cardId === "EX9-024")).toBe(true);
  });
});
