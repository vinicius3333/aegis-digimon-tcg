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
