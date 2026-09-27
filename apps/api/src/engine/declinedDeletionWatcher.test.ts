import { Phase } from "@aegis/shared";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { expect, it } from "vitest";
import { setupEngine, settle } from "./testkit/harness.js";
import "../cards/index.js";

function setupDeletionChain(shadow: boolean, accept: boolean) {
  const preferred: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: shadow ? "EX4-050" : "BT2-070", as: "sacrifice" },
          { card: "EX8-062", as: "pied" },
        ],
        hand: [{ card: "BT2-109", as: "heat" }],
        trash: ["EX8-057", "EX8-057"],
        security: Array(4).fill("BT1-009"),
        deck: ["BT1-009", "BT1-009"],
      },
      1: {
        battleArea: [
          { card: shadow ? "BT1-080" : "BT2-070", as: "victim" },
          { card: "BT2-070", as: "tapir" },
        ],
        deck: ["BT1-009", "BT1-009", "BT1-009"],
        security: ["BT1-009"],
      },
    },
    {
      autoAcceptOptional: true,
      autoSelectCards: true,
      declinePrompts: accept ? [] : ["Play"],
      preferInstanceIds: preferred,
      preferTriggerKeys: ["EX8-062"],
    },
  );
  preferred.push(s.perm("sacrifice").permanentId, s.perm("tapir").permanentId, s.perm("victim").permanentId);
  s.state.memory = 20;
  return s;
}

it.each([
  {
    shadow: true,
    accept: false,
    offers: 2,
    name: "reoffers a declined OPT for ShadowSeraphimon's later rule deletion",
  },
  {
    shadow: false,
    accept: false,
    offers: 1,
    name: "offers a declined OPT only once for Heat Viper's three simultaneous deletions",
  },
  {
    shadow: true,
    accept: true,
    offers: 1,
    name: "keeps an accepted OPT spent for ShadowSeraphimon's later rule deletion",
  },
])("$name", async ({ shadow, accept, offers }) => {
  const s = setupDeletionChain(shadow, accept);
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("heat").instanceId })).toEqual({ ok: true });
  await settle();
  expect(s.state.players[1]!.battleArea).toHaveLength(0);
  expect(s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "EX8-062")).toHaveLength(
    offers,
  );
  expect(s.state.players[0]!.battleArea.filter((p) => p.topCard.cardId === "EX8-057")).toHaveLength(accept ? 1 : 0);
});

it("allows accepting Piedmon's second occurrence in the playable arena scenario", async () => {
  const preferred: string[] = [];
  const s = setupEngine(
    { 0: {}, 1: {} },
    {
      autoSelectCards: true,
      preferInstanceIds: preferred,
      preferTriggerKeys: ["EX8-062"],
    },
  );
  s.engine.stagedDecks[0] = BLUE_DECK;
  s.engine.stagedDecks[1] = RED_DECK;
  s.engine.startDevScenario("arena-piedmon-declined-opt");
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const human = s.state.players[0]!;
    preferred.push(human.battleArea.find((p) => p.topCard.cardId === "EX4-050")!.permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: human.hand.find((c) => c.cardId === "BT2-109")!.instanceId,
      }),
    ).toEqual({ ok: true });
    for (const accept of [false, true]) {
      await settle(() => s.state.pendingDecision?.kind === "optional");
      const decision = s.state.pendingDecision!;
      expect(s.decisions.find(({ req }) => req.decisionId === decision.decisionId)?.req.sourceCardId).toBe("EX8-062");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: decision.decisionId,
          response: { kind: "optional", accept },
        }),
      ).toEqual({ ok: true });
      await settle();
    }
    expect(s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "EX8-062")).toHaveLength(2);
    expect(human.battleArea.some((p) => p.topCard.cardId === "EX8-057")).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
  }
});
