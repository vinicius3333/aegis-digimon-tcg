import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-018.js";

describe("BT17-018", () => {
  it("models Blast Digivolve", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Counter",
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve" }],
    });
  });

  it("deletes opposing Digimon up to a total of 15000 DP", () => {
    for (const effect of compiled.effects?.slice(1, 3) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({ kind: "Delete", target: { count: "all", totalDpCap: 15000 } });
    }
  });

  it("trashes security based on the number of cards in trash once per turn", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
          scaling: { per: 10, unit: "cards" },
        },
      ],
    });
  });

  it("trashes one security card for each ten cards in both trashes", async () => {
    const filler = Array.from({ length: 10 }, () => ({ card: "BT1-009" }));
    const s = setupEngine({
      0: { battleArea: [{ card: "BT17-018", as: "crimson" }], trash: filler },
      1: { trash: filler, security: ["BT1-009", "BT1-009", "BT1-009"] },
    });
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("crimson"));
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
