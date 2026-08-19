import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-012.js";

describe("BT22-012 RizeGreymon", () => {
  it("keeps Raid, the one-Tamer gate, the two Tamer options, and inherited Security Attack +1", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Raid", raw: "＜Raid＞" }] }),
    );
    const whenDigivolving = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(whenDigivolving?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
      optional: true,
      condition: { kind: "permanentCount", seat: "mine", op: "lte", value: 1, filter: { kind: ["Tamer"] } },
      target: {
        filter: { controllerDefault: "mine", kind: ["Tamer"], colors: ["Red", "Black"], playCostLte: 4 },
        orFilters: [{ controllerDefault: "mine", kind: ["Tamer"], nameOrTrait: [{ tokens: ["CS"], match: "trait" }] }],
        count: 1,
      },
    });
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        isInherited: true,
        keywords: [{ keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" }],
      }),
    );
  });
});
