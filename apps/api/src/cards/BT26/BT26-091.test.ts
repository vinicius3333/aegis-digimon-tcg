import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-091.js";
import "../index.js";

describe("BT26-091 compiled fidelity", () => {
  it("registers both printed reaction sources with a suspension-paid reduced digivolution", () => {
    const card = compiled;
    expect(getCardDefinition("BT26-091")).toMatchObject({
      nameEn: "Yoshino Fujieda",
      colors: ["Green"],
      kinds: ["Tamer"],
      playCost: 4,
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
          event: "whenSuspended",
          sourceFilter: expect.objectContaining({ controller: "opponent", kind: ["Digimon", "Tamer"] }),
        }),
        expect.objectContaining({
          kind: "SubTrigger",
          event: "whenDigivolutionTrashed",
          sourceFilter: expect.objectContaining({ isSelfRef: true }),
          hostFilter: expect.objectContaining({ isSelfRef: true }),
        }),
      ]),
    );
    for (const watcher of actions) {
      expect(irNode(watcher).actions?.[0]).toMatchObject({
        kind: "Digivolve",
        from: ["hand"],
        costDelta: -1,
        optional: true,
        cost: { kind: "suspend" },
        into: {
          filter: {
            kind: ["Digimon"],
            zone: "hand",
            nameOrTrait: [{ tokens: ["Vegetation", "Fairy", "DATA SQUAD"], match: "trait" }],
          },
        },
      });
    }
  });

  it("Q7144 places a DATA SQUAD card face down at the bottom, then draws and gains memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT26-091",
              as: "yoshino",
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

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("yoshino"));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.perm("yoshino").stack.map(({ instanceId, faceUp }) => ({ instanceId, faceUp }))).toEqual([
      { instanceId: s.inst("dataSquadOption").instanceId, faceUp: false },
      { instanceId: s.inst("existing").instanceId, faceUp: false },
    ]);
  });

  it("may decline the start-main placement without drawing or gaining memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-091", as: "yoshino" }],
          hand: [{ card: "P-235", as: "dataSquad" }],
          deck: ["BT1-001"],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("yoshino"));

    expect(s.state.memory).toBe(0);
    expect(s.perm("yoshino").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
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
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
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

  it("reactively accepts the Vegetation trait branch", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-091", as: "yoshino" },
            { card: "BT26-036", as: "base" },
          ],
          hand: [{ card: "BT26-039", as: "vegetation" }],
        },
        1: { battleArea: [{ card: "BT5-022", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 2;
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("opponent").permanentId]);
    await settle(() => s.perm("base").topCard.cardId === "BT26-039");

    expect(s.perm("yoshino").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("reactively accepts the Fairy trait branch", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-091", as: "yoshino" },
            { card: "BT26-036", as: "base" },
          ],
          hand: [{ card: "BT26-027", as: "fairy" }],
        },
        1: { battleArea: [{ card: "BT5-022", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 2;
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("opponent").permanentId]);
    await settle(() => s.perm("base").topCard.cardId === "BT26-027");

    expect(s.perm("yoshino").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("also reacts when an opponent's Tamer suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-091", as: "yoshino" },
            { card: "BT26-039", as: "base" },
          ],
          hand: [{ card: "BT26-044", as: "lilamon" }],
        },
        1: { battleArea: [{ card: "BT1-089", as: "opponentTamer", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 2;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenSuspended", {
      suspendedPermanentId: s.perm("opponentTamer").permanentId,
    });
    await settle(() => s.perm("base").topCard.cardId === "BT26-044");

    expect(s.perm("yoshino").isSuspended).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("reacts when an effect trashes a face-down card from under this Tamer (Q7147)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT26-091",
              as: "yoshino",
              under: [{ card: "P-235", as: "trashed", faceUp: false }],
            },
            { card: "BT26-039", as: "base" },
          ],
          hand: [{ card: "BT26-044", as: "lilamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 2;
    await s.ready();

    const primitives = (
      s.engine as unknown as {
        primitives: {
          trashDigivolutionCards: (
            hostPermanentId: string,
            instanceIds: string[],
            options: { byEffectSeat: number },
          ) => Promise<unknown>;
        };
      }
    ).primitives;
    await primitives.trashDigivolutionCards(s.perm("yoshino").permanentId, [s.inst("trashed").instanceId], {
      byEffectSeat: 0,
    });
    await settle(() => s.perm("base").topCard.cardId === "BT26-044");

    expect(s.state.players[0]!.trash).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("trashed").instanceId, faceUp: true }),
    );
    expect(s.perm("yoshino").isSuspended).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("does not react when an effect trashes a card from under a different Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-091", as: "yoshino" },
            { card: "BT1-085", as: "otherTamer", under: [{ card: "BT1-001", as: "otherCard", faceUp: false }] },
            { card: "BT26-039", as: "base" },
          ],
          hand: [{ card: "BT26-044", as: "lilamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 2;
    await s.ready();

    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("otherTamer").permanentId,
      [s.inst("otherCard").instanceId],
      0,
    );

    expect(s.perm("base").topCard.cardId).toBe("BT26-039");
    expect(s.perm("yoshino").isSuspended).toBe(false);
    expect(s.state.memory).toBe(2);
  });

  it("does not react when its controller's own card suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-091", as: "yoshino" },
            { card: "BT26-039", as: "base", suspended: true },
          ],
          hand: [{ card: "BT26-044", as: "lilamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenSuspended", {
      suspendedPermanentId: s.perm("base").permanentId,
    });

    expect(s.perm("yoshino").isSuspended).toBe(false);
    expect(s.perm("base").topCard.cardId).toBe("BT26-039");
    expect(s.state.memory).toBe(2);
  });

  it("may decline the reactive digivolution without suspending or paying memory", async () => {
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
      { autoDeclineOptional: true },
    );
    s.state.memory = 2;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenSuspended", {
      suspendedPermanentId: s.perm("opponent").permanentId,
    });

    expect(s.perm("yoshino").isSuspended).toBe(false);
    expect(s.perm("base").topCard.cardId).toBe("BT26-039");
    expect(s.state.memory).toBe(2);
  });

  it("Q7148 still digivolves but pays the unreduced cost through Syakomon's restriction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-091", as: "yoshino" },
            { card: "BT26-039", as: "base" },
          ],
          hand: [{ card: "BT26-044", as: "lilamon" }],
        },
        1: {
          battleArea: [
            { card: "BT5-021", as: "syakomon" },
            { card: "BT1-089", as: "opponentTamer", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenSuspended", {
      suspendedPermanentId: s.perm("opponentTamer").permanentId,
    });
    await settle(() => s.perm("base").topCard.cardId === "BT26-044");

    expect(s.perm("yoshino").isSuspended).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("plays itself without paying its cost when checked in security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT26-091", as: "yoshino" }] },
      1: { battleArea: [{ card: "AD1-001", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const yoshinoId = s.inst("yoshino").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === yoshinoId));

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === yoshinoId)).toBe(false);
    expect(s.state.memory).toBe(0);
  });
});
