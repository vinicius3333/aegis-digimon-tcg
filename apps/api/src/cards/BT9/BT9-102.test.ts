import { getCardDefinition } from "@aegis/shared";
import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-102.js";
import "./BT9-102.js";
describe("BT9-102 Attack of the Heavy Mobile Digimon!", () => {
  it("matches catalog values and all-Machine grant and security IR", () => {
    expect(getCardDefinition("BT9-102")).toMatchObject({
      colors: ["Black"],
      kinds: ["Option"],
      playCost: 0,
      securityEffectText:
        "[Security] You may trash 1 Digimon card with [Cyborg] or [Machine] in its traits in your hand to delete 1 of your opponent’s Digimon whose play cost is less than or equal to the trashed card’s play cost.",
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "Main",
          actions: [
            {
              kind: "GainKeyword",
              keyword: { keyword: "Rush" },
              duration: "forTheTurn",
              optional: true,
              includeLaterEntrants: true,
              target: { count: "all", filter: { levels: [6], traits: ["Machine"] } },
            },
            {
              kind: "GrantStatic",
              grant: "effects",
              tokens: ["OnPlayBlitzIfHasDigivolutionCard"],
              includeLaterEntrants: true,
              target: { count: "all", filter: { levels: [6], traits: ["Machine"] } },
            },
          ],
        },
        {
          trigger: "Security",
          isSecurity: true,
          actions: [
            {
              kind: "Delete",
              optional: true,
              cost: {
                kind: "trash",
                target: { filter: { kind: ["Digimon"] }, count: 1 },
                bindResultAs: "trashedSecurityCard",
              },
              target: {
                filter: {
                  kind: ["Digimon"],
                  relativeTo: { attr: "playCost", op: "lte", selectionRef: "trashedSecurityCard" },
                },
              },
            },
          ],
        },
      ],
    });
    const rush = compiled.effects.find((effect) => effect.trigger === "Main")!.actions[0]!;
    expect(rush).not.toHaveProperty("playerWide");
    expect(rush).toMatchObject({ kind: "GainKeyword", includeLaterEntrants: true });
  });

  it("installs the Rush effect by trashing a hand card", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["BT9-029"], hand: [{ card: "BT9-102", as: "option" }, "BT9-030"] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 2;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((c) => c.cardId === "BT9-102"));
    expect(s.state.players[0]!.trash.some((c) => c.cardId === "BT9-102")).toBe(true);
  });
});
