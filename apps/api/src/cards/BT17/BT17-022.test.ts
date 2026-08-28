import { describe, expect, it } from "vitest";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-022.js";
import "./index.js";

describe("BT17-022", () => {
  it("can digivolve onto a yellow Tamer as level 3", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      actions: [{ kind: "Digivolve", asLevel: 3, onto: { filter: { kind: ["Tamer"], colors: ["Yellow"] } } }],
    });
  });

  it("digivolves into AncientGarurumon for 3 and deletes itself if successful", () => {
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "Digivolve",
      from: ["hand"],
      costOverride: 3,
      ignoreRequirements: true,
      optional: true,
      condition: { kind: "anyOf" },
    });
    expect(compiled.effects?.[1]?.actions?.[1]).toMatchObject({
      kind: "DelayedDelete",
      condition: { kind: "ifThisEffectDigivolved" },
    });
  });

  it("draws while attacking with 7 or fewer cards in hand as inherited", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      actions: [{ kind: "Draw", amount: 1, condition: { kind: "zoneCount", value: 7 } }],
    });
  });

  it("matches only the printed yellow Tamer path and preserves the named alternates", () => {
    expect(matchingAlternateDigivolutionRequirement("BT17-022", "BT1-087")).toMatchObject({
      cost: 3,
      baseIsTamer: true,
    });
    expect(matchingAlternateDigivolutionRequirement("BT17-022", "BT1-086")).toBeUndefined();
    expect(matchingAlternateDigivolutionRequirement("BT17-022", "BT17-023")).toMatchObject({ cost: 1 });
  });

  it("digivolves from a yellow Tamer and can slide-evolve into AncientGarurumon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-087", as: "tamer" },
            { card: "BT10-093", as: "purpleTamer" },
          ],
          hand: [
            { card: "BT17-022", as: "lobomon" },
            { card: "BT17-028", as: "ancient" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tamer").permanentId,
        instanceId: s.inst("lobomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT17-028");

    expect(s.perm("tamer").topCard?.cardId).toBe("BT17-028");
    expect(s.state.memory).toBe(0);
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("tamer"));
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-028"));
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT17-028")).toBe(true);
  });
});
