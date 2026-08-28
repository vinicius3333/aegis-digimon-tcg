import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-021.js";
import "./index.js";

describe("BT17-021", () => {
  it("draws by placing a Seasarmon or level 3 blue Digimon under itself", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "Draw",
          amount: 1,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "place",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
            target: { filter: { orFilters: [{ colors: ["Blue"], levels: [3] }] } },
          },
        },
      ],
    });
  });

  it("gains memory when attacking with Jamming as inherited once per turn", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "selfHasKeyword", keyword: "Jamming" } }],
    });
  });

  it("places BT17-024 Seasarmon from hand under itself and draws", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT17-021", as: "labramon" },
            { card: "BT17-024", as: "material" },
          ],
          deck: [{ card: "BT1-011", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const materialId = s.inst("material").instanceId;
    const drawnId = s.inst("drawn").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("labramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === drawnId));

    const labramon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT17-021")!;
    expect(labramon.stack.map((card) => card.instanceId)).toEqual([materialId]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === materialId)).toBe(false);
  });

  it("gains memory when its Jamming host attacks", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT17-025", under: ["BT17-021", "BT17-024"], as: "host" }] },
      1: { security: 2 },
    });
    s.state.memory = 0;
    await s.ready();

    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      });
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });
});
