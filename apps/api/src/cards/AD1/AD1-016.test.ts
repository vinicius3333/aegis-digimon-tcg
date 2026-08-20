import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

describe("AD1-016 ShineGreymon", () => {
  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-016");
    const compiled = registeredCompiledCards.get("AD1-016") ?? getCompiledCard("AD1-016");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-016");
    expect(definition?.nameEn).toBe("ShineGreymon");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));

  });

  it("plays Marcus Damon for free and applies -3000 DP per own Digimon or Tamer", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-042", as: "rize" }], hand: [{ card: "AD1-016", as: "shine" }, { card: "BT12-092", as: "marcus" }] },
      1: { battleArea: [{ card: "BT1-010", as: "target", dp: 12000 }] },
    }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("rize").permanentId, instanceId: s.inst("shine").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 6000);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "BT12-092")).toBe(true);
    expect(s.perm("target").currentDP).toBe(6000);
  });
});
