import { CardColor, EffectDuration, type Permanent } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "./BT8-040.js";

function effectiveColors(s: EngineSetup, permanent: Permanent): string[] {
  return (
    s.engine as unknown as { effectiveColorsOf(target: Permanent): string[] }
  ).effectiveColorsOf(permanent);
}

describe("BT8-040 Betsumon", () => {
  it("trashes one chosen card, gains all of its colors, and draws 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-036", as: "base" }],
        hand: [
          { card: "BT8-040", as: "evolving" },
          { card: "BT8-012", as: "colorCost" },
        ],
        deck: [
          { card: "BT1-009", as: "evolutionDraw" },
          { card: "BT1-010", as: "effectDrawOne" },
          { card: "BT1-011", as: "effectDrawTwo" },
        ],
      },
    }, { autoSelectCards: true });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("evolving").instanceId,
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("colorCost").instanceId) &&
      s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("effectDrawTwo").instanceId)
    );

    expect(effectiveColors(s, s.perm("base"))).toEqual(
      expect.arrayContaining(["Yellow", "Red", "Blue"]),
    );
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.decisions.filter(({ req }) => req.kind === "selectCards")).toHaveLength(1);
  });

  it("allows declining the trash and does not draw even when the Digimon was already multicolor", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-037", as: "base" }],
        hand: [
          { card: "BT8-040", as: "evolving" },
          { card: "BT8-012", as: "declinedCost" },
        ],
        deck: [
          { card: "BT1-009", as: "evolutionDraw" },
          { card: "BT1-010", as: "notDrawn" },
        ],
      },
    });
    s.state.memory = 3;
    advance(s.engine).ledgers.continuous.addColorGrant(
      s.perm("base").permanentId,
      CardColor.Red,
      EffectDuration.UntilEachTurnEnd,
    );

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("evolving").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "selectCards"));

    const decision = s.decisions.find(({ req }) => req.kind === "selectCards")!.req;
    expect(decision.options?.min).toBe(0);
    expect(decision.options?.candidateInstanceIds).toEqual(expect.arrayContaining([
      s.inst("declinedCost").instanceId,
      s.inst("evolutionDraw").instanceId,
    ]));
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: decision.decisionId,
      response: { kind: "selectCards", instanceIds: [] },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("declinedCost").instanceId));

    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("notDrawn").instanceId);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(effectiveColors(s, s.perm("base"))).toEqual(expect.arrayContaining(["Yellow", "Red"]));
  });
});
