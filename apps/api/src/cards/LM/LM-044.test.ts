import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-044.js";

describe("LM-044 Ghoulmon", () => {
  it("trashes one opposing hand card, then deletes a level 6 or lower Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-044", as: "ghoulmon", suspended: true }] },
        1: {
          hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          battleArea: [
            { card: "BT1-080", as: "attacker", dp: 13000 },
            { card: "BT1-060", as: "target" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    const attackerInstanceId = s.inst("attacker").instanceId;
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("ghoulmon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.hand.length === 4 &&
        !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId),
    );

    expect(s.state.players[1]!.hand).toHaveLength(4);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(attackerInstanceId);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(false);
  });

  it("skips the discard but still deletes when the opponent already holds four cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-044", as: "ghoulmon", suspended: true }] },
        1: {
          hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          battleArea: [
            { card: "BT1-080", as: "attacker", dp: 13000 },
            { card: "BT1-060", as: "target" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    const attackerInstanceId = s.inst("attacker").instanceId;
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("ghoulmon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId), 2000);

    // The discard needs 5 or more cards; the deletion only needs 4 or fewer, and both
    // sentences are evaluated on their own.
    expect(s.state.players[1]!.hand).toHaveLength(4);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(attackerInstanceId);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(false);
  });

  it("discards down to five and then deletes nothing", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-044", as: "ghoulmon", suspended: true }] },
        1: {
          hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          battleArea: [
            { card: "BT1-080", as: "attacker", dp: 13000 },
            { card: "BT1-060", as: "target" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    const attackerInstanceId = s.inst("attacker").instanceId;
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("ghoulmon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.length === 5, 2000);

    expect(s.state.players[1]!.hand).toHaveLength(5);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(attackerInstanceId);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(true);
  });

  it("carries Blocker and Retaliation", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "LM-044", as: "ghoulmon" }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("ghoulmon"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("ghoulmon"), "Retaliation")).toBe(true);
  });

  it("blocks a public player attack and Retaliation trashes Ghoulmon's attacker", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-044", as: "ghoulmon" }] },
        1: { battleArea: [{ card: "BT1-080", as: "attacker", dp: 13000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const attackerInstanceId = s.inst("attacker").instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("ghoulmon").permanentId }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "LM-044")).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(attackerInstanceId);
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-044");
    const compiled = runtimeCompiledCard("LM-044");
    expect(definition?.nameEn).toBe("Ghoulmon");
    expect(definition?.colors).toEqual(["Purple"]);
    expect(definition?.dp).toBe(11000);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects[0]).toMatchObject({ keywords: [{ keyword: "BlastDigivolve" }] });
  });
});
