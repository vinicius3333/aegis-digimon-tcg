import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT9/BT9-109.js";
import "./P-025.js";

describe("P-025 GranKuwagamon", () => {
  it("can't pay Digi-Burst 2 with a protected X Antibody and only 1 trashable source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-025", as: "granKuwagamon", under: ["BT9-109", "P-032"] },
            { card: "BT1-064", as: "recipient" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("granKuwagamon").topCard.instanceId,
        effectKey: "P-025/digi-burst-security-attack",
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });

    expect(s.perm("granKuwagamon").stack).toHaveLength(2);
    expect(observe(s.engine).keywordAmount(s.perm("recipient"), "SecurityAttack")).toBe(0);
  });

  it("Digi-Bursts exactly 2 sources and grants Security Attack +1 without deleting allies", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-025", as: "granKuwagamon", under: ["P-032", "BT1-064"] },
            { card: "BT1-064", as: "recipient" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("recipient").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("granKuwagamon").topCard.instanceId,
        effectKey: "P-025/digi-burst-security-attack",
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).keywordAmount(s.perm("recipient"), "SecurityAttack") === 1);

    expect(s.perm("granKuwagamon").stack).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });
});
