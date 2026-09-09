import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX11-006.js";
import "./EX11-027.js";
import "./EX11-033.js";

describe("EX11-006 Flickmon", () => {
  it("publicly finds the exact Maquinamon peer and preserves the text-search boundary", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-033", as: "ally", dp: 3000 }],
          hand: [{ card: "EX11-027", as: "maquinamon" }],
          deck: ["EX11-027", "EX11-073", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("maquinamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ally").linked.length === 1);

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("EX11-073");
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.perm("ally").linked.map(({ cardId }) => cardId)).toEqual(["EX11-027"]);
    assertNoLoudGap(s);
  });

  it("requires a linked card before its inherited attack digivolution", () => {
    const effect = runtimeCompiledCard("EX11-006")!.effects[0]!;
    // The gate must be a condition kind the interpreter actually evaluates. The previous
    // encoding used the invented kind "hostHasLinkedWith", which falls through
    // evaluateCondition's `default: return false` arm and made the whole clause dead.
    expect(effect).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      condition: {
        kind: "selfLinkedMatchesFilter",
        filter: { nameOrTrait: [{ tokens: ["Maquinamon"], match: "nameExact" }] },
      },
    });
    expect(effect.actions[0]).toMatchObject({
      kind: "Digivolve",
      from: ["hand"],
      reduceCost: 2,
      payCost: true,
      optional: true,
      into: { nameOrTrait: [{ tokens: ["Maquinamon"], match: "text" }] },
    });
  });

  it("digivolves a linked legal stack into a card with Maquinamon in its text for cost 0", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX11-027",
              as: "host",
              dp: 20000,
              under: ["EX11-006"],
              linked: [{ card: "EX11-027", as: "maquinamonLink" }],
            },
          ],
          hand: [{ card: "EX11-029", as: "turbomon" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true, dp: 0 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    s.state.turnCount = 1;
    await s.ready();
    const targetId = s.perm("target").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: targetId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("turbomon").instanceId);
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId), 5000);

    // FAILS-WHEN-REVERTED: with the dead "hostHasLinkedWith" gate nothing digivolved, yet the
    // previous assertions (stack ["EX11-006"], memory 10) were satisfied by that no-op. Assert
    // the new top card and the grown stack so the positive path cannot pass vacuously.
    expect(s.perm("host").topCard.instanceId).toBe(s.inst("turbomon").instanceId);
    // Turbomon's own [When Digivolving] may then relink the stacked Maquinamon, so only
    // Flickmon's continued presence in the stack is asserted here.
    expect(s.perm("host").stack.map((card) => card.cardId)).toContain("EX11-006");
    expect(s.perm("host").linked.map((card) => card.cardId)).toContain("EX11-027");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("turbomon").instanceId);
    // reduceCost 2 against Turbomon's printed [Digivolve] [Maquinamon]: Cost 2 leaves 0.
    expect(s.state.memory).toBe(10);
    assertNoLoudGap(s);
  });

  it("does not trigger without a linked Maquinamon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-027", as: "host", under: ["EX11-006"] }],
          hand: [{ card: "EX11-029", as: "turbomon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true, dp: 0 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("host").topCard.cardId).toBe("EX11-027");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("turbomon").instanceId);
    expect(s.state.memory).toBe(10);
    assertNoLoudGap(s);
  });

  it("does not fire when the only link card is ExMaquinamon (exact-name boundary)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX11-027",
              as: "host",
              under: ["EX11-006"],
              linked: [{ card: "EX11-073", as: "exMaquinamonLink" }],
            },
          ],
          hand: [{ card: "EX11-029", as: "turbomon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true, dp: 0 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    s.state.turnSeat = 0;
    s.state.turnCount = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("host").topCard.cardId).toBe("EX11-027");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("turbomon").instanceId);
    expect(s.state.memory).toBe(10);
    expect(s.perm("host").linked.map((card) => card.instanceId)).toContain(s.inst("exMaquinamonLink").instanceId);
    assertNoLoudGap(s);
  });

  it("rejects a legal-level hand card without Maquinamon in its text", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-027", as: "host", under: ["EX11-006"], linked: [{ card: "EX11-027" }] }],
          hand: [{ card: "EX11-030", as: "wrongText" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true, dp: 0 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("host").topCard.cardId).toBe("EX11-027");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("wrongText").instanceId);
    assertNoLoudGap(s);
  });

  it("may decline the linked attack digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-027", as: "host", under: ["EX11-006"], linked: [{ card: "EX11-027" }] }],
          hand: [{ card: "EX11-029", as: "turbomon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true, dp: 0 }] },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("host").topCard.cardId).toBe("EX11-027");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("turbomon").instanceId);
    expect(s.state.memory).toBe(10);
    assertNoLoudGap(s);
  });

  it("refuses a same-turn reuse, then evolves again after the next own turn", async () => {
    const s = setupEngine(
      {
        1: {
          battleArea: [
            { card: "BT1-009", as: "targetA", suspended: true, dp: 1_000 },
            { card: "BT1-010", as: "targetB", suspended: true, dp: 1_000 },
            { card: "BT1-011", as: "targetC", suspended: true, dp: 1_000 },
          ],
          security: ["BT1-012", "BT1-013", "BT1-014"],
          deck: ["BT1-015", "BT1-016", "BT1-017"],
        },
        0: {
          battleArea: [
            {
              card: "EX11-027",
              as: "host",
              under: ["EX11-006", "EX11-033"],
              dp: 20000,
              linked: [{ card: "EX11-027" }],
            },
          ],
          hand: [
            { card: "EX11-029", as: "firstTurbomon" },
            { card: "EX11-033", as: "secondTurbomon" },
          ],
          security: ["BT1-012", "BT1-013", "BT1-014"],
          deck: ["BT1-015", "BT1-016", "BT1-017"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("targetA").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("firstTurbomon").instanceId);
    expect(s.perm("host").linked.map(({ cardId }) => cardId)).toContain("EX11-027");

    expect(s.perm("host").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("targetB").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("host").topCard.instanceId).toBe(s.inst("firstTurbomon").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("secondTurbomon").instanceId);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    await settle();
    expect(s.state.turnCount).toBeGreaterThan(1);
    expect(s.perm("host").isSuspended).toBe(false);
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("host").topCard.instanceId).toBe(s.inst("secondTurbomon").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("secondTurbomon").instanceId);
    expect(s.state.memory).toBe(9);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });
});
