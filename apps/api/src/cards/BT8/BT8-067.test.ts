import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT8-067.js";

describe("BT8-067 MetalGreymon", () => {
  it("de-digivolves one opposing Digimon, then deletes a 3000-DP-or-less Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-061", as: "base" }], hand: [{ card: "BT8-067", as: "evolving" }] }, 1: { battleArea: [{ card: "BT8-067", under: ["BT1-009", "BT1-015"], as: "stacked" }, { card: "BT1-010", as: "small" }] } }, { autoSelectCards: true });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.perm("stacked").topCard?.cardId).toBe("BT1-015");
    expect(s.state.players[1]!.trash.some(card => card.cardId === "BT1-010")).toBe(true);
  });

  it("lets a Dragonkin host attack an unsuspended Digimon without granting Vortex", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-070", as: "host", under: ["BT8-067"] }] },
      1: { battleArea: [{ card: "BT1-016", as: "unsuspendedTarget" }] },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Vortex")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("unsuspendedTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-016")).toBe(true);
  });

  it("does not let a host without Machine or Dragonkin attack an unsuspended Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT9-066", as: "host", under: ["BT8-067"] }] },
      1: { battleArea: [{ card: "BT1-016", as: "unsuspendedTarget" }] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("unsuspendedTarget").permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });
});
