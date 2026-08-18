import { EffectTiming, getCardDefinition, getCompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { default as compiled } from "./BT2-085.js";

describe("BT2-085 Joe Kido", () => {
  it("matches official metadata and publishes the typed trash watcher", () => {
    expect(getCardDefinition("BT2-085")).toMatchObject({
      nameEn: "Joe Kido",
      colors: ["Blue"],
      effectText: expect.stringContaining("digivolution cards is trashed"),
    });
    expect(compiled).toEqual(getCompiledCard("BT2-085"));
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });
  it("suspends to gain memory when an opponent's digivolution card is trashed by an effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT2-085", as: "joe" }] },
        1: { battleArea: [{ card: "BT1-019", as: "target", under: ["BT1-010"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    const sourceId = s.perm("target").stack[0]!.instanceId;

    await advance(s.engine).verb.trashDigivolutionCards(s.perm("target").permanentId, [sourceId], 0);

    expect(s.perm("joe").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT2-085", as: "securityTamer", faceUp: true }] } });
    const instanceId = s.inst("securityTamer").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTamer"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId)).toBe(true);
  });
});
