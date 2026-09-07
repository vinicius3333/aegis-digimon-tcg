import { CardKind, EffectDuration } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import "../../cards/BT21/BT21-089.js";
import "../../cards/BT21/BT21-013.js";
import "../../cards/index.js";

describe("Tamer-source evolution event subjects", () => {
  it("does not publish an own-Digimon evolution event for a Tamer source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-089", as: "takato" },
            { card: "BT7-085", as: "redTamer" },
          ],
          hand: [
            { card: "BT21-013", as: "agunimon" },
            { card: "BT21-016", as: "wdMaterial" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }, "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).verb.digivolveFromInstance(s.perm("redTamer").permanentId, s.inst("agunimon").instanceId, {
      payCost: false,
      draw: true,
    });
    await settle(() => s.perm("redTamer").topCard.cardId === "BT21-013");

    expect(s.perm("redTamer").stack.map((card) => card.cardId)).toContain("BT21-016");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.perm("takato").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("redTamer"), "Blocker")).toBe(false);
  });

  it("publishes the own-Digimon evolution event for an ordinary Digimon source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-089", as: "takato" },
            { card: "BT1-009", as: "base" },
          ],
          hand: [{ card: "BT21-013", as: "agunimon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).verb.digivolveFromInstance(s.perm("base").permanentId, s.inst("agunimon").instanceId, {
      payCost: false,
      draw: true,
    });
    await settle(() => s.perm("base").topCard.cardId === "BT21-013");
    await settle(() => s.perm("takato").isSuspended && observe(s.engine).hasKeyword(s.perm("base"), "Blocker"));

    expect(s.perm("takato").isSuspended).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
  });
  it.each(["manual", "effect"] as const)(
    "keeps %s evolution watchers for a Tamer currently treated as a Digimon",
    async (mode) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT21-089", as: "takato" },
              { card: "BT7-085", as: "base" },
            ],
            hand: [{ card: "BT21-013", as: "agunimon" }],
            deck: ["BT1-009"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 5;
      await s.ready();
      const id = s.perm("base").permanentId;
      // Mechanism seam: arm a runtime kind/DP grant independently of any card restriction.
      advance(s.engine).ledgers.modifiers.addDpModifier(s.state, id, 3000, EffectDuration.UntilEachTurnEnd);
      advance(s.engine).ledgers.continuous.addKindGrant(id, [CardKind.Digimon], EffectDuration.UntilEachTurnEnd);
      if (mode === "manual") {
        expect(
          s.engine.applyIntent(0, {
            type: "digivolve",
            permanentId: id,
            instanceId: s.inst("agunimon").instanceId,
            useAlternateCost: true,
          }),
        ).toEqual({ ok: true });
      } else {
        await advance(s.engine).verb.digivolveFromInstance(id, s.inst("agunimon").instanceId, { payCost: false });
      }
      await settle(() => s.perm("takato").isSuspended && observe(s.engine).hasKeyword(s.perm("base"), "Blocker"));
      expect(s.perm("base").topCard.cardId).toBe("BT21-013");
      expect(s.perm("takato").isSuspended).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
    },
  );
});
