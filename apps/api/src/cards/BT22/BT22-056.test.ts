import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-056.js";
import "./index.js";

describe("BT22-056 Guardromon", () => {
  it("reduces one opponent Digimon and conditionally De-Digivolves another", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "ModifyDP",
        amount: -3000,
        duration: "forTheTurn",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      });
      expect(effect?.actions[1]).toMatchObject({
        kind: "DeDigivolve",
        amount: 1,
        condition: { kind: "stackHasSameLevelCards", count: 2 },
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      });
    }
  });

  it("retains inherited opponent-turn +2000 DP", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "OpponentsTurn",
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }],
    });
  });

  it("uses two same-level source cards to unlock De-Digivolve after a CS evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-053", as: "base", under: ["BT22-053"] }],
          hand: [{ card: "BT22-056", as: "guardromon" }],
        },
        1: { battleArea: [{ card: "BT22-071", as: "target", under: ["BT1-021"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("guardromon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard?.cardId === "BT1-021");

    expect(s.state.memory).toBe(0);
    expect(s.perm("target").topCard?.cardId).toBe("BT1-021");
  });

  it("still applies -3000 DP but does not De-Digivolve without a repeated level", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT22-056", as: "guardromon" }] },
        1: { battleArea: [{ card: "BT22-071", as: "target", under: ["BT1-009"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("guardromon").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.perm("target").topCard?.cardId).toBe("BT22-071");
    expect(s.perm("target").currentDP).toBe(3000);
  });
});
