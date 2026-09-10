import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { getCardDefinition } from "@aegis/shared";
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
              under: [{ card: "BT1-009", as: "existing", faceUp: false }],
            },
          ],
          hand: [{ card: "P-236", as: "beatbreakOption" }],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.perm("kyo").stack.map(({ instanceId, faceUp }) => ({ instanceId, faceUp }))).toEqual([
      { instanceId: s.inst("beatbreakOption").instanceId, faceUp: false },
      { instanceId: s.inst("existing").instanceId, faceUp: false },
    ]);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("may decline the start-main cost without placing, drawing, or gaining memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-089", as: "kyo" }],
          hand: [{ card: "P-236", as: "beatbreak" }],
          deck: ["BT1-010"],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.memory).toBe(0);
    expect(s.perm("kyo").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("places the deck top without a debuff after a normal security check", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-089", as: "kyo" }],
          security: ["BT1-009"],
          deck: [{ card: "BT1-010", as: "placed" }, "BT1-011", "BT1-012", "BT1-013"],
        },
        1: { battleArea: [{ card: "AD1-001", as: "attacker" }], deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

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
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("resolves the shared body exactly once when an effect removes security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-089", as: "kyo" }],
          security: ["BT1-009"],
          deck: [
            { card: "BT1-010", as: "placed" },
            { card: "BT1-011", as: "remaining" },
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
          security: ["BT1-009"],
          deck: [{ card: "BT1-010", as: "top" }],
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
          deck: [{ card: "BT1-010", as: "top" }],
        },
        1: { security: ["BT1-009"] },
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
            { card: "BT1-010", as: "firstDraw" },
            { card: "BT1-011", as: "secondDraw" },
            { card: "BT1-012", as: "placedAfterSecurity" },
          ],
        },
        1: { battleArea: [{ card: "AD1-001", as: "attacker" }], deck: ["BT1-013", "BT1-014", "BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
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
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("plays itself without paying its cost when checked in security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT26-089", as: "kyo" }], deck: ["BT1-009"] },
      1: { battleArea: [{ card: "AD1-001", as: "attacker" }], deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"] },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    const kyoId = s.inst("kyo").instanceId;
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === kyoId));

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === kyoId)).toBe(false);
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
