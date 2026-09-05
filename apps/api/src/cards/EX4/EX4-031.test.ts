import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-031.js";

describe("EX4-031 Cherubimon", () => {
  it("has Alliance and scales -3000 by own suspended Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toMatchObject([
      { keyword: "Alliance" },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "ModifyDP",
      amount: -3000,
      scaling: { per: 1, unit: "cards", filter: { controller: "mine", suspended: true } },
    });
  });
  it("has the same DP reduction when attacking", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions?.[0]).toMatchObject({
      kind: "ModifyDP",
      amount: -3000,
      duration: "forTheTurn",
    });
  });

  it("scales the live DP reduction across two suspended Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-031", as: "cherubimon" },
            { card: "BT1-009", as: "first", suspended: true },
            { card: "BT1-010", as: "second", suspended: true },
          ],
        },
        1: { battleArea: [{ card: "BT1-021", as: "target", dp: 10_000 }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("cherubimon"));
    await settle(() => s.perm("target").currentDP !== 10_000);

    expect(s.perm("target").currentDP).toBe(4_000);
  });

  it("applies the same scaled DP reduction in the real attack window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-031", as: "cherubimon" },
            { card: "BT1-009", as: "first", suspended: true },
            { card: "BT1-010", as: "second", suspended: true },
          ],
        },
        1: { battleArea: [{ card: "BT1-021", as: "target", dp: 10_000 }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("cherubimon"));
    await settle(() => s.perm("target").currentDP !== 10_000);

    expect(s.perm("target").currentDP).toBe(4_000);
  });

  it("digivolves from a level-5 two-color Digimon with green for the alternate cost", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-049", as: "antylamon" }],
        hand: [{ card: "EX4-031", as: "cherubimon" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("antylamon").permanentId,
        instanceId: s.inst("cherubimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("antylamon").topCard.cardId === "EX4-031");
    expect(s.perm("antylamon").topCard.cardId).toBe("EX4-031");
    expect(s.state.memory).toBe(0);
  });
});
