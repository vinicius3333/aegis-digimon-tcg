import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX2-028.js";

describe("EX2-028 Parasitemon", () => {
  it("gives its host +2000 DP and Security Attack +1 during its turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX2-029", as: "host", under: ["EX2-028"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(15000);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });

  it("places itself under another Digimon at end of attack, never under itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-028", as: "parasite", under: ["EX2-025"] },
            { card: "EX2-014", as: "other" },
          ],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("parasite").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("other").stack.some((card) => card.instanceId === s.inst("parasite").instanceId));
    expect(s.perm("other").stack.map((card) => card.cardId)).toEqual(["EX2-028"]);
  });
});
