import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-025.js";

describe("BT9-025 TeslaJellymon", () => {
  it("matches its complete catalog and optional once-per-turn IR contract", () => {
    expect(getCardDefinition("BT9-025")).toMatchObject({
      cardId: "BT9-025",
      nameEn: "TeslaJellymon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 6000,
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Mollusk"],
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "EndOfAttack",
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "Unsuspend",
              optional: true,
              cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 2 } },
            },
          ],
        },
      ],
    });
  });

  it("once per turn may trash 2 hand cards at end of attack to unsuspend itself", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT9-025", as: "tesla", suspended: true }], hand: ["BT1-001", "BT1-002"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnEndAttack, s.perm("tesla"));
    expect(s.perm("tesla").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash).toHaveLength(2);
    s.perm("tesla").isSuspended = true;
    await advance(s.engine).fire(EffectTiming.OnEndAttack, s.perm("tesla"));
    expect(s.perm("tesla").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });
});
