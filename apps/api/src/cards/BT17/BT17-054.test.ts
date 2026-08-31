import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-054.js";
import "./index.js";

describe("BT17-054 Trailmon", () => {
  it("reveals three, adds one Tamer or Machine Digimon, and trashes the rest", () => {
    const action = compiled.effects.find((entry) => entry.trigger === "OnPlay")?.actions[0];
    expect(action).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        {
          filter: { controllerDefault: "mine", kind: ["Tamer"] },
          orFilters: [{ kind: ["Digimon"], nameOrTrait: [{ tokens: ["Machine"], match: "trait" }] }],
          count: 1,
          to: "hand",
        },
      ],
      rest: "trash",
    });
  });

  it("grants Collision on your turn only while this Digimon has the Machine trait", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "Aura",
          effect: { kind: "keyword", keyword: { keyword: "Collision" } },
          while: { kind: "selfHasTrait" },
        },
      ],
    });
  });

  it("naturally reveals three and adds a Machine Digimon through the alternative filter", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-054", as: "trailmon" }],
          deck: [
            { card: "BT17-056", as: "machine" },
            { card: "BT1-009", as: "remainderOne" },
            { card: "BT1-010", as: "remainderTwo" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    const machineId = s.inst("machine").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("trailmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === machineId));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("remainderOne").instanceId, s.inst("remainderTwo").instanceId]),
    );
    expect(s.state.memory).toBe(0);
  });

  it("naturally forces a blocker through inherited Collision on a legal Machine stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-056", under: ["BT17-054"], as: "locomon" }],
      },
      1: {
        battleArea: [{ card: "BT17-052", as: "blocker" }],
        security: 1,
      },
    });
    s.state.memory = 0;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("locomon"), "Collision")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("locomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));

    expect(s.events.find((event) => event.kind === "blockWindowOpened")).toMatchObject({
      eligibleBlockerIds: [s.perm("blocker").permanentId],
    });
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
  });
});
