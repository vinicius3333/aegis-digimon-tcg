import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST20-11.js";

describe("ST20-11 WarGreymon", () => {
  it("plays, protects one Digimon per two Tamer colors, and deletes the lowest DP target when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST20-07", as: "protected" }, "ST20-12", "BT21-102"],
          hand: [{ card: "ST20-11", as: "wargreymon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low", dp: 4000 },
            { card: "BT1-010", as: "high", dp: 5000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wargreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "ST20-11"));
    await s.engine.recomputeContinuousEffects();

    const warGreymon = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "ST20-11")!;
    await advance(s.engine).fire(EffectTiming.OnPlay, warGreymon);
    await s.engine.recomputeContinuousEffects();
    const engine = s.engine as unknown as {
      buildEffectContext: (
        source: unknown,
        trigger: unknown,
      ) => { fx: { isBeAffectedBySourceKind?: (id: string, kind: string) => boolean } };
      cardSourceOf: (card: unknown) => unknown;
    };
    const context = engine.buildEffectContext(engine.cardSourceOf(warGreymon.topCard), {});
    expect(
      [s.perm("protected").permanentId, warGreymon.permanentId].some((id) =>
        context.fx.isBeAffectedBySourceKind?.(id, "Digimon"),
      ),
    ).toBe(true);

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, warGreymon);
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT1-009"));
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT1-010")).toBe(true);
  });
});
