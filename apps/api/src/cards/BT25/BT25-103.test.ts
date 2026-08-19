import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT25-103 GraceNovamon", () => {
  it("returns an opponent Digimon with no more digivolution cards to deck bottom when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-103", under: ["BT24-009", "BT24-010"], as: "grace" }] },
        1: { battleArea: [{ card: "BT24-014", under: ["BT24-009"], as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const targetId = s.perm("target").topCard!.instanceId;

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("grace"));

    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === targetId)).toBe(false);
    expect(s.state.players[1]!.deck.some((card) => card.instanceId === targetId)).toBe(true);
  });

  it("exposes its printed Security Attack, Ice Clad, and Partition keywords", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT25-103", as: "grace" }] } });
    await s.ready();
    const continuous = (s.engine as unknown as {
      continuous: { hasKeyword(id: string, keyword: string): boolean; grantedKeywords(id: string): { keyword: string; amount?: number }[] };
    }).continuous;
    const id = s.perm("grace").permanentId;
    expect(continuous.hasKeyword(id, "IceClad")).toBe(true);
    expect(continuous.hasKeyword(id, "Partition")).toBe(true);
    expect(continuous.grantedKeywords(id).some((grant) => grant.keyword === "SecurityAttack" && grant.amount === 1)).toBe(true);
  });
});
