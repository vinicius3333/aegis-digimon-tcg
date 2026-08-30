import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-001.js";

describe("BT17-001 Gigimon", () => {
  it("exports the inherited paid deletion contract", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "WhenAttacking",
        isInherited: true,
        actions: [
          expect.objectContaining({
            kind: "Delete",
            cost: expect.objectContaining({ kind: "payMemory", memory: 1 }),
            target: {
              filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 3000 } },
              count: 1,
            },
            condition: expect.objectContaining({
              kind: "opponentHas",
              filter: { zone: "battleArea", controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 3000 } },
            }),
          }),
        ],
      }),
    );
  });

  it("pays 1 memory and deletes an opposing 3000 DP Digimon when its host attacks", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT17-007", under: ["BT17-001"], as: "host" }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "effectTarget" },
          { card: "AD1-003", as: "battleTarget", suspended: true },
        ],
      },
    });
    s.state.memory = 2;
    await s.ready();
    const effectTargetInstanceId = s.perm("effectTarget").topCard!.instanceId;
    const battleTargetPermanentId = s.perm("battleTarget").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("battleTarget").permanentId },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === effectTargetInstanceId));
    expect(s.state.memory).toBe(1);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === battleTargetPermanentId)).toBe(
      true,
    );
  });

  it("does not pay memory or delete when the opponent has no Digimon at 3000 DP or less", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT17-007", under: ["BT17-001"], as: "host" }] },
      1: { battleArea: [{ card: "BT1-014", as: "target" }], security: ["BT1-009"] },
    });
    s.state.memory = 2;
    await s.ready();
    const targetInstanceId = s.perm("target").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.events.some(({ kind }) => kind === "securityChecked"));
    expect(s.state.memory).toBe(2);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === targetInstanceId)).toBe(false);
  });
});
