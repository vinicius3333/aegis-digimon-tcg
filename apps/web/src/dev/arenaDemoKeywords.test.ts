import { CardInstance, GameState, Permanent, PlayerState } from "@aegis/shared";
import { expect, it } from "vitest";
import {
  DEMO_KEYWORDS,
  applyDemoKeywordGrants,
  demoDigimon,
  demoKeywordLabel,
  demoKeywordLabels,
  removeDemoKeywordGrant,
  upsertDemoKeywordGrant,
} from "./arenaDemoKeywords";

function fixture() {
  const state = new GameState();
  for (const seat of [0, 1] as const) {
    const player = new PlayerState();
    player.seat = seat;
    const digimon = new Permanent();
    digimon.permanentId = `digimon-${seat}`;
    digimon.topCard = new CardInstance();
    digimon.topCard.cardId = "ST1-03";
    digimon.keywords.push("Piercing", "Jamming");
    digimon.grantedKeywords.push("Jamming");
    digimon.securityAttack = 3;
    player.battleArea.push(digimon);
    state.players.push(player);
  }
  const tamer = new Permanent();
  tamer.permanentId = "tamer";
  tamer.topCard = new CardInstance();
  tamer.topCard.cardId = "BT26-092";
  state.players[0]!.battleArea.push(tamer);
  return state;
}

it("offers the authoritative keyword names including the latest families without internal aliases", () => {
  expect(DEMO_KEYWORDS).toHaveLength(44);
  expect(new Set(DEMO_KEYWORDS).size).toBe(DEMO_KEYWORDS.length);
  expect(DEMO_KEYWORDS).toContain("Guard");
  expect(DEMO_KEYWORDS).toContain("Detach");
  expect(DEMO_KEYWORDS).toContain("Succession");
  expect(DEMO_KEYWORDS).not.toContain("LinkMax");
  expect(DEMO_KEYWORDS).not.toContain("DigiXrosSubstitute");
});

it("composes own Digimon grants without modifying printed abilities, Tamers, or the opponent", () => {
  const state = fixture();
  applyDemoKeywordGrants(state, {
    "digimon-0": [{ keyword: "Blocker" }, { keyword: "SecurityAttack", amount: 2 }],
    "digimon-1": [{ keyword: "Rush" }],
    tamer: [{ keyword: "Barrier" }],
  });
  expect(demoDigimon(state).map((digimon) => digimon.permanentId)).toEqual(["digimon-0"]);
  expect([...state.players[0]!.battleArea[0]!.keywords]).toEqual(["Piercing", "Jamming", "Blocker", "SecurityAttack"]);
  expect([...state.players[0]!.battleArea[0]!.grantedKeywords]).toEqual(["Jamming", "Blocker", "SecurityAttack"]);
  expect(state.players[0]!.battleArea[0]!.securityAttack).toBe(5);
  expect([...state.players[1]!.battleArea[0]!.keywords]).toEqual(["Piercing", "Jamming"]);
  expect([...state.players[0]!.battleArea[1]!.keywords]).toEqual([]);
});

it("replaces a numeric grant and rebuilds phases/reset from the original security-check total", () => {
  const initial = upsertDemoKeywordGrant({}, "digimon-0", { keyword: "SecurityAttack", amount: 2 });
  const replaced = upsertDemoKeywordGrant(initial, "digimon-0", { keyword: "SecurityAttack", amount: -2 });
  expect(replaced["digimon-0"]).toHaveLength(1);
  expect(initial["digimon-0"]![0]!.amount).toBe(2);
  for (let phase = 0; phase < 3; phase++) {
    const state = fixture();
    applyDemoKeywordGrants(state, replaced);
    expect(state.players[0]!.battleArea[0]!.securityAttack).toBe(1);
  }
  const reset = fixture();
  applyDemoKeywordGrants(reset, removeDemoKeywordGrant(replaced, "digimon-0", "SecurityAttack"));
  expect(reset.players[0]!.battleArea[0]!.securityAttack).toBe(3);
  expect([...reset.players[0]!.battleArea[0]!.keywords]).toEqual(["Piercing", "Jamming"]);
  const floored = fixture();
  applyDemoKeywordGrants(floored, { "digimon-0": [{ keyword: "SecurityAttack", amount: -9 }] });
  expect(floored.players[0]!.battleArea[0]!.securityAttack).toBe(0);
});

it("keeps printed numeric and textual parameters separate from canonical keyword names", () => {
  expect(demoKeywordLabel({ keyword: "Draw", amount: 2 })).toBe("Draw 2");
  expect(demoKeywordLabel({ keyword: "Recovery", amount: 2 })).toBe("Recovery +2 (Deck)");
  expect(demoKeywordLabel({ keyword: "Digisorption", amount: -2 })).toBe("Digisorption -2");
  expect(demoKeywordLabel({ keyword: "Link", amount: 2 })).toBe("Link +2");
  expect(demoKeywordLabel({ keyword: "Fragment", amount: 2 })).toBe("Fragment (2)");
  expect(demoKeywordLabels({ own: [{ keyword: "Succession", parameter: " [Ceresmon] " }] })).toEqual({
    own: { Succession: "Succession ([Ceresmon])" },
  });
});
