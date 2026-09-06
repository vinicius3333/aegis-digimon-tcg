import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
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
