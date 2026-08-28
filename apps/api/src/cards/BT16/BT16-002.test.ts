import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-002.js";
import "../index.js";

describe("BT16-002", () => {
  it("gains +1000 DP on all turns while it has two colors", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        { kind: "Aura", effect: { kind: "modifyDP", amount: 1000 }, while: { kind: "selfColorCount", value: 2 } },
      ],
    }));

  it("applies +1000 DP to a multicolor host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT16-007", as: "host", under: ["BT16-002"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(3000);
  });

  it("does not apply the bonus to a one-color host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-010", as: "host", under: ["BT16-002"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(2000);
  });

  it("removes the inherited bonus when a natural evolution changes the host to one color", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "AD1-001", as: "greymon" }],
        battleArea: [{ card: "BT16-007", as: "host", under: ["BT16-002"] }],
      },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(3000);
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("greymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "AD1-001");

    expect(s.perm("host").currentDP).toBe(5000);
    expect(s.perm("host").stack.some((card) => card.cardId === "BT16-002")).toBe(true);
  });
});
