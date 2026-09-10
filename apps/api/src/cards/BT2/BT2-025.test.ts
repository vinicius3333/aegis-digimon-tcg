import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-025.js";

describe("BT2-025 Ikkakumon", () => {
  it("trashes only the top source of an opposing Digimon when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT2-029", as: "attacker", under: ["BT2-025"] }] },
        1: {
          battleArea: [
            {
              card: "BT2-034",
              as: "target",
              under: [
                { card: "BT1-010", as: "bottomSource" },
                { card: "BT1-011", as: "topSource" },
              ],
            },
            { card: "BT1-012", as: "sourceLess" },
          ],
          security: ["BT1-013"],
        },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("topSource").instanceId));
    expect(s.perm("target").stack).toHaveLength(1);
    expect(s.perm("target").stack[0]!.instanceId).toBe(s.inst("bottomSource").instanceId);
    expect(s.perm("sourceLess").stack).toHaveLength(0);
  });

  it("allows the attack to resolve when no opposing Digimon has digivolution cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT2-029", as: "attacker", under: ["BT2-025"] }] },
        1: { battleArea: ["BT1-012"], security: ["BT1-013"] },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("carries Ikkakumon's inherited source through public hatch, evolution, move, and attack", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "BT2-002", as: "egg" }],
          hand: [
            { card: "BT2-022", as: "rookie" },
            { card: "BT2-025", as: "ikkakumon" },
            { card: "BT2-029", as: "attacker" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015"],
        },
        1: {
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015"],
          battleArea: [
            {
              card: "BT2-034",
              as: "sourceBearing",
              under: ["BT1-010", "BT1-011"],
            },
            { card: "BT1-012", as: "sourceLess" },
          ],
          security: ["BT1-013"],
        },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    s.state.memory = 6;
    const breedingId = s.state.players[0]!.breeding!.permanentId;
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: breedingId, instanceId: s.inst("rookie").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT2-022");
    expect(s.state.players[0]!.breeding!.stack.map((card) => card.cardId)).toEqual(["BT2-002"]);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: breedingId,
        instanceId: s.inst("ikkakumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT2-025");
    expect(s.state.players[0]!.breeding!.stack.map((card) => card.cardId)).toEqual(["BT2-002", "BT2-022"]);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: breedingId })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    expect(s.perm("ikkakumon").topCard.cardId).toBe("BT2-025");
    expect(s.perm("ikkakumon").stack.map((card) => card.cardId)).toEqual(["BT2-002", "BT2-022"]);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: breedingId,
        instanceId: s.inst("attacker").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ikkakumon").topCard.cardId === "BT2-029");
    expect(s.perm("attacker").topCard.cardId).toBe("BT2-029");
    expect(s.perm("attacker").stack.map((card) => card.cardId)).toEqual(["BT2-002", "BT2-022", "BT2-025"]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT1-011"));
    expect(s.perm("sourceBearing").stack).toHaveLength(1);
    expect(s.perm("sourceLess").stack).toHaveLength(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
