import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-091.js";
import "../index.js";

describe("BT26-091 compiled fidelity", () => {
  it("registers both printed reaction sources with a suspension-paid reduced digivolution", () => {
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
    const actions = card?.effects?.find((effect) => effect.trigger === "YourTurn")?.actions ?? [];
    expect(actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: expect.objectContaining({ controller: "opponent" }),
        }),
        expect.objectContaining({
          kind: "SubTrigger",
          event: "whenDigivolutionTrashed",
          hostFilter: expect.objectContaining({ isSelfRef: true }),
        }),
      ]),
    );
    for (const watcher of actions) {
      expect(watcher.actions?.[0]).toMatchObject({
        kind: "Digivolve",
        from: ["hand"],
        costDelta: -1,
        optional: true,
        cost: { kind: "suspend" },
      });
    }
  });

  it("places a DATA SQUAD card under itself, draws, and gains memory at main-phase start", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-091", as: "yoshino" }],
          hand: [{ card: "ST24-08", as: "dataSquad" }],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("yoshino"));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.perm("yoshino").stack.some((card) => card.cardId === "ST24-08")).toBe(true);
  });

  it("suspends itself to reactively digivolve for one less when an opponent card suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-091", as: "yoshino" },
            { card: "BT26-039", as: "base" },
          ],
          hand: [{ card: "BT26-044", as: "lilamon" }],
        },
        1: { battleArea: [{ card: "BT5-022", as: "opponent", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenSuspended", {
      suspendedPermanentId: s.perm("opponent").permanentId,
    });
    await settle(() => s.perm("base").topCard.cardId === "BT26-044");

    expect(s.perm("yoshino").isSuspended).toBe(true);
    expect(s.state.memory).toBe(0);
  });
});
