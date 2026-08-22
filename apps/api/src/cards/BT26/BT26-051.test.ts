import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-051.js";
import "../index.js";

describe("BT26-051 Gomimon", () => {
  it("encodes Detach and the Your Turn linked grant plus linked-face De-Digivolve", () => {
    expect(digivolutionRequirementsFor("BT26-051")).toContainEqual({ level: 2, traits: ["Appmon"], cost: 0, isAlternate: true });
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 3 }]);
    expect(compiled.effects?.[0]?.keywords).toEqual(expect.arrayContaining([expect.objectContaining({ keyword: "Detach" })]));
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenLinked", actions: [{ kind: "GainKeyword", keyword: { keyword: "Collision" } }, { kind: "ModifyDP", amount: 3000 }] }] });
    expect(compiled.effects?.[2]).toMatchObject({ isLinked: true, actions: [{ kind: "SubTrigger", event: "whenLinked", actions: [{ kind: "DeDigivolve", amount: 2 }] }] });
  });

  it("publicly grants Collision and +3000 DP to an eligible Digimon when linked", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT21-009", as: "host", linked: [{ card: "BT26-051", as: "gomimon" }] },
          { card: "BT26-037", as: "sevenCode" },
        ],
      },
    });
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("host").permanentId });

    expect(s.perm("sevenCode").currentDP).toBe(8000);
    expect(s.perm("sevenCode").keywords).toContain("Collision");
  });
});
