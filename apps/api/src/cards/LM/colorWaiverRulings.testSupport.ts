import { describe, expect, it } from "vitest";
import { setupEngine, type SeatSpec } from "../../engine/testkit/harness.js";

export interface ColorWaiverRulingSpec {
  cardId: string;
  name: string;
  qno: string;
  waivedDigimon: string;
  waivedTamer: string;
  unrelatedDigimon: string;
  unrelatedTamer: string;
}

const OPTION_COST = 3;
const STARTING_MEMORY = 5;

async function useOption(cardId: string, battleArea: SeatSpec["battleArea"]) {
  const s = setupEngine(
    { 0: { battleArea, hand: [{ card: cardId, as: "option" }], deck: ["BT1-028", "BT10-017"] } },
    { autoDeclineOptional: true, autoSelectCards: true },
  );
  s.state.memory = STARTING_MEMORY;
  await s.ready();
  const result = s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId });
  return { s, result };
}

export function describeColorWaiverRuling(spec: ColorWaiverRulingSpec): void {
  describe(`${spec.cardId} ${spec.name} — KB Q&A rulings`, () => {
    it(`meets its color requirement with a Digimon or a Tamer of the extra color alone (${spec.qno})`, async () => {
      for (const source of [spec.waivedDigimon, spec.waivedTamer]) {
        const { s, result } = await useOption(spec.cardId, [source]);
        expect(result, source).toEqual({ ok: true });
        expect(s.state.memory).toBe(STARTING_MEMORY - OPTION_COST);
      }

      for (const source of [spec.unrelatedDigimon, spec.unrelatedTamer]) {
        const { s, result } = await useOption(spec.cardId, [source]);
        expect(result, source).not.toEqual({ ok: true });
        expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual([spec.cardId]);
      }
    });
  });
}
