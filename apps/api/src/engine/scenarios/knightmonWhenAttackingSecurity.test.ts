import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

const KNIGHTMON = "EX13-058";
const RIE_KISHIBE = "EX13-074";
const KOTEMON = "BT18-058";
const KNIGHTMON_TEXT_SPARE = "ST13-12";

async function attackAfterPlayingKotemon(withRie: boolean) {
  const s = setupEngine(
    {
      0: {
        battleArea: [...(withRie ? [{ card: RIE_KISHIBE, as: "rie" }] : []), { card: KNIGHTMON, as: "knightmon" }],
        hand: [
          { card: KOTEMON, as: "kotemon" },
          { card: KNIGHTMON_TEXT_SPARE, as: "spare" },
        ],
        deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
      },
      1: {
        security: ["BT1-014", "BT1-015", "BT1-016"],
        deck: ["BT1-017", "BT1-018"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
  );
  s.state.memory = 3;
  await s.ready();

  const turn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(0);
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("knightmon").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

  const kinds = s.events.map((event) => event.kind);
  const played = s.events.find((event) => event.kind === "cardPlayed" && event.cardId === KOTEMON);
  expect(played).toBeDefined();
  expect(kinds.indexOf("securityRevealed")).toBeGreaterThan(kinds.indexOf("attackDeclared"));
  expect(kinds.lastIndexOf("attackEnded")).toBeGreaterThan(kinds.indexOf("securityRevealed"));
  expect(s.state.players[1]!.security).toHaveLength(2);

  advance(s.engine).endMainPhaseIfOpen(0);
  await turn;
  return s;
}

describe("Knightmon's [When Attacking] play keeps the attack going", () => {
  it("checks security after playing a Knightmon-text Digimon", async () => {
    const s = await attackAfterPlayingKotemon(false);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toContain(KOTEMON);
  });

  it("Discord 1558177076874313760: checks security after Rie Kishibe reacts to the played Digimon", async () => {
    const s = await attackAfterPlayingKotemon(true);
    expect(s.perm("rie").stack).toHaveLength(1);
  });
});
