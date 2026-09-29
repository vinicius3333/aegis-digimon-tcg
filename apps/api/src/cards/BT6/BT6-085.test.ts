import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { validateCompetitiveDeck } from "../../tournaments/participants/deckLegality.js";
import "./BT6-085.js";
import "./BT6-110.js";
import "../ST1/ST1-12.js";

describe("BT6-085 Eosmon", () => {
  it("gives its host +1000 DP during its owner's turn as an inherited effect", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT6-086", under: ["BT6-085"], as: "host" }] } });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });

  it("plays a level 5 Eosmon from hand without cost when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT6-085", as: "attacker" }], hand: [{ card: "BT6-085", as: "played" }] },
        1: { security: ["BT1-101"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.memory).toBe(0);
  });
});

async function playCuttingEdgeIntoEosmon(options: { withTaiKamiya: boolean }) {
  const s = setupEngine(
    {
      0: {
        battleArea: options.withTaiKamiya ? ["BT6-082", "ST1-12"] : ["BT6-082"],
        hand: [
          { card: "BT6-110", as: "option" },
          { card: "BT6-085", as: "eosmon" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT6-044", as: "aboveBoostedDp", dp: 8000 },
          { card: "BT1-014", as: "atBoostedDp", dp: 7000 },
        ],
      },
    },
    { autoSelectCards: true, autoAcceptOptional: true },
  );
  s.state.memory = 10;
  await s.ready();
  const eosmonInstanceId = s.inst("eosmon").instanceId;

  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT6-110"));

  const eosmon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.instanceId === eosmonInstanceId);
  return {
    eosmonDp: eosmon?.currentDP,
    opponentCardIds: s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId),
  };
}

describe("BT6-085 Eosmon — KB Q&A rulings", () => {
  it("allows up to 50 copies of this card number in a deck as a deckbuilding rule (Q1471)", () => {
    const fiftyEosmon = validateCompetitiveDeck({ mainDeck: Array(50).fill("BT6-085"), eggDeck: [] });
    const fiftyOneEosmon = validateCompetitiveDeck({ mainDeck: Array(51).fill("BT6-085"), eggDeck: [] });
    const fiveTaiKamiya = validateCompetitiveDeck({
      mainDeck: [...Array(45).fill("BT6-085"), ...Array(5).fill("ST1-12")],
      eggDeck: [],
    });

    expect(fiftyEosmon.violations.filter((violation) => violation.kind === "over_copy_limit")).toHaveLength(0);
    expect(fiftyOneEosmon.violations).toContainEqual({
      kind: "over_copy_limit",
      cardId: "BT6-085",
      copies: 51,
      allowed: 50,
    });
    expect(fiveTaiKamiya.violations).toContainEqual({
      kind: "over_copy_limit",
      cardId: "ST1-12",
      copies: 5,
      allowed: 4,
    });
  });

  it("lets [Cutting Edge] delete a 7000 DP Digimon after [ST1-12 Tai Kamiya] boosts the played Eosmon to 7000 DP (Q1494)", async () => {
    const boosted = await playCuttingEdgeIntoEosmon({ withTaiKamiya: true });
    expect(boosted.eosmonDp).toBe(7000);
    expect(boosted.opponentCardIds).toEqual(["BT6-044"]);

    const unboosted = await playCuttingEdgeIntoEosmon({ withTaiKamiya: false });
    expect(unboosted.eosmonDp).toBe(6000);
    expect(unboosted.opponentCardIds).toEqual(["BT6-044", "BT1-014"]);
  });
});
