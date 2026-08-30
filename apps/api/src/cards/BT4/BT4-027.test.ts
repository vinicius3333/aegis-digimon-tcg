import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-027.js";

describe("BT4-027 KendoGarurumon", () => {
  it("digivolves from hand onto a blue Tamer for 3 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-086", as: "tamer" }],
        hand: [{ card: "BT4-027", as: "kendo" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tamer").permanentId,
        instanceId: s.inst("kendo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT4-027" && s.state.memory === 1);
    expect(s.state.memory).toBe(1);
    expect(s.perm("tamer").topCard?.cardId).toBe("BT4-027");
  });

  it("cannot use a non-blue Tamer as its alternate digivolution base", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-085", as: "tamer" }], hand: [{ card: "BT4-027", as: "kendo" }] },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tamer").permanentId,
        instanceId: s.inst("kendo").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("tamer").topCard?.cardId).toBe("BT1-085");
  });

  it("returns a level 3 Digimon and trashes all of that Digimon's sources when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-027", as: "kendo" }] },
        1: {
          battleArea: [
            {
              card: "BT1-009",
              as: "target",
              under: [
                { card: "BT1-001", as: "bottom" },
                { card: "BT2-001", as: "top" },
              ],
            },
          ],
          security: ["BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    const sourceIds = [s.inst("bottom").instanceId, s.inst("top").instanceId];

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kendo").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "BT1-009"));

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(false);
    expect(sourceIds.every((id) => s.state.players[1]!.trash.some((card) => card.instanceId === id))).toBe(true);
  });

  it("does not return an opposing level 4 Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-027", as: "kendo" }] },
      1: {
        battleArea: [{ card: "BT1-019", as: "target", under: [{ card: "BT1-001", as: "source" }] }],
        security: ["BT1-010"],
      },
    });
    const targetId = s.perm("target").permanentId;
    const sourceId = s.inst("source").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kendo").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0, 5000);

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(true);
    expect(s.perm("target").stack.some((card) => card.instanceId === sourceId)).toBe(true);
  });
});
