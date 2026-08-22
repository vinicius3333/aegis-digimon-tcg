import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-077.js";

describe("BT12-077 Arresterdramon", () => {
  it("gains Rush when digivolving with at least 2 digivolution cards", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT12-077", as: "arrester", under: ["BT1-009", "BT1-010"] }] } });
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("arrester"));
    expect(observe(s.engine).hasKeyword(s.perm("arrester"), "Rush")).toBe(true);
  });

  it("does not gain Rush with fewer than 2 digivolution cards", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT12-077", as: "arrester", under: ["BT1-009"] }] } });
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("arrester"));
    expect(observe(s.engine).hasKeyword(s.perm("arrester"), "Rush")).toBe(false);
  });

  it("saves itself and draws from its inherited attack effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["BT12-077"] }, { card: "BT12-094", as: "tamer" }],
        deck: ["BT1-010"],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    const sourceId = s.perm("host").stack.find(({ cardId }) => cardId === "BT12-077")!.instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    await settle(() => s.perm("tamer").stack.some(({ instanceId }) => instanceId === sourceId));
    expect(s.perm("tamer").stack.some(({ instanceId }) => instanceId === sourceId)).toBe(true);
    const inherited = setupEngine({
      0: { battleArea: [{ card: "BT12-077", as: "inheritedHost", under: ["BT12-077"] }], deck: ["BT1-010"] },
    });
    await inherited.ready();
    await advance(inherited.engine).fire(EffectTiming.OnUseAttack, inherited.perm("inheritedHost"));
    expect(inherited.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-010");
  });
});
