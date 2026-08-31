import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-094.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

function primitivesOf(s: EngineSetup): Primitives {
  return (s.engine as unknown as { primitives: Primitives }).primitives;
}

describe("BT26-094 compiled fidelity", () => {
  it("distinguishes opponent-hand trash from this Tamer's under-stack trash", () => {
    const card = compiled;
    expect(getCardDefinition("BT26-094")).toMatchObject({
      nameEn: "Keenan Crier",
      colors: ["Purple"],
      kinds: ["Tamer"],
      playCost: 3,
      types: ["DATA SQUAD"],
    });
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.effects?.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
    expect(card?.effects?.find((effect) => effect.trigger === "StartOfYourMainPhase")?.actions).toMatchObject([
      {
        kind: "CostGatedBlock",
        cost: { kind: "place", destination: "digivolutionStack", position: "bottom", faceDown: true },
        actions: [
          { kind: "Draw", amount: 1 },
          { kind: "GainMemory", amount: 1 },
        ],
      },
    ]);
    const actions = card?.effects?.find((effect) => effect.trigger === "YourTurn")?.actions ?? [];
    expect(actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "SubTrigger",
          event: "whenHandTrashed",
          fireCondition: { kind: "triggerHandTrashedSeat", seat: "opponent" },
        }),
        expect.objectContaining({
          kind: "SubTrigger",
          event: "whenDigivolutionTrashed",
          hostFilter: { isSelfRef: true },
        }),
      ]),
    );
    for (const watcher of actions) {
      expect(irNode(watcher).actions).toMatchObject([
        {
          kind: "CostGatedBlock",
          cost: { kind: "suspend" },
          actions: [{ kind: "GainKeyword", keyword: { keyword: "Execute" }, duration: "untilEachTurnEnd" }],
        },
      ]);
    }
  });

  it("Q7156 places a DATA SQUAD card face down at the bottom, then draws and gains memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT26-094",
              as: "keenan",
              under: [{ card: "BT1-001", as: "existing", faceUp: false }],
            },
          ],
          hand: [{ card: "P-235", as: "dataSquadOption" }],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("keenan"));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.perm("keenan").stack.map(({ instanceId, faceUp }) => ({ instanceId, faceUp }))).toEqual([
      { instanceId: s.inst("dataSquadOption").instanceId, faceUp: false },
      { instanceId: s.inst("existing").instanceId, faceUp: false },
    ]);
  });

  it("may decline the start-main placement without drawing or gaining memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-094", as: "keenan" }],
          hand: [{ card: "P-235", as: "dataSquad" }],
          deck: ["BT1-001"],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("keenan"));

    expect(s.state.memory).toBe(0);
    expect(s.perm("keenan").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("suspends itself and grants Execute when the opponent's hand is trashed from", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-094", as: "keenan" },
            { card: "BT26-039", as: "dataSquad" },
          ],
        },
        1: { hand: [{ card: "BT1-001", as: "trashed" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await primitivesOf(s).trash([s.inst("trashed").instanceId], { byEffectSeat: 0 });
    await settle(() => s.perm("keenan").isSuspended);

    expect(s.perm("keenan").isSuspended).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("dataSquad"), "Execute")).toBe(true);
  });

  it("grants Execute only to a DATA SQUAD Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-094", as: "keenan" },
            { card: "BT26-039", as: "dataSquad" },
            { card: "BT1-009", as: "unrelated" },
          ],
        },
        1: { hand: [{ card: "BT1-001", as: "trashed" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await primitivesOf(s).trash([s.inst("trashed").instanceId], { byEffectSeat: 0 });
    await settle(() => s.perm("keenan").isSuspended);

    expect(observe(s.engine).hasKeyword(s.perm("dataSquad"), "Execute")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("unrelated"), "Execute")).toBe(false);
  });

  it("suspends itself and grants Execute when an effect trashes a card from under it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT26-094",
              as: "keenan",
              under: [{ card: "P-235", as: "trashed", faceUp: false }],
            },
            { card: "BT26-039", as: "dataSquad" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await primitivesOf(s).trashDigivolutionCards(s.perm("keenan").permanentId, [s.inst("trashed").instanceId], {
      byEffectSeat: 0,
    });
    await settle(() => s.perm("keenan").isSuspended);

    expect(s.state.players[0]!.trash).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("trashed").instanceId, faceUp: true }),
    );
    expect(observe(s.engine).hasKeyword(s.perm("dataSquad"), "Execute")).toBe(true);
  });

  it("does not react to its controller's hand being trashed from", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-094", as: "keenan" },
            { card: "BT26-039", as: "dataSquad" },
          ],
          hand: [{ card: "BT1-001", as: "trashed" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await primitivesOf(s).trash([s.inst("trashed").instanceId], { byEffectSeat: 1 });

    expect(s.perm("keenan").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("dataSquad"), "Execute")).toBe(false);
  });

  it("does not react during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-094", as: "keenan" },
            { card: "BT26-039", as: "dataSquad" },
          ],
        },
        1: { hand: [{ card: "BT1-001", as: "trashed" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await primitivesOf(s).trash([s.inst("trashed").instanceId], { byEffectSeat: 0 });

    expect(s.perm("keenan").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("dataSquad"), "Execute")).toBe(false);
  });

  it("does not grant Execute when the suspend cost is unavailable or declined", async () => {
    const unavailable = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-094", as: "keenan", suspended: true },
            { card: "BT26-039", as: "dataSquad" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await unavailable.ready();
    await advance(unavailable.engine).fireSubTrigger("whenHandTrashed", { handTrashedSeat: 1, byEffectSeat: 0 });
    expect(observe(unavailable.engine).hasKeyword(unavailable.perm("dataSquad"), "Execute")).toBe(false);

    const declined = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-094", as: "keenan" },
            { card: "BT26-039", as: "dataSquad" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    await declined.ready();
    await advance(declined.engine).fireSubTrigger("whenHandTrashed", { handTrashedSeat: 1, byEffectSeat: 0 });
    expect(declined.perm("keenan").isSuspended).toBe(false);
    expect(observe(declined.engine).hasKeyword(declined.perm("dataSquad"), "Execute")).toBe(false);
  });

  it("plays itself without paying its cost when checked in security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT26-094", as: "keenan" }] },
      1: { battleArea: [{ card: "AD1-001", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const keenanId = s.inst("keenan").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === keenanId));

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === keenanId)).toBe(false);
    expect(s.state.memory).toBe(0);
  });
});
