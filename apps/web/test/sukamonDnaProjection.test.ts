import { expect, it } from "vitest";
import { setupEngine, settle, assertNoLoudGap } from "@aegis-api/engine/testkit/harness.js";
import { advance } from "@aegis-api/engine/testkit/advance.js";
import { observe } from "@aegis-api/engine/testkit/observe.js";
import "@aegis-api/cards/BT11/BT11-043.js";
import "@aegis-api/cards/EX13/EX13-021.js";
import "@aegis-api/cards/EX13/EX13-044.js";
import "@aegis-api/cards/EX13/EX13-045.js";
import "@aegis-api/cards/EX3/EX3-020.js";
import "@aegis-api/cards/EX3/EX3-041.js";
import "@aegis-api/cards/BT8/BT8-084.js";
import "@aegis-api/cards/ST10/ST10-06.js";
import { handCardEvolutionRoute } from "../src/game/digivolveModel";
import { handEntriesOf } from "../src/game/screen/model/handEntries";
import { dnaFieldChoice } from "../src/game/screen/model/dnaMaterialSelection";

async function rewrite(s: ReturnType<typeof setupEngine>) {
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("king").instanceId })).toEqual({ ok: true });
  await settle(() => observe(s.engine).effectiveColors(s.perm("host")).includes("White") && !s.state.pendingDecision);
}
function assertRetainedWingdramonInformation(s: ReturnType<typeof setupEngine>) {
  expect(observe(s.engine).effectiveNames(s.perm("host"))).toEqual(expect.arrayContaining(["sukamon", "slayerdramon"]));
  expect(observe(s.engine).effectiveNames(s.perm("host"))).not.toContain("wingdramon");
  expect(observe(s.engine).hasEffectiveTrait(s.perm("host"), "Sky Dragon")).toBe(true);
  expect(observe(s.engine).effectiveColors(s.perm("host"))).toEqual(["White"]);
}

it.each([
  {
    name: "rewritten Wingdramon retains Slayerdramon and traits but loses blue",
    host: "EX13-021",
    partner: "EX13-044",
    into: "EX13-045",
    under: [],
    rewrite: true,
    dna: false,
    normal: true,
  },
  {
    name: "healthy EX3 Lv.5 pair uses contextual DNA Lv.6 without ordinary evolution",
    host: "EX3-020",
    partner: "EX3-041",
    into: "EX13-045",
    under: [],
    rewrite: false,
    dna: true,
    normal: false,
  },
  {
    name: "white Kimeramon retains gained yellow for colored Mastemon recipe",
    host: "BT8-084",
    partner: "BT2-075",
    into: "ST10-06",
    under: ["BT1-045"],
    rewrite: true,
    dna: true,
    normal: true,
  },
  {
    name: "white Lv.4 is admitted by color-free Kimeramon recipe",
    host: "BT1-037",
    partner: "BT1-072",
    into: "BT8-084",
    under: [],
    rewrite: true,
    dna: true,
    normal: true,
  },
])(
  "Discord 1557631388650315826 projection: $name",
  async ({ host, partner, into, under, rewrite: shouldRewrite, dna, normal }) => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT11-043", as: "king" }],
          trash: ["BT11-040", "BT11-040", "BT11-040"],
          deck: ["BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: host, as: "host", under },
            { card: partner, as: "partner" },
          ],
          hand: [{ card: into, as: "result" }],
          deck: ["BT1-010", "BT1-010"],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    await s.ready();
    if (shouldRewrite) {
      preferred.push(s.perm("host").permanentId);
      await rewrite(s);
    }
    s.state.turnSeat = 1;
    const turn = s.engine.runOneTurn();
    try {
      await advance(s.engine).waitForMainPhase(1);
      const hand = s.inst("result");
      const board = [...s.state.players[1]!.battleArea];
      const { handEntries } = handEntriesOf({
        viewer: s.state.players[1]!,
        shownHand: undefined,
        handHeld: false,
        optimisticPlayedInstanceId: undefined,
      });
      const routes = handEntries.find((entry) => entry.instanceId === hand.instanceId)!.dnaDigivolveRoutes!;
      expect(routes).toHaveLength(dna ? 1 : 0);
      const normalPartner = hand.digivolveTargetPermanentIds.includes(s.perm("partner").permanentId);
      expect(normalPartner).toBe(normal);
      expect(handCardEvolutionRoute(into, board, normalPartner, routes, s.perm("partner").permanentId)?.kind).toBe(
        dna ? (normal ? "both" : "dna") : "normal",
      );
      const choice = dnaFieldChoice(routes, board, [s.perm("host").permanentId, s.perm("partner").permanentId]);
      expect(choice.available).toBe(dna);
      expect(choice.selected !== undefined).toBe(dna);
      expect(choice.orderedPicks).toEqual(
        dna ? routes[0]!.materialPermanentIds : [s.perm("host").permanentId, s.perm("partner").permanentId],
      );
      if (host === "EX13-021") assertRetainedWingdramonInformation(s);
    } finally {
      expect(s.engine.applyIntent(s.state.turnSeat, { type: "surrender" })).toEqual({ ok: true });
      await turn;
      assertNoLoudGap(s);
    }
  },
);
