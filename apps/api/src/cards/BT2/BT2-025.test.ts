import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-025.js";

describe("BT2-025 Ikkakumon", () => {
  it("trashes only the top source of an opposing Digimon when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT2-029", as: "attacker", under: ["BT2-025"] }] },
        1: {
          battleArea: [
            {
              card: "BT2-034",
              as: "target",
              under: [
                { card: "BT1-010", as: "bottomSource" },
                { card: "BT1-011", as: "topSource" },
              ],
            },
            { card: "BT1-012", as: "sourceLess" },
          ],
          security: ["BT1-013"],
        },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("topSource").instanceId));
    expect(s.perm("target").stack).toHaveLength(1);
    expect(s.perm("target").stack[0]!.instanceId).toBe(s.inst("bottomSource").instanceId);
    expect(s.perm("sourceLess").stack).toHaveLength(0);
  });

  it("allows the attack to resolve when no opposing Digimon has digivolution cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT2-029", as: "attacker", under: ["BT2-025"] }] },
        1: { battleArea: ["BT1-012"], security: ["BT1-013"] },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    assertNoLoudGap(s);
  });
});
