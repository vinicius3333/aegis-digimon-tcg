import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-024.js";

describe("BT6-024 AncientGarurumon", () => {
  it("gains Jamming while the opponent has no Digimon with sources", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT6-024", as: "ancient" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("ancient"), "Jamming")).toBe(true);
  });

  it("trashes the bottom source of an opposing Digimon when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-010", under: ["BT6-024"], as: "host" }] },
        1: {
          battleArea: [
            {
              card: "BT6-016",
              under: [
                { card: "BT1-001", as: "bottom" },
                { card: "BT1-002", as: "top" },
              ],
              as: "target",
            },
          ],
          security: ["BT1-010"],
        },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("bottom").instanceId));

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("bottom").instanceId)).toBe(true);
    expect(s.perm("target").stack.map((card) => card.instanceId)).toEqual([s.inst("top").instanceId]);
  });
});
