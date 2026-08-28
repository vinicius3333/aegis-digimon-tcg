import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-024.js";

describe("LM-024 Shivamon", () => {
  it("fires both halves at exactly three security cards, per Q4026", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "LM-024", as: "shivamon" }], security: ["BT1-001", "BT1-002", "BT1-003"] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shivamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0, 2000);

    // Suspended by the first half, then returned by the second.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toContain("BT1-009");
    expect(s.state.players[0]!.battleArea.find((perm) => perm.topCard?.cardId === "LM-024")!.currentDP).toBe(14000);
  });

  it("at two security returns an already-suspended opposing Digimon and does not buff", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "LM-024", as: "shivamon" }], security: ["BT1-001", "BT1-002"] },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shivamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0, 2000);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.find((perm) => perm.topCard?.cardId === "LM-024")!.currentDP).toBe(11000);
  });

  it("at four security only suspends and buffs", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-024", as: "shivamon" }], security: 4 },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("shivamon"));
    await settle(() => s.perm("target").isSuspended, 2000);

    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("shivamon").currentDP).toBe(14000);
  });

  it("can suspend one of the controller's own Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-024", as: "shivamon" },
            { card: "BT1-024", as: "mine" },
          ],
          security: 4,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("mine").permanentId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("shivamon"));
    await settle(() => s.perm("mine").isSuspended, 2000);

    expect(s.perm("mine").isSuspended).toBe(true);
  });

  it("is immune to opposing Digimon effects only while suspended, per Q4027/Q4028", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-024", as: "shivamon", suspended: true }] },
        1: { battleArea: [{ card: "BT1-080", as: "opp" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).recompute();

    const shivamonId = s.perm("shivamon").permanentId;
    expect(observe(s.engine).isRestrictedByEffect(shivamonId, "beAffected", "Digimon")).toBe(true);

    // Q4028: once it unsuspends the protection is gone, so it is affected again.
    s.perm("shivamon").isSuspended = false;
    await advance(s.engine).recompute();
    expect(observe(s.engine).isRestrictedByEffect(shivamonId, "beAffected", "Digimon")).toBe(false);
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-024");
    const compiled = runtimeCompiledCard("LM-024");
    expect(definition?.nameEn).toBe("Shivamon");
    expect(definition?.dp).toBe(11000);
    expect(definition?.isAce).toBe(true);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });
});
