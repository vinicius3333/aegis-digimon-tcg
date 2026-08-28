import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-066.js";

describe("BT7-066 AncientVolcanomon", () => {
  it("records De-Digivolve 3 and an optional black level-4-or-lower Hybrid play", () => {
    const card = runtimeCompiledCard("BT7-066");
    expect(card).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        { trigger: "WhenDigivolving", actions: [{ kind: "DeDigivolve", amount: 3, target: { count: 1 } }] },
        {
          trigger: "OnDeletion",
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["hand"],
              optional: true,
              target: { count: 1, filter: { colors: ["Black"], levelComparison: { op: "lte", value: 4 } } },
            },
          ],
        },
      ],
    });
  });

  it("de-digivolves an opposing Digimon by up to 3 cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT10-013", as: "base" }], hand: [{ card: "BT7-066", as: "evolving" }] },
        1: { battleArea: [{ card: "BT7-066", under: ["BT1-001", "BT1-009", "BT1-010", "BT1-011"], as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 1);
    // `under` is declared bottom-most first. Removing AncientVolcanomon and the next
    // 2 cards therefore exposes the last declared source, BT1-011.
    expect(s.perm("target").topCard?.cardId).toBe("BT1-011");
  });
});
