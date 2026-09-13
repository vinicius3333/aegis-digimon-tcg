import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

describe("AD1-018 LordKnightmon", () => {
  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-018");
    const compiled = registeredCompiledCards.get("AD1-018") ?? getCompiledCard("AD1-018");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-018");
    expect(definition?.nameEn).toBe("LordKnightmon");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));
  });

  it("de-digivolves an opposing Digimon by two when a Knightmon is played", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-018", as: "lord" }], hand: [{ card: "BT18-069", as: "knight" }] },
        1: { battleArea: [{ card: "BT1-020", as: "opponent", under: ["BT1-010", "BT1-015"] }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("knight").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("opponent").stack.length === 0);
    expect(s.perm("opponent").stack).toHaveLength(0);
  });

  it("resets the Knightmon watcher on the next real turn", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-018", as: "lord" }],
          hand: [
            { card: "ST13-12", as: "first" },
            { card: "ST13-12", as: "same-turn" },
            { card: "ST13-12", as: "next-turn" },
          ],
          deck: [
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-020", as: "first-host", under: ["BT1-010", "BT1-015"] },
            { card: "BT1-020", as: "second-host", under: ["BT1-010", "BT1-015"] },
          ],
          deck: [
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds },
    );
    s.state.turnSeat = 0;
    s.state.memory = 30;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    preferInstanceIds.push(s.perm("first-host").topCard!.instanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("first-host").stack.length === 0);
    expect(s.perm("second-host").stack).toHaveLength(2);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("same-turn").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("second-host").stack).toHaveLength(2);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    preferInstanceIds.splice(0, preferInstanceIds.length, s.perm("second-host").topCard!.instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("next-turn").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("second-host").stack.length === 0);
    expect(s.perm("second-host").stack).toHaveLength(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("triggers its own Knightmon-text watcher when LordKnightmon is played (Q6094)", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "AD1-018", as: "lord" }] },
        1: { battleArea: [{ card: "BT1-020", as: "opponent", under: ["BT1-010", "BT1-015"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 11;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lord").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("opponent").stack.length === 0);
    expect(s.perm("opponent").stack).toHaveLength(0);
  });

  it("reduces its play cost by 5 with four Knightmon/Lucemon-text cards in trash", async () => {
    const s = setupEngine({
      0: {
        trash: ["AD1-018", "AD1-018", "AD1-018", "AD1-018"],
        hand: [{ card: "AD1-018", as: "lord" }],
      },
    });
    await s.ready();
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lord").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "AD1-018"));
    expect(s.state.memory).toBe(1);
  });

  it("grants one chosen Digimon opponent-Digimon-effect immunity through their turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "AD1-018", as: "lord" }], battleArea: [{ card: "BT1-010", as: "protected" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("protected").topCard!.instanceId);
    s.state.memory = 11;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lord").instanceId })).toEqual({ ok: true });
    await settle();
    const continuous = (
      s.engine as unknown as {
        continuous: { hasRestriction(id: string, restriction: string, sourceKind?: string): boolean };
      }
    ).continuous;
    await settle(() => continuous.hasRestriction(s.perm("protected").permanentId, "beAffected", "Digimon"));
    expect(continuous.hasRestriction(s.perm("protected").permanentId, "beAffected", "Digimon")).toBe(true);
  });

  it("de-digivolves before deleting the promoted low-cost attacker from security (Q6095)", async () => {
    const s = setupEngine(
      {
        0: { security: ["AD1-018"] },
        1: { battleArea: [{ card: "AD1-001", as: "attacker", under: ["BT1-010"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0, 5000);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("security de-digivolves first, then deletes only a resulting play-cost 3 or less Digimon", async () => {
    const qualified = setupEngine({
      0: { security: [{ card: "AD1-018", as: "security" }] },
      1: { battleArea: [{ card: "BT1-015", as: "qualified", under: ["BT1-010"] }] },
    });
    qualified.state.turnSeat = 1;
    await qualified.ready();
    expect(
      qualified.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: qualified.perm("qualified").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => qualified.state.players[1]!.battleArea.length === 0);
    expect(qualified.state.players[1]!.battleArea).toHaveLength(0);

    const boundary = setupEngine({
      0: { security: [{ card: "AD1-018", as: "security" }] },
      1: { battleArea: [{ card: "BT1-015", as: "too-expensive", dp: 20000 }] },
    });
    boundary.state.turnSeat = 1;
    await boundary.ready();
    expect(
      boundary.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: boundary.perm("too-expensive").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(boundary.state.players[1]!.battleArea).toHaveLength(1);
    expect(boundary.perm("too-expensive").topCard.cardId).toBe("BT1-015");
  });
});
