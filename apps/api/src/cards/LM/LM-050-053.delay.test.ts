import { EffectTiming, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-050.js";
import "./LM-051.js";
import "./LM-052.js";
import "./LM-053.js";

const cases = [
  ["LM-050", "BT11-075", "BT2-067"],
  ["LM-051", "BT1-009", "BT1-013"],
  ["LM-052", "BT1-027", "BT1-028"],
  ["LM-053", "BT2-052", "BT3-059"],
] as const;

describe("LM-050 through LM-053 Delay integration", () => {
  it.each(cases)("%s trashes itself as Delay cost and gains exactly 2 memory", async (cardId, source, hit) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: source, as: "source" }],
          hand: [{ card: cardId, as: "option" }],
          deck: [hit, "BT1-013", "BT2-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0 as Seat, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === cardId), 2000);

    const option = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === cardId)!;
    s.state.turnCount += 1;
    expect(
      s.engine.applyIntent(0 as Seat, {
        type: "activateEffect",
        sourceInstanceId: option.topCard!.instanceId,
        effectKey: `${cardId}/ir-${EffectTiming.OnDeclaration}-0`,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === cardId), 2000);

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === cardId)).toBe(false);
  });
});
