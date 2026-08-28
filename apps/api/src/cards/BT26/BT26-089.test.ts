import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-089.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT26-089 compiled fidelity", () => {
  it("separates check-driven and effect-driven security removal while sharing the placement cost", () => {
    const card = compiled;
    expect(getCardDefinition("BT26-089")).toMatchObject({
      nameEn: "Kyo Sawashiro",
      colors: ["Yellow"],
      kinds: ["Tamer"],
      playCost: 3,
      types: ["Glowing Dawn", "BEATBREAK"],
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
        expect.objectContaining({
          kind: "CostGatedBlock",
          cost: expect.objectContaining({ kind: "suspend" }),
          actions: expect.arrayContaining([
            expect.objectContaining({ kind: "PlaceUnder", fromDeckTop: true, faceDown: true }),
            expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -1 } }),
          ]),
        }),
      ]),
    );
  });

  it("Q7137 places a BEATBREAK card face down at the bottom, then draws and gains memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT26-089",
              as: "kyo",
              under: [{ card: "BT1-003", as: "existing", faceUp: false }],
            },
          ],
          hand: [{ card: "P-236", as: "beatbreakOption" }],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("kyo"));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.perm("kyo").stack.map(({ instanceId, faceUp }) => ({ instanceId, faceUp }))).toEqual([
      { instanceId: s.inst("beatbreakOption").instanceId, faceUp: false },
      { instanceId: s.inst("existing").instanceId, faceUp: false },
    ]);
  });

  it("may decline the start-main cost without placing, drawing, or gaining memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-089", as: "kyo" }],
          hand: [{ card: "P-236", as: "beatbreak" }],
          deck: ["BT1-001"],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("kyo"));

    expect(s.state.memory).toBe(0);
    expect(s.perm("kyo").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("places the deck top without a debuff after a normal security check", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-089", as: "kyo" }],
          security: ["BT1-001"],
          deck: [{ card: "BT1-002", as: "placed" }],
        },
        1: { battleArea: [{ card: "AD1-001", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("kyo").isSuspended);

    expect(s.perm("kyo").stack.map(({ instanceId, faceUp }) => ({ instanceId, faceUp }))).toEqual([
      { instanceId: s.inst("placed").instanceId, faceUp: false },
    ]);
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(0);
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
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.trashFromSecurity(0, 1);

    expect(s.perm("kyo").isSuspended).toBe(true);
    expect(s.perm("kyo").stack).toHaveLength(1);
    expect(s.perm("kyo").stack[0]).toMatchObject({ instanceId: s.inst("placed").instanceId, faceUp: false });
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("remaining").instanceId]);
    expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBe(-1);
  });

  it("cannot place a deck card or apply the debuff when this Tamer is already suspended (Q7141)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-089", as: "kyo", suspended: true }],
          security: ["BT1-001"],
          deck: [{ card: "BT1-002", as: "top" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.trashFromSecurity(0, 1);

    expect(s.perm("kyo").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBe(0);
  });

  it("does not react when the opponent's security is removed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-089", as: "kyo" }],
          deck: [{ card: "BT1-002", as: "top" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.trashFromSecurity(1, 1);

    expect(s.perm("kyo").isSuspended).toBe(false);
    expect(s.perm("kyo").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("Q7142 resolves the checked Security effect before Kyo's pending reaction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-089", as: "kyo" }],
          hand: [{ card: "BT26-021", as: "toyaCost" }],
          security: [{ card: "BT26-087", as: "toya" }],
          deck: [
            { card: "BT1-001", as: "firstDraw" },
            { card: "BT1-002", as: "secondDraw" },
            { card: "BT1-003", as: "placedAfterSecurity" },
          ],
        },
        1: { battleArea: [{ card: "AD1-001", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const toyaId = s.inst("toya").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === toyaId) &&
        s.perm("kyo").stack.length === 1,
    );

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("firstDraw").instanceId, s.inst("secondDraw").instanceId]),
    );
    expect(s.perm("kyo").stack[0]).toMatchObject({
      instanceId: s.inst("placedAfterSecurity").instanceId,
      faceUp: false,
    });
  });

  it("plays itself without paying its cost when checked in security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT26-089", as: "kyo" }] },
      1: { battleArea: [{ card: "AD1-001", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const kyoId = s.inst("kyo").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === kyoId));

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === kyoId)).toBe(false);
    expect(s.state.memory).toBe(0);
  });
});
