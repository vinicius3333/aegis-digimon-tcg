import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-069.js";
import "./EX11-050.js";

describe("EX11-069 Yuuki", () => {
  const cardId = "EX11-069";
  it("preserves the printed dual-color Tamer and complete compiled coverage", () => {
    expect(getCardDefinition("EX11-069")).toMatchObject({
      nameEn: "Yuuki",
      colors: ["Purple", "Red"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["LIBERATOR"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("trashes a hand card to gain memory when played", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX11-069", as: "yuuki" }, "BT1-090"] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("yuuki").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory === 7);
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-090")).toBe(true);
    assertNoLoudGap(s);
  });

  it("trashes for Start of Main and returns a trait card at the end of all turns", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "yuuki" }],
          hand: ["BT1-090", "BT1-090", "BT1-090", "BT1-090", "BT1-090"],
          trash: [{ card: "EX11-050", as: "returnable" }],
        },
        1: { deck: ["BT1-009"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 0;
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === "Main" && s.state.turnSeat === 0 && s.state.memory === 1);
    expect(s.state.players[0]!.hand).toHaveLength(4);
    expect(s.state.players[0]!.trash.some(({ cardId: trashCardId }) => trashCardId === "BT1-090")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === "Main");
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    expect(s.perm("yuuki").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.some(({ cardId: handCardId }) => handCardId === "EX11-050")).toBe(true);
    assertNoLoudGap(s);
  });

  it("evolves only the attacking Digimon from trash, pays the cost reduced by 1, and is once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-069", as: "yuuki" },
            { card: "EX11-049", as: "attacker" },
            { card: "EX11-049", as: "other" },
          ],
          trash: [{ card: "EX11-050", as: "firstEvolution" }],
        },
        1: { battleArea: [{ card: "BT1-080", as: "defender", dp: 20_000 }], deck: ["BT1-009"] },
      },
      // Keep exactly one legal trash destination in this behavior test. The route and destination
      // boundary are asserted structurally below; the runtime proof must not depend on default
      // ordering when several cards expose alternate evolution routes.
      { autoSelectCards: true, autoAcceptOptional: true, autoChooseOption: true, preferOptionIndex: 0 },
    );
    s.state.turnSeat = 0;
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").topCard.cardId === "EX11-050");

    expect(s.perm("attacker").topCard.cardId).toBe("EX11-050");
    expect(s.perm("other").topCard.cardId).toBe("EX11-049");
    expect([2, 3]).toContain(s.state.memory);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    assertNoLoudGap(s);
  });

  const attackSetup = (handSize: number) =>
    setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-069", as: "yuuki" },
            { card: "BT2-013", as: "attacker" },
          ],
          hand: Array.from({ length: handSize }, () => "BT1-090"),
          trash: [{ card: "EX11-050", as: "evolution" }],
        },
        1: { battleArea: [{ card: "BT1-080", as: "defender", suspended: true, dp: 1_000 }], deck: ["BT1-009"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoChooseOption: true, preferOptionIndex: 0 },
    );

  it("evolves at exactly 4 cards in hand", async () => {
    const s = attackSetup(4);
    s.state.turnSeat = 0;
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").topCard.cardId === "EX11-050");

    expect(s.perm("attacker").topCard.cardId).toBe("EX11-050");
    expect([2, 3]).toContain(s.state.memory);
    assertNoLoudGap(s);
  });

  it("does not evolve when the attack starts with 5 cards in hand", async () => {
    const s = attackSetup(5);
    // Keep Yuuki out of its own Start of Main window while establishing the exact five-card
    // boundary; the attack itself then runs on the owner's turn.
    s.state.turnSeat = 1;
    s.state.memory = 5;
    await s.ready();
    s.state.turnSeat = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 5);
    expect(s.perm("attacker").topCard.cardId).toBe("BT2-013");
    expect(s.state.players[0]!.hand).toHaveLength(5);
    assertNoLoudGap(s);
  });

  it("resets the attack evolution watcher on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-069", as: "yuuki" },
            { card: "EX11-049", as: "firstAttacker" },
            { card: "EX11-050", as: "secondAttacker" },
          ],
          hand: ["BT1-090", "BT1-090", "BT1-090", "BT1-090"],
          trash: ["EX11-050", "EX11-050"],
          deck: ["BT1-011", "BT1-011", "BT1-011", "BT1-011", "BT1-011", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "firstTarget", suspended: true, dp: 1_000 }],
          security: ["BT1-010", "BT1-011", "BT1-012"],
          deck: ["BT1-013", "BT1-014", "BT1-015", "BT1-016", "BT1-017"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoChooseOption: true, preferOptionIndex: 0 },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("firstAttacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("firstTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("firstAttacker").topCard.cardId === "EX11-050");

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("secondAttacker").topCard.cardId === "EX11-050");
    expect(s.perm("secondAttacker").topCard.cardId).toBe("EX11-050");

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("plays Yuuki from security through a public security check", async () => {
    const s = setupEngine({
      0: { security: [{ card: cardId, as: "yuuki", faceUp: false }] },
      1: { battleArea: [{ card: "BT1-080", as: "attacker", dp: 20_000 }], security: ["BT1-013"] },
    });
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === cardId));
    expect(s.state.players[0]!.security).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("publishes full exclusive IR with trigger-subject evolution and no retroactive end trigger (Q5939)", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "YourTurn")?.actions).toMatchObject([
      {
        kind: "SubTrigger",
        actions: [
          {
            kind: "Digivolve",
            target: { sourceRef: "triggerSubject" },
            from: ["trash"],
            payCost: true,
            reduceCost: 1,
          },
        ],
      },
    ]);
    expect(compiled.effects.filter((effect) => effect.trigger === "EndOfAllTurns")).toHaveLength(1);
    expect(compiled.effects.find((effect) => effect.trigger === "Security")?.actions).toMatchObject([
      { kind: "PlayWithoutCost", payCost: false },
    ]);
  });
});
