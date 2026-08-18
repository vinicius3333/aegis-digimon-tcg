import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-025.js";
import "./P-032.js";
import "./P-057.js";

describe("Green Digi-Burst promo deck", () => {
  it("turns Palmon and Tyrannomon sources into Jamming plus Security Attack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{
            card: "P-025",
            as: "granKuwagamon",
            under: [
              { card: "P-057", as: "tyrannomon" },
              { card: "P-032", as: "palmon" },
            ],
          }],
        },
        1: {
          security: ["BT1-083", "BT1-084", "BT1-085"],
          deck: ["BT1-001"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(
      s.inst("tyrannomon").instanceId,
      s.inst("palmon").instanceId,
      s.perm("granKuwagamon").permanentId,
    );
    const baseDP = s.perm("granKuwagamon").baseDP;
    await s.ready();
    expect(s.perm("granKuwagamon").currentDP).toBe(baseDP + 2000);

    expect(s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.perm("granKuwagamon").topCard.instanceId,
      effectKey: "P-025/digi-burst-security-attack",
    })).toEqual({ ok: true });
    await settle(() =>
      observe(s.engine).hasKeyword(s.perm("granKuwagamon"), "Jamming") &&
      observe(s.engine).keywordAmount(s.perm("granKuwagamon"), "SecurityAttack") === 1,
    );

    expect(s.perm("granKuwagamon").stack).toHaveLength(0);
    expect(s.perm("granKuwagamon").currentDP).toBe(baseDP);
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("granKuwagamon").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.security.length === 1 &&
      !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking
    );

    expect(s.state.players[0]!.battleArea.some((permanent) =>
      permanent.permanentId === s.perm("granKuwagamon").permanentId
    )).toBe(true);
    assertNoLoudGap(s);
  });
});
