import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AccountStore } from "#api/accounts/AccountStore";
import { createMemoryPool } from "#api/db/memoryPool.fixture";
import { getRankedMetaCounters } from "#api/ranked/getRankedMetaCounters";

type GamesParams = {
  archetype: string;
  opponentArchetype: string;
  games: number;
  wins: number;
  pilots: number;
  finishedAt?: number;
};

const PLAYER_COUNT = 12;

let accounts: AccountStore;
let players: string[];

beforeEach(async () => {
  accounts = new AccountStore(createMemoryPool());
  players = [];
  for (let index = 0; index < PLAYER_COUNT; index++) {
    players.push((await accounts.accountForIdentity("discord", `counter-${index}`, `Player ${index}`)).id);
  }
  await accounts.pool.query(
    "INSERT INTO competitive_archetypes (archetype,cover_card_id,primary_color,secondary_color) VALUES ('Examon','BT18-074','Red','Purple')",
  );
});

afterEach(async () => {
  await accounts.close();
});

async function insertGames({ archetype, opponentArchetype, games, wins, pilots, finishedAt = 500 }: GamesParams) {
  const opponent = players[PLAYER_COUNT - 1]!;
  for (let index = 0; index < games; index++) {
    const matchId = randomUUID();
    const pilot = players[index % pilots]!;
    const won = index < wins;
    for (const [accountId, opponentAccountId, deck, opposingDeck, result] of [
      [pilot, opponent, archetype, opponentArchetype, won ? "win" : "loss"],
      [opponent, pilot, opponentArchetype, archetype, won ? "loss" : "win"],
    ]) {
      await accounts.pool.query(
        "INSERT INTO competitive_match_facts (match_id,account_id,opponent_account_id,origin,format,region,archetype,opponent_archetype,classifier_version,result,finished_at) VALUES ($1,$2,$3,'ranked','standard','europe',$4,$5,1,$6,$7)",
        [matchId, accountId, opponentAccountId, deck, opposingDeck, result, finishedAt],
      );
    }
  }
}

describe("ranked meta counters", () => {
  it("ranks counters by the lower bound of their win rate and hides thin or losing samples", async () => {
    await insertGames({ archetype: "Jupitermon", opponentArchetype: "Examon", games: 30, wins: 20, pilots: 10 });
    await insertGames({ archetype: "Puppets", opponentArchetype: "Examon", games: 40, wins: 22, pilots: 10 });
    await insertGames({ archetype: "Few pilots", opponentArchetype: "Examon", games: 30, wins: 25, pilots: 9 });
    await insertGames({ archetype: "Losing", opponentArchetype: "Examon", games: 30, wins: 15, pilots: 10 });
    await insertGames({ archetype: "unknown", opponentArchetype: "Examon", games: 30, wins: 25, pilots: 10 });
    await insertGames({ archetype: "Examon", opponentArchetype: "Examon", games: 5, wins: 5, pilots: 10 });
    await insertGames({
      archetype: "Outside window",
      opponentArchetype: "Examon",
      games: 30,
      wins: 30,
      pilots: 10,
      finishedAt: 5000,
    });

    const decks = await getRankedMetaCounters({
      db: accounts.pool,
      origin: "ranked",
      format: "standard",
      from: 0,
      until: 1000,
    });

    expect(decks.map((deck) => deck.archetype)).toEqual(["Examon", "Puppets", "Few pilots", "Jupitermon", "Losing"]);
    const [examon] = decks;
    expect(examon).toMatchObject({
      archetype: "Examon",
      coverCardId: "BT18-074",
      colors: ["Red", "Purple"],
      games: 170,
      share: 170 / 330,
    });
    expect(examon!.counters.map(({ interval: _interval, ...counter }) => counter)).toEqual([
      {
        archetype: "Jupitermon",
        coverCardId: null,
        colors: [],
        games: 30,
        pilots: 10,
        wins: 20,
        losses: 10,
        draws: 0,
        winrate: 20 / 30,
      },
      {
        archetype: "Puppets",
        coverCardId: null,
        colors: [],
        games: 40,
        pilots: 10,
        wins: 22,
        losses: 18,
        draws: 0,
        winrate: 22 / 40,
      },
    ]);
    const [low, high] = examon!.counters[0]!.interval;
    expect(low).toBeCloseTo(0.488, 3);
    expect(high).toBeCloseTo(0.808, 3);
    expect(decks.slice(1).every((deck) => deck.counters.length === 0)).toBe(true);
  });

  it("returns no meta decks when the period has no games", async () => {
    expect(
      await getRankedMetaCounters({
        db: accounts.pool,
        origin: "ranked",
        format: "standard",
        region: "asia",
        from: 0,
        until: 1000,
      }),
    ).toEqual([]);
  });
});
