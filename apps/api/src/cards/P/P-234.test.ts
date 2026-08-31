import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-234.js";

describe("P-234 Yujin Ozora", () => {
  it("reveals four cards and adds one supported trait", () => {
    expect(runtimeCompiledCard("P-234")!.effects).toContainEqual(
      expect.objectContaining({
        trigger: "OnPlay",
        actions: [
          expect.objectContaining({
            kind: "RevealAdd",
            revealCount: 4,
            add: [
              expect.objectContaining({
                count: 1,
                filter: {
                  controllerDefault: "mine",
                  nameOrTrait: [{ tokens: ["System", "Navi", "Tool", "Leviathan"], match: "trait" }],
                },
                to: "hand",
              }),
            ],
            rest: "deckBottom",
          }),
        ],
      }),
    );
  });

  it("links from hand after a link card is trashed, with the suspend cost and reduction", () => {
    expect(runtimeCompiledCard("P-234")!.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        actions: [
          expect.objectContaining({
            kind: "SubTrigger",
            event: "whenLinkTrashed",
            sourceFilter: { controller: "mine", kind: ["Digimon"] },
            actions: [
              expect.objectContaining({
                kind: "Link",
                from: ["hand"],
                costDelta: -2,
                recipient: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
                cost: expect.objectContaining({ kind: "suspend" }),
              }),
            ],
          }),
        ],
      }),
    );
  });

  it("plays without cost from Security", () => {
    expect(runtimeCompiledCard("P-234")!.effects).toContainEqual(
      expect.objectContaining({ trigger: "Security", isSecurity: true }),
    );
  });
});
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("P-234 engine behavior", () => {
  it("plays itself from Security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "P-234", as: "yujin" }] } });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("yujin"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("yujin").instanceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("yujin").instanceId)).toBe(true);
  });
});
