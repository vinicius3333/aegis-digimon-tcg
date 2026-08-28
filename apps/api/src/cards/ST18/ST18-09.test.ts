import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("ST18-09 Deramon", () => {
  it("plays an eligible Avian/Bird/Vegetation/Plant Digimon at 3000 DP or less after deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST18-09", as: "deramon" }],
          hand: [
            { card: "ST18-03", as: "eligible" },
            { card: "ST18-08", as: "tooLarge" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("deramon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "ST18-03"));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "ST18-03")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "ST18-08")).toBe(true);
  });

  it("has Blocker and exposes the Vegetation rule trait", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST18-09", as: "deramon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("deramon"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("deramon"), "Vegetation")).toBe(true);
  });
});
