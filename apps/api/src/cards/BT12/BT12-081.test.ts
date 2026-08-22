import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-081.js";

describe("BT12-081 Astamon", () => {
  it("registers every printed clause as executable IR", async () => {
    const { runtimeCompiledCard } = await import("../../engine/effects/interpreter/compiledCards.js");
    const card = runtimeCompiledCard("BT12-081")!;
    expect(card.coverage).toBe("full");
    expect(JSON.stringify(card)).not.toContain("RawUnparsed");
    expect(card.residual).toEqual([]);
  });

  it("plays a level 4 Save Digimon from under a Tamer", async () => {
    const s = setupEngine({ 0: {
      battleArea: [
        { card: "BT12-081", as: "astamon" },
        { card: "BT12-094", as: "tamer", under: ["BT12-008"] },
      ],
    } }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("astamon"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT12-008"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT12-008")).toBe(true);
  });

  it("offers the Quartzmon branch only with four digivolution cards", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT12-081", as: "astamon", under: ["BT12-008", "BT12-009", "BT12-010", "BT12-011"] }],
      hand: ["BT12-057"],
    } }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("astamon"));
    await settle(() => s.perm("astamon").topCard?.cardId === "BT12-057");
    expect(s.perm("astamon").topCard?.cardId).toBe("BT12-057");
  });
});
