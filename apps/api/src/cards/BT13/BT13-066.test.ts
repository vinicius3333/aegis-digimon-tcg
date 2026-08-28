import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-066.js";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT13-066 Dorugamon", () => {
  it("grants inherited DP while carrying X Antibody", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          effect: { kind: "modifyDP", amount: 1000 },
          while: { kind: "selfHasTrait", filter: { nameOrTrait: [{ match: "trait", tokens: ["X Antibody"] }] } },
        },
      ],
    });
  });

  it("loads the compiled Dorugamon implementation into a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-066", as: "doru" }] } });
    await s.ready();
    expect(s.perm("doru").topCard?.cardId).toBe("BT13-066");
  });

  it("applies the inherited bonus only while the live host has X Antibody", async () => {
    const withTrait = setupEngine({
      0: { battleArea: [{ card: "BT13-063", as: "host", under: ["BT13-066"] }] },
    });
    await withTrait.ready();
    expect(withTrait.perm("host").currentDP).toBe(4000);

    const withoutTrait = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT13-066"] }] },
    });
    await withoutTrait.ready();
    expect(withoutTrait.perm("host").currentDP).toBe(3000);
  });
});
