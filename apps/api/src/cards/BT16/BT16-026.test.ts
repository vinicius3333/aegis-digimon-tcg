import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-026.js";
import "../index.js";

describe("BT16-026", () => {
  it("models Blast Digivolve", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Counter",
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve" }],
    });
  });

  it("de-digivolves and suspends opposing Digimon", () => {
    for (const effect of compiled.effects?.slice(1, 3) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({ kind: "DeDigivolve", amount: 2 });
      expect(effect.actions?.[1]).toMatchObject({
        kind: "Restrict",
        restriction: "suspend",
        duration: "untilOpponentTurnEnd",
      });
    }
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [{ kind: "Delete", target: expect.objectContaining({ count: 1 }) }],
    });
  });

  it("restricts only opposing Digimon with one or fewer digivolution cards", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-026", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "noSources" },
            { card: "BT1-010", as: "twoSources", under: ["BT1-011", "BT1-009"] },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("noSources").permanentId);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    expect(observe(s.engine).isRestricted(s.perm("noSources"), "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("twoSources"), "suspend")).toBe(false);
  });
});
