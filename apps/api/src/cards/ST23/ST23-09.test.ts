import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST23-09.js";

describe("ST23-09 Atratusmon", () => {
  it("deletes the opponent's lowest-DP Digimon when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST23-08", as: "base" }],
          hand: [{ card: "ST23-09", as: "fenriloogamon" }],
          deck: ["BT1-002"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low", dp: 3000 },
            { card: "BT1-009", as: "high", dp: 5000 },
          ],
          deck: ["BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    const lowId = s.perm("low").topCard!.instanceId;
    const highId = s.perm("high").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("fenriloogamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "ST23-09" && s.state.players[1]!.battleArea.length === 1);
    expect(s.perm("base").topCard?.cardId).toBe("ST23-09");
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === lowId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === highId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === lowId)).toBe(true);
  });

  it("exposes Security Attack +1, Reboot, and Blocker on its Digimon side", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST23-09", as: "atratusmon" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("atratusmon"), "SecurityAttack")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("atratusmon"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("atratusmon"), "Blocker")).toBe(true);
  });

  it("keeps shared once-per-turn immunity/deletion and the Option-side highest-DP return", () => {
    const card = runtimeCompiledCard("ST23-09");
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      expect(card?.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          { kind: "GrantStatic", grant: "immuneToOpponentDigimonEffects", duration: "untilOpponentTurnEnd" },
          { kind: "Delete", target: { filter: { superlative: "lowestDP" } } },
        ],
      });
    }
    expect(card?.effects.find((effect) => effect.trigger === "Main")).toMatchObject({
      actions: [
        { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] } } },
        {
          kind: "Return",
          to: "deckBottom",
          target: { filter: { controller: "opponent", suspended: true, superlative: "highestDP" } },
        },
      ],
    });
  });

  it("uses Security Attack +1 in a real player attack and performs two checks", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST23-09", as: "attacker" }] },
      1: { security: ["BT1-001", "BT1-002"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 2);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("uses Blocker in a real player attack and keeps the blocker after the unequal battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST2-11", as: "attacker" }] },
      1: { battleArea: [{ card: "ST23-09", as: "blocker" }], security: ["BT1-001"] },
    });
    const attackerId = s.perm("attacker").permanentId;
    const blockerId = s.perm("blocker").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: blockerId })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.events.find((event) => event.kind === "combatResolved")).toMatchObject({
      deletedPermanentIds: [attackerId],
    });
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === blockerId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("uses Reboot to unsuspend the host during the opponent's active phase", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST23-09", as: "host", suspended: true }] },
      1: { deck: ["BT1-001", "BT1-002"] },
    });
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(s.perm("host").isSuspended).toBe(false);
  });
});
