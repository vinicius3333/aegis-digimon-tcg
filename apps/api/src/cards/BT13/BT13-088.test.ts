import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-088.js";
import "./BT13-091.js";

describe("BT13-088 Belphemon: Sleep Mode", () => {
  it("requires placing Belphemon: Rage Mode from trash before restricting attacks and granting immunity", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = compiled.effects?.find((entry) => entry.trigger === trigger)?.actions ?? [];
      expect(actions[0]).toMatchObject({
        kind: "Restrict",
        restriction: "attack",
        duration: "untilOpponentTurnEnd",
        optional: false,
        cost: {
          kind: "place",
          destination: "digivolutionStack",
          position: "top",
          host: "self",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              nameOrTrait: [{ match: "name", tokens: ["Belphemon: Rage Mode"] }],
            },
            count: 1,
          },
        },
      });
      expect(actions[1]).toMatchObject({
        kind: "GrantImmunity",
        immuneFrom: "opponentEffects",
        duration: "untilOpponentTurnEnd",
        condition: { kind: "ifThisEffectActed" },
      });
    }
  });

  it("ends an opponent's attack by trashing two cards from hand once per opponent turn", () => {
    const effect = compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn");
    expect(effect).toMatchObject({ frequency: "OncePerTurn" });
    expect((effect?.actions?.[0] as { actions?: unknown[] }).actions?.[0]).toMatchObject({
      kind: "RedirectAttack",
      mode: "endAttack",
      optional: true,
      abortOnDecline: true,
      cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 2 } },
    });
  });

  it("places Rage Mode from trash before granting the play restrictions", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-088", as: "sleep" }], trash: [{ card: "BT13-091", as: "rage" }] } },
      { autoAcceptOptional: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("sleep"));
    await settle(() => s.perm("sleep").stack.some((card) => card.cardId === "BT13-091"));
    expect(s.perm("sleep").stack.at(-1)?.cardId).toBe("BT13-091");
  });
});
