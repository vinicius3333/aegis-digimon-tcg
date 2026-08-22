import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-020.js";

describe("BT21-020 compiled implementation", () => {
  it("exposes complete effect coverage with no residual clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
    expect(compiled.effects).toBeDefined();
  });

  it("preserves the registered effect triggers and action boundaries", () => {
    expect(compiled.effects.every((effect) => typeof effect.trigger === "string")).toBe(true);
    for (const effect of compiled.effects) {
      expect(Array.isArray(effect.actions)).toBe(true);
      for (const action of effect.actions ?? []) expect(typeof action.kind).toBe("string");
    }
  });

  it("reduces the hand digivolution cost only when the source stack contains Agunimon or BurningGreymon", () => {
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          into: { zone: "hand", controllerDefault: "mine" },
          condition: {
            kind: "selfDigivolutionStackMatchesFilter",
            filter: { nameOrTrait: [{ tokens: ["Agunimon", "BurningGreymon"], match: "name" }] },
          },
          actions: [{ kind: "Replacement", event: "wouldDigivolve", mode: "reduceCost", amount: 1 }],
        },
      ],
    });
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        keywords: [{ keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" }],
      }),
    );
  });

  it("plays a red Tamer with inherited effects when deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-020", as: "omnishoutmon" }],
          hand: [{ card: "BT21-082", as: "takuya" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("omnishoutmon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-082"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-082")).toBe(true);
  });
});
