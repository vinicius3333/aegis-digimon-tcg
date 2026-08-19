import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT23-081.js";

describe("BT23-081 Chitose Imai", () => {
  it("plays a Hudie Digimon with play cost 5 or less on play", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "OnPlay") as any;
    expect(effect.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      optional: true,
      target: { filter: { kind: ["Digimon"], playCostLte: 5, nameOrTrait: [{ tokens: ["Hudie"], match: "trait" }] } },
    });
  });

  it("pays by suspending this Tamer to reduce an opponent Digimon by 3000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-081", as: "chitose" },
            { card: "BT23-017", as: "hudie" },
          ],
        },
        1: { battleArea: [{ card: "BT1-028", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireSubTrigger("whenSuspended", {
      subjectPermanentId: s.perm("hudie").permanentId,
    });
    expect(s.perm("chitose").isSuspended).toBe(true);
    expect(s.perm("opponent").currentDP).toBe(0);
  });
});
