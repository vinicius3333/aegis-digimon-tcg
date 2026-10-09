import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

// Discord 1558210190376050858 sweep: "[Security] At the end of the battle, play this card without
// paying the cost." The checked card battles first and is played only after that battle ends.
const END_OF_BATTLE_PLAY_CARDS = [
  { cardId: "LM-007", dp: 5000 },
  { cardId: "BT18-035", dp: 4000 },
  { cardId: "RB1-028", dp: 4000 },
  { cardId: "ST21-03", dp: 4000 },
  { cardId: "P-165", dp: 4000 },
  { cardId: "BT22-050", dp: 4000 },
  { cardId: "ST20-05", dp: 4000 },
  { cardId: "EX10-024", dp: 1000 },
];

async function checkSecurity(cardId: string, attackerCardId: string) {
  const s = setupEngine(
    {
      0: { battleArea: [{ card: attackerCardId, as: "attacker" }] },
      1: { security: [cardId, "BT1-009"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => !observe(s.engine).isAttacking() && !s.state.pendingDecision, 3000);
  const kinds = s.events.map((event) => event.kind);
  expect(kinds.indexOf("securityChecked")).toBeLessThan(kinds.indexOf("cardPlayed"));
  expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toContain(cardId);
  expect(s.state.players[1]!.trash.map((card) => card.cardId)).not.toContain(cardId);
  return s;
}

describe("[Security] end-of-battle self play", () => {
  it.each(END_OF_BATTLE_PLAY_CARDS)(
    "$cardId battles BT1-010 Agumon (2000 DP) before it is played",
    async ({ cardId, dp }) => {
      const s = await checkSecurity(cardId, "BT1-010");
      expect(s.state.players[0]!.battleArea).toHaveLength(dp > 2000 ? 0 : 1);
    },
  );

  it.each(END_OF_BATTLE_PLAY_CARDS)("$cardId is still played after losing to BT1-080 Titamon", async ({ cardId }) => {
    const s = await checkSecurity(cardId, "BT1-080");
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });
});
