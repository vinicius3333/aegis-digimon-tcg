import { EffectDuration } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-015.js";
import "../index.js";

describe("BT21-015 Cyclonemon", () => {
  it("exposes complete effect coverage with no residual clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
    expect(compiled.effects).toBeDefined();
  });

  it("preserves the registered effect triggers and action boundaries", () => {
    expect(compiled.effects.every((effect) => typeof effect.trigger === "string")).toBe(true);
    for (const effect of compiled.effects) {
      expect(Array.isArray(effect.actions)).toBe(true);
      for (const action of effect.actions ?? []) expect(typeof action.kind).toBe("string");
    }
  });

  it("plays from security and deletes one opposing Digimon at 4000 DP or less on play or digivolution", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "Security",
        timing: "endOfBattle",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenSecurityBattleEnded",
            once: true,
            actions: [
              {
                kind: "PlayWithoutCost",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                from: ["trash"],
                payCost: false,
              },
            ],
          },
        ],
      }),
      expect.objectContaining({
        trigger: "OnPlay",
        actions: [
          {
            kind: "Delete",
            target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } }, count: 1 },
          },
        ],
      }),
      expect.objectContaining({
        trigger: "WhenDigivolving",
        actions: [
          {
            kind: "Delete",
            target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } }, count: 1 },
          },
        ],
      }),
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        actions: [
          {
            kind: "ModifyDP",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            amount: 2000,
            duration: "permanent",
          },
        ],
      }),
    ]);
  });

  it("plays for 5 and deletes exactly one opposing Digimon at the 4000 DP boundary", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT21-015", as: "cyclonemon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "atBoundary", dp: 4000 },
            { card: "BT1-010", as: "above", dp: 5000 },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("atBoundary").permanentId);
    s.state.memory = 8;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cyclonemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === preferred[0]));
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT1-010"]);
    expect(s.state.memory).toBe(3);
  });

  it("deletes an eligible Digimon after a real digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-007", as: "agumon" }],
          hand: [{ card: "BT21-015", as: "cyclonemon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 4000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("agumon").permanentId,
        instanceId: s.inst("cyclonemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.perm("agumon").topCard.cardId).toBe("BT21-015");
    expect(s.state.memory).toBe(3);
  });

  it("plays itself free from Security and resolves its On Play deletion", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "attacker", dp: 6000 },
            { card: "BT1-010", as: "target", dp: 4000 },
          ],
        },
        1: { security: [{ card: "BT21-015", as: "cyclonemon" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").topCard.instanceId);
    const attackerPermanentId = s.perm("attacker").permanentId;
    const targetPermanentId = s.perm("target").permanentId;
    s.state.memory = 2;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId, target: { kind: "player" } })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-015"));
    const checkedIndex = s.events.findIndex(
      (event) => event.kind === "securityChecked" && event.revealedCardId === "BT21-015",
    );
    const playedIndex = s.events.findIndex((event) => event.kind === "cardPlayed" && event.cardId === "BT21-015");
    const checked = s.events[checkedIndex] as { battle?: unknown } | undefined;
    expect(checkedIndex).toBeGreaterThanOrEqual(0);
    expect(checked?.battle).toBeDefined();
    expect(playedIndex).toBeGreaterThan(checkedIndex);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerPermanentId)).toBe(
      true,
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === targetPermanentId)).toBe(false);
  });

  it("allows a security-played Cyclonemon to trigger Callismon's nested battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT10-055", as: "attacker" }] },
        1: {
          battleArea: [
            { card: "BT25-058", as: "callismonA", dp: 13000 },
            { card: "BT25-058", as: "callismonB", dp: 13000 },
          ],
          security: [{ card: "BT21-015", as: "cyclonemon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    const attackerId = s.perm("attacker").permanentId;
    const callismonAId = s.perm("callismonA").permanentId;
    const callismonBId = s.perm("callismonB").permanentId;
    const cyclonemonInstanceId = s.inst("cyclonemon").instanceId;
    advance(s.engine).ledgers.modifiers.addDpModifier(s.state, attackerId, 1000, EffectDuration.UntilEndBattle);
    expect(s.perm("attacker").currentDP).toBe(14000);

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId)).toBe(true);
    expect(s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === attackerId)?.currentDP).toBe(
      13000,
    );
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === callismonAId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === callismonBId)).toBe(false);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("callismonA").instanceId, s.inst("callismonB").instanceId]),
    );
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === cyclonemonInstanceId),
    ).toBe(true);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    const nestedBattles = s.events.filter((event) => event.kind === "combatResolved" && event.seat === 1);
    const nestedTriggers = s.events.filter(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === "BT25-058" && event.timing === "whenPlayed",
    );
    expect(nestedTriggers).toHaveLength(2);
    expect(nestedBattles).toHaveLength(1);
    expect([callismonAId, callismonBId]).toContain(nestedBattles[0]!.attackerPermanentId);
    expect(nestedBattles[0]!.deletedPermanentIds).toContain(nestedBattles[0]!.attackerPermanentId);
    expect(
      nestedBattles.every(
        (event) => event.kind === "combatResolved" && event.deletedPermanentIds.includes(attackerId) === false,
      ),
    ).toBe(true);
  });

  it("grants inherited +2000 DP only during its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-024", as: "host", dp: 6000, under: ["BT21-015"] }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(8000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(6000);
  });
});
