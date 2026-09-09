import { digivolutionRequirementsFor, getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

const cardId = "EX11-037";

describe("EX11-037 Espimon", () => {
  it("preserves printed stats, Kapurimon evolution, failed-flip fallback, and inherited Jamming", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Espimon",
      colors: ["Black", "Blue"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [
        { color: "Black", level: 2, memoryCost: 1 },
        { color: "Blue", level: 2, memoryCost: 1 },
      ],
      types: ["Cyborg", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Kapurimon"], cost: 0, isAlternate: true }]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    for (const trigger of ["WhenMoving", "OnPlay"]) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger)!;
      expect(effect.actions[0]).toMatchObject({
        kind: "SecurityManipulation",
        op: "flipFaceUp",
        controller: "opponent",
      });
      expect(effect.actions[1]).toMatchObject({
        kind: "ConditionalBranch",
        condition: { kind: "ifThisEffectDidNotAct" },
        ifTrue: [
          { kind: "Draw", controller: "mine", amount: 1 },
          { kind: "GainMemory", amount: 1 },
        ],
      });
    }
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        isInherited: true,
        keywords: [expect.objectContaining({ keyword: "Jamming" })],
      }),
    );
  });

  it("flips only the opponent's top face-down security through public play", async () => {
    const s = setupEngine({
      0: { hand: [{ card: cardId, as: "source" }], deck: ["BT1-009"] },
      1: {
        security: [
          { card: "BT1-009", faceUp: false },
          { card: "BT1-013", faceUp: false },
        ],
      },
    });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === cardId));
    expect(s.state.players[1]!.security.map(({ faceUp }) => faceUp)).toEqual([true, false]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("draws 1 and gains 1 memory through public play when no face-down security remains", async () => {
    const s = setupEngine({
      0: { hand: [{ card: cardId, as: "source" }], deck: [{ card: "BT1-009", as: "drawn" }] },
      1: {
        security: [
          { card: "BT1-009", faceUp: true },
          { card: "BT1-013", faceUp: true },
        ],
      },
    });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[1]!.security.every(({ faceUp }) => faceUp === true)).toBe(true);
    assertNoLoudGap(s);
  });

  it("resolves When Moving after a public move from a real Kapurimon evolution stack", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT13-006", as: "kapurimon" },
        hand: [{ card: cardId, as: "evolver" }],
      },
      1: { security: [{ card: "BT1-009", faceUp: false }] },
    });
    await s.ready();
    s.state.memory = 0;
    const permanentId = s.perm("kapurimon").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId,
        instanceId: s.inst("evolver").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("kapurimon").topCard.cardId === cardId);
    expect(s.perm("kapurimon").stack.map(({ cardId: id }) => id)).toEqual(["BT13-006"]);
    s.state.phase = Phase.Breeding;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId })).toEqual({ ok: true });
    await settle(() => !s.perm("kapurimon").inBreeding);
    expect(s.state.players[1]!.security[0]!.faceUp).toBe(true);
    assertNoLoudGap(s);
  });

  it("keeps an EX11-039 host after inherited Jamming loses a public security battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX11-039", as: "host", under: [cardId] }] },
      1: { security: [{ card: "BT24-051", as: "securityDigimon" }], deck: ["BT1-009"] },
    });
    await s.ready();
    const hostId = s.perm("host").permanentId;

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(hostId);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(
      s.inst("securityDigimon").instanceId,
    );
    assertNoLoudGap(s);
  });
});
