import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-101.js";

describe("P-101 Raremon", () => {
  it("Q4186 always carries the Cyborg trait in its card definition", () => {
    expect(getCardDefinition("P-101")?.types).toEqual(expect.arrayContaining(["Undead", "Cyborg"]));
  });

  it("trashes exactly 1 hand card on play, then draws 2", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "P-101", as: "raremon" },
            { card: "BT1-009", as: "fodder" },
          ],
          deck: [
            { card: "BT1-010", as: "drawOne" },
            { card: "BT1-011", as: "drawTwo" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("raremon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => [s.inst("drawOne"), s.inst("drawTwo")].every((drawn) =>
      s.state.players[0]!.hand.some((card) => card.instanceId === drawn.instanceId)
    ));

    expect(s.state.players[0]!.trash.some(
      (card) => card.instanceId === s.inst("fodder").instanceId,
    )).toBe(true);
    assertNoLoudGap(s);
  });

  it("trashes 1 hand card and draws 2 after digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-069", as: "base" }],
          hand: [
            { card: "P-101", as: "raremon" },
            { card: "BT1-009", as: "fodder" },
          ],
          deck: [
            { card: "BT1-010", as: "evolutionDraw" },
            { card: "BT1-011", as: "effectDrawOne" },
            { card: "BT1-012", as: "effectDrawTwo" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("raremon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => ["evolutionDraw", "effectDrawOne", "effectDrawTwo"].every((alias) =>
      s.state.players[0]!.hand.some((card) => card.instanceId === s.inst(alias).instanceId)
    ));

    expect(s.perm("base").topCard.instanceId).toBe(s.inst("raremon").instanceId);
    expect(s.state.players[0]!.trash.some(
      (card) => card.instanceId === s.inst("fodder").instanceId,
    )).toBe(true);
    expect(s.state.memory).toBe(7);
    assertNoLoudGap(s);
  });

  it("inherited When Attacking pays the hand-trash cost before deleting a level 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-075", as: "host", under: ["P-101"] }],
          hand: [{ card: "BT1-009", as: "fodder" }],
        },
        1: {
          battleArea: [{ card: "BT1-028", as: "level3" }],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const targetId = s.perm("level3").permanentId;

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some(
      (permanent) => permanent.permanentId === targetId,
    ));

    expect(s.state.players[0]!.trash.some(
      (card) => card.instanceId === s.inst("fodder").instanceId,
    )).toBe(true);
    assertNoLoudGap(s);
  });
});
