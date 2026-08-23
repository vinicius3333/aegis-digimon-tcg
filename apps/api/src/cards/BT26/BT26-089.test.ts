import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-089.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT26-089 compiled fidelity", () => {
  it("separates check-driven and effect-driven security removal while sharing the placement cost", () => {
    const card = compiled;
    expect(card?.coverage).toBe("full");
    expect(card?.effects?.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
    expect(card?.effects?.find((effect) => effect.trigger === "StartOfYourMainPhase")?.actions).toMatchObject([
      { kind: "PlaceUnder", faceDown: true },
      { kind: "Draw", amount: 1 },
      { kind: "GainMemory", amount: 1 },
    ]);
    const watchers = card?.effects?.find((effect) => effect.trigger === "AllTurns")?.actions ?? [];
    expect(watchers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          fireCondition: {
            kind: "allOf",
            conditions: [
              { kind: "triggerRemovedSecuritySeat", seat: "mine" },
              { kind: "not", condition: { kind: "triggerSecurityRemovedByEffect" } },
            ],
          },
        }),
        expect.objectContaining({
          kind: "SubTrigger",
          event: "whenEffectRemovesFromSecurity",
          fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "mine" },
        }),
      ]),
    );
    expect(irNode(watchers[1])?.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "Suspend" }),
        expect.objectContaining({ kind: "PlaceUnder", fromDeckTop: true, faceDown: true }),
        expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -1 } }),
      ]),
    );
  });

  it("places a BEATBREAK card under itself, draws, and gains memory at main-phase start", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-089", as: "kyo" }],
          hand: [{ card: "ST23-08", as: "beatbreak" }],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("kyo"));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.perm("kyo").stack.some((card) => card.cardId === "ST23-08")).toBe(true);
  });

  it("resolves the shared body exactly once when an effect removes security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-089", as: "kyo" }],
          security: ["BT1-001"],
          deck: [
            { card: "BT1-002", as: "placed" },
            { card: "BT1-003", as: "remaining" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.trashFromSecurity(0, 1);

    expect(s.perm("kyo").isSuspended).toBe(true);
    expect(s.perm("kyo").stack).toHaveLength(1);
    expect(s.perm("kyo").stack[0]).toMatchObject({ instanceId: s.inst("placed").instanceId, faceUp: false });
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("remaining").instanceId]);
    expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBe(-1);
  });
});
