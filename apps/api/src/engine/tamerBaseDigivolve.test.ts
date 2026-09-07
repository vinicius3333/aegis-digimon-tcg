import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { setupEngine, settle } from "./testkit/harness.js";

/**
 * KB Q6708 / Q6709 (BT23-101 Hudiemon, "digivolve from a Tamer"): the Tamer base digivolves as a
 * Tamer, so no Digimon digivolved and a "when a Digimon digivolves" watcher must not fire. Every
 * other consequence of the digivolution is unchanged — the entering card's own [When Digivolving]
 * timing runs, and the digivolution bonus draw is still performed (Q6709).
 *
 * The watcher under test is BT23-082 Makiko Date, whose [All Turns] "when one of your Digimon
 * digivolves into a [CS] Digimon" clause returns her to the hand as its cost. Her presence in the
 * hand afterwards is therefore the observable "the watcher fired".
 */
describe("Tamer-base digivolution and Digimon-digivolve watchers (Q6708)", () => {
  const board = (baseCardId: string) =>
    setupEngine(
      {
        0: {
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          battleArea: [
            { card: baseCardId, as: "base" },
            // Erika Mishima satisfies Hudiemon's alternate Tamer requirement even when the base
            // being digivolved onto is the Digimon, so both boards pay the same cost.
            { card: "BT23-084", as: "erika2" },
            { card: "BT23-084", as: "erika3" },
            { card: "BT23-084", as: "erika4" },
            { card: "BT23-082", as: "makiko" },
          ],
          hand: [
            { card: "BT23-101", as: "hudiemon" },
            { card: "BT23-017", as: "watcherPlay" },
            { card: "BT23-017", as: "watcherPlay2" },
          ],
        },
        1: { deck: ["BT1-009", "BT1-010"], battleArea: [{ card: "BT10-055", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

  const makikoInHand = (s: ReturnType<typeof board>): boolean =>
    s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("makiko").instanceId);

  it("does not fire the watcher when the base is a Tamer, and still draws the bonus card", async () => {
    const s = board("BT23-084");
    await s.ready();
    s.state.memory = 3;
    const deckBefore = s.state.players[0]!.deck.length;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("hudiemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("hudiemon").instanceId);
    await settle(() => s.state.pendingDecision === undefined);

    expect(makikoInHand(s)).toBe(false);
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("makiko").instanceId),
    ).toBe(true);
    // Q6709: the bonus draw is performed for any kind of digivolution.
    expect(s.state.players[0]!.deck.length).toBe(deckBefore - 1);
    // The subject's own [When Digivolving] timing is untouched: it plays one level-3 Hudie for
    // free and then reduces the opponent's 13000 body by 3000 per battle-area Hudie Digimon.
    expect(s.perm("target").currentDP).toBe(7000);
  });

  it("fires the same watcher when the base is a Digimon", async () => {
    const s = board("BT23-017");
    await s.ready();
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("hudiemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => makikoInHand(s) && s.state.pendingDecision === undefined);

    expect(makikoInHand(s)).toBe(true);
  });
});
