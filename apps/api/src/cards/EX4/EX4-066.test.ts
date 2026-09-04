import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-066.js";

describe("EX4-066 Adze Beast Blade and Shining Dragon Bullet", () => {
  it("offers the BlitzGreymon/CresGarurumon modal digivolutions", () => {
    const modal = compiled.effects?.find((entry) => entry.trigger === "Main")?.actions?.[0] as {
      kind?: string;
      options?: unknown[][];
    };
    expect(modal.kind).toBe("Modal");
    expect(modal.options).toMatchObject([
      [{ kind: "Digivolve", into: { nameOrTrait: [{ match: "nameExact", tokens: ["BlitzGreymon"] }] } }],
      [{ kind: "Digivolve", into: { nameOrTrait: [{ match: "nameExact", tokens: ["CresGarurumon"] }] } }],
    ]);
  });

  it("keeps every bracket-only name reference exact", () => {
    const matches: string[] = [];
    const visit = (value: unknown): void => {
      if (Array.isArray(value)) {
        value.forEach(visit);
        return;
      }
      if (value === null || typeof value !== "object") return;
      for (const [key, child] of Object.entries(value)) {
        if (key === "nameOrTrait" && Array.isArray(child)) {
          for (const entry of child) {
            if (entry && typeof entry === "object" && "match" in entry) matches.push(String(entry.match));
          }
        }
        visit(child);
      }
    };
    visit(compiled.effects);
    expect(matches).toHaveLength(7);
    expect(matches).toEqual(Array(7).fill("nameExact"));
  });
  it("has Security activation", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
    });
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-066");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });

  it("does not play Agumon Expert for the exact Security name reference", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "EX4-066", as: "security" }],
        hand: [{ card: "BT1-011", as: "expert" }],
      },
    });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));
    await settle();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-011")).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("expert").instanceId)).toBe(true);
  });

  ex4CardBehaviorTests("EX4-066");
});
