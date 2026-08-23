import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-051.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT26-051 Gomimon", () => {
  it("encodes Detach and the Your Turn linked grant plus linked-face De-Digivolve", () => {
    expect(digivolutionRequirementsFor("BT26-051")).toContainEqual({
      level: 2,
      traits: ["Appmon"],
      cost: 0,
      isAlternate: true,
    });
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 3 }]);
    expect(compiled.effects?.[0]?.keywords).toEqual(
      expect.arrayContaining([expect.objectContaining({ keyword: "Detach" })]),
    );
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          actions: [
            { kind: "GainKeyword", keyword: { keyword: "Collision" } },
            { kind: "ModifyDP", amount: 3000 },
          ],
        },
      ],
    });
    expect(compiled.effects?.[1]).not.toHaveProperty("isLinked");
    expect(compiled.effects?.[2]).toMatchObject({
      isLinked: true,
      actions: [{ kind: "SubTrigger", event: "whenLinked", actions: [{ kind: "DeDigivolve", amount: 2 }] }],
    });
  });

  it("publicly grants Collision and +3000 DP to an eligible Digimon when linked", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-051", as: "gomimon" }],
          hand: [{ card: "BT26-019", as: "mailmon" }],
        },
        1: { battleArea: [{ card: "BT1-089", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("mailmon").instanceId,
        targetPermanentId: s.perm("gomimon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gomimon").currentDP === 7000);

    expect(s.perm("gomimon").currentDP).toBe(7000);
    expect(observe(s.engine).hasKeyword(s.perm("gomimon"), "Collision")).toBe(true);
  });
});
