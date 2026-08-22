import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-088.js";

describe("BT13-088 Belphemon: Sleep Mode", () => {
  it("requires placing Belphemon: Rage Mode from trash before restricting attacks and granting immunity", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = compiled.effects?.find((entry) => entry.trigger === trigger)?.actions ?? [];
      expect(actions[0]).toMatchObject({
        kind: "Restrict", restriction: "attack", duration: "untilOpponentTurnEnd", optional: true, abortOnDecline: true,
        cost: { kind: "place", destination: "digivolutionStack", position: "top", host: "self", target: { filter: { zone: "trash", controller: "mine", nameOrTrait: [{ match: "name", tokens: ["Belphemon: Rage Mode"] }] }, count: 1 } },
      });
      expect(actions[1]).toMatchObject({ kind: "GrantImmunity", immuneFrom: "opponentEffects", duration: "untilOpponentTurnEnd", condition: { kind: "ifThisEffectActed" } });
    }
  });

  it("ends an opponent's attack by trashing two cards from hand once per opponent turn", () => {
    const effect = compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn");
    expect(effect).toMatchObject({ frequency: "OncePerTurn" });
    expect((effect?.actions?.[0] as { actions?: unknown[] }).actions?.[0]).toMatchObject({
      kind: "RedirectAttack", mode: "endAttack", optional: true, abortOnDecline: true,
      cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 2 } },
    });
  });
});
