import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-019.js";
import "../index.js";

describe("BT16-019", () => {
  it("has Blocker and unsuspends one of your level 4 or lower Digimon on play or digivolving", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Blocker" }] });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "Unsuspend", target: { filter: { levelComparison: { op: "lte", value: 4 } } } }],
    });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "Unsuspend" }] });
  });
  it("trashes one opposing digivolution card when attacking as inherited", () =>
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      actions: [{ kind: "TrashDigivolution", amount: 1, fromTop: true }],
    }));

  it("unsuspends one of your suspended level 4 or lower Digimon on play", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-019", as: "source" },
            { card: "BT16-018", as: "eligible", suspended: true },
            { card: "BT16-010", as: "tooHigh", suspended: true },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("eligible").permanentId);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    expect(s.perm("eligible").isSuspended).toBe(false);
    expect(s.perm("tooHigh").isSuspended).toBe(true);
  });
});
