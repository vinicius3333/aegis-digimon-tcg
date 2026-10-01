import { describe, expect, it } from "vitest";
import type { GameEngine } from "../../engine/GameEngine.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-018.js";

describe("BT6-018 Agumon - Bond of Bravery", () => {
  it("deletes up to 13000 DP when attacking and trashes security only once per turn on deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT6-018", as: "bond" }, "BT1-085"] },
        1: {
          battleArea: [
            { card: "BT6-016", dp: 13000, as: "first", suspended: true },
            { card: "BT1-009", as: "second" },
          ],
          security: ["BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    const firstId = s.perm("first").permanentId;
    const secondId = s.perm("second").permanentId;
    const engine = s.engine as unknown as Pick<GameEngine, "applyIntent"> & {
      primitives: { deletePermanent(ids: string[], cause?: string): Promise<number> };
    };

    expect(
      engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("bond").permanentId,
        target: { kind: "permanent", permanentId: firstId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.security.length === 1 &&
        !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === firstId),
    );
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === firstId)).toBe(false);

    await engine.primitives.deletePermanent([secondId], "byEffect");
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === secondId));
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});

describe("BT6-018 Agumon - Bond of Bravery — KB Q&A rulings", () => {
  async function attackStrongerDigimon(withTamer: boolean) {
    // The attack target outclasses Agumon, so the battle itself deletes no opposing Digimon.
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT6-018", as: "bond" }, ...(withTamer ? ["BT1-085"] : [])] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "attackTarget", dp: 15000, suspended: true },
            { card: "BT1-009", as: "victim", dp: 13000 },
          ],
          security: [
            { card: "BT1-011", as: "topSecurity" },
            { card: "BT1-010", as: "bottomSecurity" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const bondId = s.perm("bond").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: bondId,
        target: { kind: "permanent", permanentId: s.perm("attackTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === bondId));
    return s;
  }

  it("trashes the top security card when its own [When Attacking] effect deletes a Digimon (Q1411)", async () => {
    const deleted = await attackStrongerDigimon(true);
    const opponent = deleted.state.players[1]!;
    expect(opponent.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      deleted.perm("attackTarget").permanentId,
    ]);
    expect(opponent.trash.map((card) => card.instanceId)).toContain(deleted.inst("topSecurity").instanceId);
    expect(opponent.security.map((card) => card.instanceId)).toEqual([deleted.inst("bottomSecurity").instanceId]);

    const noTamer = await attackStrongerDigimon(false);
    expect(noTamer.state.players[1]!.battleArea).toHaveLength(2);
    expect(noTamer.state.players[1]!.security).toHaveLength(2);
  });
});
