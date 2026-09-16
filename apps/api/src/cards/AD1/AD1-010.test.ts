import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine as setup, settle, assertNoLoudGap } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./AD1-010.js";

describe("AD1-010 Inherited Effect <Jamming> — survives a losing Security Digimon battle from the stack", () => {
  it("free-digivolves a chosen Digimon into Garurumon when a Greymon is played", async () => {
    const s = setup(
      {
        0: {
          battleArea: [{ card: "AD1-010", as: "host" }],
          hand: [
            { card: "AD1-001", as: "greymon" },
            { card: "BT1-040", as: "garurumon" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("greymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard.cardId === "BT1-040");
    expect(s.perm("host").topCard.cardId).toBe("BT1-040");
  });

  it("draws on play and when digivolving", async () => {
    const played = setup({ 0: { deck: ["BT1-009"], hand: [{ card: "AD1-010", as: "garurumon" }] } });
    played.state.memory = 5;
    expect(played.engine.applyIntent(0, { type: "playCard", instanceId: played.inst("garurumon").instanceId })).toEqual(
      { ok: true },
    );
    await settle(() => played.state.players[0]!.hand.length === 1);
    expect(played.state.players[0]!.hand[0]!.cardId).toBe("BT1-009");

    const evolved = setup({
      0: {
        battleArea: [{ card: "BT22-017", as: "base" }],
        deck: ["BT1-009"],
        hand: [{ card: "AD1-010", as: "garurumon" }],
      },
    });
    evolved.state.memory = 3;
    expect(
      evolved.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: evolved.perm("base").permanentId,
        instanceId: evolved.inst("garurumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => evolved.state.players[0]!.hand.some((card) => card.cardId === "BT1-009"));
    expect(evolved.state.memory).toBe(1);
  });

  it("uses both alternate level-3 routes for cost 2", async () => {
    for (const baseCard of ["BT22-017", "ST21-02"]) {
      const s = setup({
        0: { battleArea: [{ card: baseCard, as: "base" }], hand: [{ card: "AD1-010", as: "garurumon" }] },
      });
      s.state.memory = 3;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("garurumon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "AD1-010");
      expect(s.state.memory).toBe(1);
    }
  });

  it("free-digivolves after Matt Ishida is played", async () => {
    const s = setup(
      {
        0: {
          battleArea: [{ card: "AD1-010", as: "host" }],
          hand: [
            { card: "BT1-086", as: "matt" },
            { card: "BT1-040", as: "weregarurumon" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("matt").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT1-040");
    expect(s.perm("host").topCard.cardId).toBe("BT1-040");
  });

  it("does not retrigger after this Garurumon itself digivolves into Greymon (Q6077)", async () => {
    const s = setup(
      {
        0: {
          battleArea: [{ card: "AD1-010", as: "host" }],
          hand: [
            { card: "BT10-024", as: "metalgreymon" },
            { card: "AD1-002", as: "metalgarurumon" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("metalgreymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT10-024");
    await settle();

    expect(s.perm("host").topCard.cardId).toBe("BT10-024");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "AD1-002")).toBe(true);
  });

  it("models both play/digivolve watchers and alternate digivolution requirements", () => {
    const allTurns = compiled.effects.find((effect) => effect.trigger === "AllTurns");
    expect(allTurns?.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ event: "whenPlayed" }),
        expect.objectContaining({ event: "whenOneOfYoursDigivolves" }),
      ]),
    );
    expect(compiled.digivolutionRequirement).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ level: 3, texts: ["Omnimon"], cost: 2 }),
        expect.objectContaining({ level: 3, traits: ["ADVENTURE"], cost: 2 }),
      ]),
    );
  });

  it("a low-DP top card stacked over AD1-010 is NOT deleted by a higher-DP Security Digimon (Jamming)", async () => {
    const s = setup({
      0: { battleArea: [{ card: "AD1-001", dp: 1000, as: "attacker", under: ["AD1-010"] }] },
      1: { security: ["BT1-009"] },
    });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const attacker = s.perm("attacker");

    await s.engine.recomputeContinuousEffects();
    expect(
      (s.engine as unknown as { continuous: { hasKeyword(id: string, k: string): boolean } }).continuous.hasKeyword(
        attacker.permanentId,
        "Jamming",
      ),
    ).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => p1.security.length === 0);
    await settle(() => p0.battleArea.some((p) => p.permanentId === attacker.permanentId));

    expect(p0.battleArea.some((p) => p.permanentId === attacker.permanentId)).toBe(true);
    expect(p0.trash.some((c) => c.instanceId === attacker.topCard?.instanceId)).toBe(false);
    assertNoLoudGap(s);
  });

  it("negative control: AD1-010 as the TOP card (not stacked) does NOT grant itself Jamming — it is an Inherited Effect", async () => {
    const s = setup({
      0: { battleArea: [{ card: "AD1-010", dp: 1000, as: "attacker" }] },
      1: { security: ["BT1-009"] },
    });
    const p0 = s.state.players[0] as PlayerState;
    const attacker = s.perm("attacker");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => !p0.battleArea.some((p) => p.permanentId === attacker.permanentId));

    expect(p0.battleArea.some((p) => p.permanentId === attacker.permanentId)).toBe(false);
    assertNoLoudGap(s);
  });
});
