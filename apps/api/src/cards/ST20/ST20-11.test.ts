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
    const digimonIds = s.state.players[0]!.battleArea.filter(
      (perm) => perm.topCard.cardId === "ST20-07" || perm.topCard.cardId === "ST20-11",
    ).map((perm) => perm.permanentId);
    expect(digimonIds.filter((id) => !context.fx.isBeAffectedBySourceKind?.(id, "Digimon"))).toHaveLength(1);

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, warGreymon);
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT1-009"));
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT1-010")).toBe(true);
  });

  it("Blast Digivolves from hand at Counter Timing without memory cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }] },
        1: {
          battleArea: [{ card: "ST20-04", as: "base" }],
          hand: [{ card: "ST20-11", as: "wargreymon" }],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    s.state.turnSeat = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("wargreymon").instanceId);
    expect(eligible).toBeDefined();
    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "ST20-11");

    expect(s.perm("base").topCard.cardId).toBe("ST20-11");
    expect(s.state.memory).toBe(0);
  });
});
