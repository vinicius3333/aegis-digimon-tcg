import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-046.js";

describe("BT23-046 Rosemon", () => {
  it("may suspend an opponent's Digimon as the cost and locks it from unsuspending", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT23-046", as: "rose", suspended: true }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "costCandidate" },
            { card: "BT22-083", as: "otherTarget", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("rose"));

    expect(s.perm("costCandidate").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("costCandidate"), "unsuspend")).toBe(true);
  });

  it("redirects an opponent's player attack to a suspended qualifying Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT23-046", as: "rose", suspended: true }] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === attackerId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT23-046")).toBe(true);
  });

  it("declares Fortitude", () => {
    expect((compiled.effects.find((entry) => entry.trigger === "Static") as any).keywords[0].keyword).toBe("Fortitude");
  });

  it("by suspending one of your Digimon/Tamers, restricts one opposing Digimon/Tamer from unsuspending", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "Restrict",
        target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
        restriction: "unsuspend",
        duration: "untilOpponentTurnEnd",
        cost: { kind: "suspend", target: { filter: { controller: "any", kind: ["Digimon", "Tamer"] }, count: 1 } },
        optional: true,
        abortOnDecline: true,
      });
    }
  });

  it("once per opponent turn may redirect an attack to a suspended Vegetation/Plant/Fairy/CS Digimon", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "OpponentsTurn") as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenOpponentAttacks",
      actions: [
        {
          kind: "RedirectAttack",
          optional: true,
          target: {
            filter: {
              controller: "mine",
              suspended: true,
              kind: ["Digimon"],
              nameOrTrait: [
                { tokens: ["Vegetation", "Plant", "Fairy"], match: "trait" },
                { tokens: ["CS"], match: "trait" },
              ],
            },
            count: 1,
          },
        },
      ],
    });
  });
});
