import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT22-061.js";

describe("BT22-061 Vademon", () => {
  it("reduces only Ver.2 digivolutions into Vademon by its face-down stack count", () => {
    const replacement = compiled.effects.find((entry) => entry.trigger === "Static")?.actions[0] as any;
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldDigivolve",
      into: { nameOrTrait: [{ tokens: ["Vademon"], match: "name" }] },
      actions: [
        {
          mode: "reduceCost",
          amount: 1,
          scaling: { per: 1, unit: "digivolutionCards", filter: { isSelfRef: true, faceDown: true } },
        },
      ],
    });
  });

  it("trashes the bottom face-down card before the shared once-per-turn De-Digivolve and return", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "ir-shared-0" });
      expect(effect?.actions[1]).toMatchObject({
        kind: "Return",
        to: "hand",
        cost: {
          kind: "trash",
          target: { filter: { isSelfRef: true, faceDown: true, position: "bottom" }, isSelf: true },
        },
      });
    }
  });

  it("redirects an opponent's attack to its host once per turn", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "OpponentsTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "RedirectAttack",
              optional: true,
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            },
          ],
        },
      ],
    });
  });

  it("stacks face-down reductions, then De-Digivolves, pays the bottom source, and returns", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT22-049",
              as: "vegiemon",
            },
          ],
          hand: [
            { card: "BT22-049", as: "faceDownOne" },
            { card: "BT22-049", as: "faceDownTwo" },
            { card: "BT22-061", as: "vademon" },
          ],
        },
        1: { battleArea: [{ card: "BT22-071", as: "target", under: ["BT1-009"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.placeUnder(s.perm("vegiemon").permanentId, [
      s.inst("faceDownOne").instanceId,
      s.inst("faceDownTwo").instanceId,
    ]);
    for (const alias of ["faceDownOne", "faceDownTwo"]) {
      s.perm("vegiemon").stack.find((card) => card.instanceId === s.inst(alias).instanceId)!.faceUp = false;
    }
    const targetTopId = s.perm("target").topCard!.instanceId;
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("vegiemon").permanentId,
        instanceId: s.inst("vademon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "BT1-009"));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === targetTopId)).toBe(true);
    expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "BT22-049")).toHaveLength(1);
  });
});
