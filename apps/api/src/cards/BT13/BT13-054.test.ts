import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-054.js";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT13-054 Lilamon", () => {
  it("plays Yoshino optionally and grants inherited Security Attack +1 conditionally", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          optional: true,
          target: {
            filter: { controller: "mine", nameOrTrait: [{ match: "name", tokens: ["Yoshino Fujieda"] }] },
            count: 1,
          },
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: 1 } },
          while: { kind: "opponentHas", filter: { controllerDefault: "opponent", suspended: true, kind: ["Digimon"] } },
        },
      ],
    });
  });

  it("loads the compiled Lilamon implementation into a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-054", as: "lila" }] } });
    await s.ready();
    expect(s.perm("lila").topCard?.cardId).toBe("BT13-054");
  });
});
