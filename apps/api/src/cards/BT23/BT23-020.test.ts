import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-020.js";

describe("BT23-020 Seadramon", () => {
  it("declares Alliance", () => {
    expect(getCardDefinition("BT23-020")).toMatchObject({
      cardId: "BT23-020",
      nameEn: "Seadramon",
      colors: ["Blue", "Purple"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [
        { color: "Blue", level: 3, memoryCost: 3 },
        { color: "Purple", level: 3, memoryCost: 3 },
      ],
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Aquatic", "Hudie", "CS"],
    });
    const staticEffect = compiled.effects.find((entry) => entry.trigger === "Static") as any;
    expect(staticEffect.keywords).toEqual([{ keyword: "Alliance", raw: "＜Alliance＞" }]);
  });

  it("once per turn draws only when this Digimon suspends", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      sourceFilter: { isSelfRef: true },
      actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
    });
  });

  it("draws once when Seadramon suspends and ignores another Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT23-020", as: "seadramon" },
          { card: "BT23-017", as: "other" },
        ],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSuspended", { subjectPermanentId: s.perm("other").permanentId });
    expect(s.state.players[0]!.hand).toHaveLength(0);
    await advance(s.engine).fireSubTrigger("whenSuspended", { subjectPermanentId: s.perm("seadramon").permanentId });
    expect(s.state.players[0]!.hand).toHaveLength(1);
    await advance(s.engine).fireSubTrigger("whenSuspended", { subjectPermanentId: s.perm("seadramon").permanentId });
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("exposes Alliance on Seadramon itself but not when it is only a source", async () => {
    const main = setupEngine({ 0: { battleArea: [{ card: "BT23-020", as: "seadramon" }] } });
    await main.ready();
    expect(observe(main.engine).hasKeyword(main.perm("seadramon"), "Alliance")).toBe(true);

    const inherited = setupEngine({ 0: { battleArea: [{ card: "BT23-022", as: "host", under: ["BT23-020"] }] } });
    await inherited.ready();
    expect(observe(inherited.engine).hasKeyword(inherited.perm("host"), "Alliance")).toBe(false);
  });

  it("publicly attacks with Alliance, suspends the chosen supporter, and resolves security damage", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT23-020", as: "seadramon" },
          { card: "BT23-017", as: "ally" },
        ],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
      },
      1: { security: ["BT1-001", "BT1-002", "BT1-003"], deck: ["BT1-009", "BT1-010"] },
    });
    const host = s.perm("seadramon");
    const ally = s.perm("ally");
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: host.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    const combat = (s.engine as unknown as { combat: { hasOpenAllianceDecision: boolean } }).combat;
    await settle(() => combat.hasOpenAllianceDecision);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: ally.permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.security.length === 1 && !combat.hasOpenAllianceDecision);
    expect(host.isSuspended).toBe(true);
    expect(ally.isSuspended).toBe(true);
    expect(host.currentDP).toBe(5000);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("allows public Alliance refusal without suspending the supporter or adding a security check", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT23-020", as: "seadramon" },
          { card: "BT23-017", as: "ally" },
        ],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
      },
      1: { security: ["BT1-001", "BT1-002", "BT1-003"], deck: ["BT1-009", "BT1-010"] },
    });
    const host = s.perm("seadramon");
    const ally = s.perm("ally");
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: host.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    const combat = (s.engine as unknown as { combat: { hasOpenAllianceDecision: boolean } }).combat;
    await settle(() => combat.hasOpenAllianceDecision);
    expect(s.engine.applyIntent(0, { type: "respondAlliance" })).toEqual({ ok: true });
    await settle(() => !combat.hasOpenAllianceDecision && s.state.players[1]!.security.length === 2);
    expect(ally.isSuspended).toBe(false);
    expect(host.currentDP).toBe(5000);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("draws for an opponent-owned Seadramon on the opponent turn and resets next turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-064", as: "greenDigimon" }],
        hand: [{ card: "BT1-110", as: "flowerCannon" }],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015", "BT1-016"],
        security: ["BT1-001", "BT1-002"],
      },
      1: {
        battleArea: [{ card: "BT23-020", as: "opponentSeadramon" }],
        deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015", "BT1-016", "BT1-017", "BT1-018"],
        security: ["BT1-003", "BT1-004"],
      },
    });
    s.state.memory = 10;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const host = s.perm("opponentSeadramon");
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("flowerCannon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => host.isSuspended && s.state.players[1]!.hand.length === 1);
    expect(host.isSuspended).toBe(true);
    expect(s.state.players[1]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    const before = s.state.players[1]!.hand.length;
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: host.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.length === before + 1);
    expect(s.state.players[1]!.hand).toHaveLength(before + 1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("publicly evolves from a CS level-3 source with exact cost and source identity", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT22-008", as: "source" }],
        hand: [{ card: "BT23-020", as: "seadramon" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 5;
    const sourceId = s.inst("source").instanceId;
    const cardId = s.inst("seadramon").instanceId;
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("source").permanentId, instanceId: cardId }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.instanceId === cardId);
    expect(s.perm("source").stack[0]!.instanceId).toBe(sourceId);
    expect(s.state.memory).toBe(3);
    expect(s.perm("source").topCard.instanceId).toBe(cardId);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });

  it.each(["BT1-009", "BT23-008"])(
    "rejects an alternate evolution from the wrong trait or level (%s)",
    async (baseCard) => {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCard, as: "base" }], hand: [{ card: "BT23-020", as: "seadramon" }] },
      });
      await s.ready();
      s.state.memory = 5;
      const sourceId = s.inst("base").instanceId;
      const resultId = s.inst("seadramon").instanceId;
      expect(
        s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: resultId }),
      ).toEqual({ ok: false, reason: "invalid-evolution" });
      expect(s.state.memory).toBe(5);
      expect(s.perm("base").topCard.instanceId).toBe(sourceId);
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(resultId);
    },
  );

  it("resets the suspend draw on the next own turn through the production loop", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-020", as: "seadramon" }],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015", "BT1-016"],
      },
      1: {
        deck: ["BT1-017", "BT1-018", "BT1-019", "BT1-020", "BT1-021", "BT1-022", "BT1-023", "BT1-024"],
        security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
      },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const host = s.perm("seadramon");
    const firstHandBefore = s.state.players[0]!.hand.length;
    const firstSecurityBefore = s.state.players[1]!.security.length;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: host.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.length === firstHandBefore + 1 &&
        s.state.players[1]!.security.length === firstSecurityBefore - 1,
    );
    expect(s.state.players[0]!.hand).toHaveLength(firstHandBefore + 1);
    expect(s.state.players[1]!.security).toHaveLength(firstSecurityBefore - 1);
    await settle(() => !observe(s.engine).isAttacking());
    await advance(s.engine).verb.unsuspend([host.permanentId]);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: host.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === firstSecurityBefore - 2);
    expect(s.state.players[1]!.security).toHaveLength(firstSecurityBefore - 2);
    expect(s.state.players[0]!.hand).toHaveLength(firstHandBefore + 1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    const secondHandBefore = s.state.players[0]!.hand.length;
    const secondSecurityBefore = s.state.players[1]!.security.length;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: host.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.length === secondHandBefore + 1 &&
        s.state.players[1]!.security.length === secondSecurityBefore - 1,
    );
    expect(s.state.players[0]!.hand).toHaveLength(secondHandBefore + 1);
    expect(s.state.players[1]!.security).toHaveLength(secondSecurityBefore - 1);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
