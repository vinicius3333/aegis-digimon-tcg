import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT17-064.js";

describe("BT17-064 Pipismon", () => {
  it("deletes an opponent's no-stack Digimon when it attacks it", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT17-064", as: "pipismon", dp: 7000 }] },
      1: { battleArea: [{ card: "AD1-001", as: "target", dp: 3000, suspended: true }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("pipismon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => !s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("target").permanentId),
      800,
    );
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("target").permanentId)).toBe(false);
  });

  it("records complete compiled coverage for Armor Purge, trash, and attack deletion", () => {
    const compiled = runtimeCompiledCard("BT17-064")!;
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
});
