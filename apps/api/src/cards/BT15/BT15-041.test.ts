import { describe, it, expect, afterEach } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine as setup, settle } from "../../engine/testkit/harness.js";
import { whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard, unregisterCard } from "../../engine/effects/registry.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import "../index.js";

describe("BT15-041 Babamon [On Play] -6000 DP", () => {
  it("playing Babamon reduces 1 opp Digimon's DP by 6000", async () => {
    const s = setup(
      {
        0: { hand: [{ card: "BT15-041", as: "card" }] },
        1: { battleArea: [{ card: "BT1-009", dp: 8000, as: "oppDigi" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const card = s.inst("card");
    const oppDigi = s.perm("oppDigi");

    const res = s.engine.applyIntent(0, { type: "playCard", instanceId: card.instanceId });
    expect(res).toEqual({ ok: true });

    await settle(() => oppDigi.currentDP < 8000, 600);

    expect(oppDigi.currentDP).toBe(2000);
  });
});

const PLAYED_CARD = "BT1-082";

describe("BT15-041 [End of Opponent's Turn] delete self to play Rosemon/Jijimon, reactivate its [When Digivolving]", () => {
  let fired = 0;
  const stub: EffectModule = {
    cardId: PLAYED_CARD,
    effectsForTiming(timing, source) {
      if (timing !== EffectTiming.WhenDigivolving) return [];
      return [
        whenDigivolving({
          source,
          effectKey: `${PLAYED_CARD}/test-reactivate-target`,
          description: "test: [When Digivolving] gain 1 memory",
          resolve: async (ctx) => {
            fired += 1;
            ctx.fx.gainMemory(1);
          },
        }),
      ];
    },
  };
  let original: EffectModule | undefined;

  afterEach(() => {
    unregisterCard(PLAYED_CARD);
    if (original !== undefined) registerCard(original);
    fired = 0;
  });

  it("deletes itself, plays Rosemon free, and re-fires Rosemon's [When Digivolving] effect", async () => {
    original = unregisterCard(PLAYED_CARD);
    registerCard(stub);

    const s = setup(
      {
        0: {
          battleArea: [{ card: "BT15-041", dp: 8000, as: "babamon" }],
          hand: [{ card: PLAYED_CARD, as: "rosemon" }],
        },
        1: { deck: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 5;
    const babamonId = s.perm("babamon").permanentId;

    await advance(s.engine).runTurn(1);

    await settle(() => fired > 0, 400);

    expect(s.state.players[0]?.battleArea.some((p) => p.permanentId === babamonId)).toBe(false);
    expect(s.state.players[0]?.battleArea.some((p) => p.topCard?.cardId === PLAYED_CARD)).toBe(true);
    expect(fired).toBe(1);
    expect(s.state.memory).toBe(-4);
  });

  it("digivolves legally from a level-5 green Digimon and preserves the source stack", async () => {
    const s = setup(
      {
        0: {
          battleArea: [{ card: "BT1-078", as: "greenBase" }],
          hand: [{ card: "BT15-041", as: "babamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("greenBase").permanentId,
        instanceId: s.inst("babamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("greenBase").topCard?.cardId === "BT15-041");

    expect(s.perm("greenBase").topCard?.cardId).toBe("BT15-041");
    expect(s.perm("greenBase").stack.map((card) => card.cardId)).toEqual(["BT1-078"]);
  });
});
