import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-073.js";

describe("BT3-073 CresGarurumon", () => {
  it("reveals per opposing Digimon and plays an eligible card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-013", as: "base" }],
          hand: [{ card: "BT3-073", as: "evolving" }],
          deck: ["BT3-015", { card: "BT1-010", as: "played" }],
        },
        1: { battleArea: ["BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "BT3-073"));

    expect(player.battleArea.some((p) => p.topCard.cardId === "BT1-010")).toBe(true);
  });

  it("remains suspended after attacking despite having Reboot", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT3-073", as: "attacker", dp: 20000 }] },
      1: { security: ["BT1-010"] },
    });
    s.state.memory = 1;
    const combat = (s.engine as unknown as { combat: { isAttacking: boolean } }).combat;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !combat.isAttacking);

    expect(s.perm("attacker").isSuspended).toBe(true);
  });

  it("scales the reveal and plays a black level 5 while rejecting a level 6", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-013", as: "base" }],
          hand: [{ card: "BT3-073", as: "evolving" }],
          deck: [
            { card: "BT1-001", as: "digivolutionDraw" },
            { card: "BT3-075", as: "tooHigh" },
            { card: "BT3-068", as: "blackLevel5" },
          ],
        },
        1: { battleArea: ["BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT3-068") &&
        s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("tooHigh").instanceId),
    );

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT3-068")).toBe(true);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("tooHigh").instanceId)).toBe(true);
  });
});

describe("BT3-073 CresGarurumon — KB Q&A rulings", () => {
  it("offers only black or red level 5 or lower Digimon cards to play (Q1095)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-013", as: "base" }],
          hand: [{ card: "BT3-073", as: "evolving" }],
          deck: [
            { card: "BT1-001", as: "digivolutionDraw" },
            { card: "BT3-068", as: "blackLevel5" },
            { card: "BT1-020", as: "redLevel5" },
            { card: "BT1-057", as: "yellowLevel5" },
            { card: "BT3-075", as: "blackLevel6" },
            { card: "ST1-16", as: "redOption" },
          ],
        },
        1: { battleArea: ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("redLevel5").instanceId);
    s.state.memory = 4;
    const redLevel5Id = s.inst("redLevel5").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === redLevel5Id));

    const playChoice = s.decisions.find(
      ({ seat, req }) => seat === 0 && req.options?.candidateInstanceIds?.includes(redLevel5Id) === true,
    );
    expect(new Set(playChoice?.req.options?.candidateInstanceIds)).toEqual(
      new Set([s.inst("blackLevel5").instanceId, redLevel5Id]),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === redLevel5Id)).toBe(true);
    const deckIds = s.state.players[0]!.deck.map((card) => card.instanceId);
    for (const alias of ["blackLevel5", "yellowLevel5", "blackLevel6", "redOption"]) {
      expect(deckIds).toContain(s.inst(alias).instanceId);
    }
  });
});
