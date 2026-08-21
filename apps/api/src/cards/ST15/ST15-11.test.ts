import { describe, expect, it } from "vitest";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("ST15-11 MetalGreymon", () => {
  it("has Blocker and carries the Greymon evolution stack with Security Attack +1 inherited text", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST15-12", as: "wargreymon", under: ["BT1-009", "ST15-08", "ST15-11"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const base = s.perm("wargreymon");
    s.state.memory = 10;
    await s.ready();

    expect(observe(s.engine).hasKeyword(base, "Blocker")).toBe(true);
    const inherited = registeredCompiledCards
      .get("ST15-11")
      ?.effects.find((effect) => effect.isInherited === true);
    expect(inherited).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "SecurityAttack", amount: 1 }],
    });
    expect(base.topCard?.cardId).toBe("ST15-12");
    expect(base.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["ST15-11", "ST15-08"]));
  });

  it("does not expose the inherited Security Attack bonus on an unrelated Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "vanilla" }] } });

    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("vanilla"), "SecurityAttack")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("vanilla"), "Blocker")).toBe(false);
  });
});
