import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-087.js";
import { compiled } from "./EX11-064.js";

describe("EX11-064 Altea", () => {
  it("preserves the printed dual-color Tamer and complete compiled coverage", () => {
    expect(getCardDefinition("EX11-064")).toMatchObject({
      nameEn: "Altea",
      colors: ["Black", "Blue"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["LIBERATOR"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("flips the opponent's top face-down security card face up (Q5928-Q5931)", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX11-064", as: "altea" }] },
      1: { security: ["BT1-090", "BT1-091"] },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("altea").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security[0]!.faceUp === true);

    expect(s.state.players[1]!.security[0]!.faceUp).toBe(true);
    expect(s.state.players[1]!.security[1]!.faceUp).toBe(false);
    assertNoLoudGap(s);
  });

  it("digivolves only the attacking Cyborg and reduces its cost per face-up opposing security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-064", as: "altea" },
            { card: "EX11-037", as: "attackingCyborg" },
            { card: "EX11-037", as: "otherCyborg" },
          ],
          hand: [{ card: "EX11-039", as: "evolution" }],
          deck: ["AD1-001"],
        },
        1: {
          security: [{ card: "BT1-090", faceUp: true }, { card: "BT1-091", faceUp: true }, "BT1-092"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attackingCyborg").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attackingCyborg").topCard?.cardId === "EX11-039");

    expect(s.perm("altea").isSuspended).toBe(true);
    expect(s.perm("attackingCyborg").topCard?.cardId).toBe("EX11-039");
    expect(s.perm("otherCyborg").topCard?.cardId).toBe("EX11-037");
    expect(s.state.memory).toBe(2);
    assertNoLoudGap(s);
  });

  it("ignores an attack by a Digimon with neither the [Cyborg] nor [Machine] trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-064", as: "altea" },
            { card: "EX11-049", as: "nonCyborg" },
          ],
          hand: [{ card: "EX11-039", as: "evolution" }],
          deck: ["AD1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("nonCyborg").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.pendingDecision);

    expect(s.perm("altea").isSuspended).toBe(false);
    expect(s.perm("nonCyborg").topCard?.cardId).toBe("EX11-049");
    expect(s.state.memory).toBe(3);
    assertNoLoudGap(s);
  });

  it("publishes full exclusive IR with trigger-subject scoping and folded face-up scaling", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    const yourTurn = compiled.effects.find((effect) => effect.trigger === "YourTurn")!;
    expect(yourTurn.actions).toHaveLength(1);
    expect(yourTurn.actions).toMatchObject([
      {
        kind: "SubTrigger",
        event: "whenAttacking",
        actions: [
          {
            kind: "Digivolve",
            target: { sourceRef: "triggerSubject" },
            payCost: true,
            reduceCostScaling: {
              unit: "security",
              filter: { controller: "opponent", faceUp: true },
            },
          },
        ],
      },
    ]);
  });

  it("gains 1 memory at the start of main while the opponent has a Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX11-064", as: "altea" }], deck: ["BT1-009", "BT1-010"] },
      1: { battleArea: [{ card: "BT1-011", as: "opponent" }], deck: ["BT1-012", "BT1-013"] },
    });
    s.state.memory = 2;
    s.state.turnCount = 1;
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === "Main" && s.state.turnSeat === 0);

    expect(s.state.memory).toBe(3);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("plays Altea from security through a public attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-013", as: "attacker", dp: 20_000 }] },
      1: { security: [{ card: "EX11-064", as: "securityAltea" }] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-064"));

    expect(
      s.state.players[1]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("securityAltea").instanceId),
    ).toBe(true);
    assertNoLoudGap(s);
  });

  it("triggers a face-up security card's Security effect on a public check (Q5930)", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX11-064", as: "flipper" }],
        battleArea: [{ card: "BT1-013", as: "attacker", dp: 20_000 }],
      },
      1: { security: [{ card: "EX11-064", as: "securityAltea" }, "BT1-009"] },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("flipper").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.security[0]?.faceUp === true);
    expect(s.state.players[1]!.security[0]!.instanceId).toBe(s.inst("securityAltea").instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("securityAltea").instanceId),
    );

    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "effectTriggered", sourceCardId: "EX11-064", timing: "Security" }),
    );
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).not.toContain(
      s.inst("securityAltea").instanceId,
    );
    assertNoLoudGap(s);
  });

  it("turns the same face-up security card face down when a public effect shuffles security (Q5931)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX11-064", as: "altea" }],
          deck: Array(20).fill("BT1-009"),
        },
        1: {
          hand: [{ card: "BT1-087", as: "tk" }],
          deck: Array(20).fill("BT1-013"),
          security: [
            { card: "BT1-009", as: "flipped" },
            { card: "BT1-013", as: "taken" },
            { card: "BT1-014", as: "other" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: false },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("altea").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.security[0]?.faceUp === true);
    const flippedId = s.inst("flipped").instanceId;
    expect(s.state.players[1]!.security[0]!.instanceId).toBe(flippedId);

    expect(s.state.turnSeat).toBe(1);
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("tk").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("taken").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[1]!.security.find(({ instanceId }) => instanceId === flippedId)?.faceUp === false,
    );

    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toContain(flippedId);
    expect(s.state.players[1]!.security.every(({ faceUp }) => faceUp === false)).toBe(true);
    expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("taken").instanceId);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });
});
