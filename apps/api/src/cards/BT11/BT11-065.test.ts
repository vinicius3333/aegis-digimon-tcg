import { describe, it, expect } from "vitest";
import { getCardDefinition, type PlayerState } from "@aegis/shared";
import "../index.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-065.js";

// A3 for BT11-065 (Snatchmon) — the inherited Vemmon-return clause.
//
// "[All Turns][Once Per Turn] When [Vemmon] is placed from this Digimon's digivolution cards at the
// bottom of its owner's deck, unsuspend this Digimon and it gains <Blocker> ..." (documented behavior, an
// INHERITED effect). The engine had no onDigivolutionCardReturnToDeckBottom event, so the clause was
// modeled as an UNCONDITIONAL AllTurns unsuspend (wrong — free every turn). Now `returnToDeck`-bottom
// fires the event (anchored to the host whose stack lost the card), gated to the host's own watcher
// and the returned card's name.
//
// FAILS-WHEN-REVERTED: drop the event fire and the suspended host stays suspended on a Vemmon return.

const SNATCH = "BT11-065"; // inherited under the host
const VEMMON = "BT11-061"; // a [Vemmon] Lv.3
const NON_VEMMON = "BT1-009"; // any non-Vemmon card
const TOP = "BT1-009"; // the host's top Digimon (any)

describe("BT11-065 inherited: Vemmon returned from this Digimon's stack to deck bottom unsuspends it", () => {
  it("maps catalog facts and both printed effects to IR", () => {
    expect(getCardDefinition("BT11-065")).toMatchObject({
      cardId: "BT11-065",
      colors: ["Black"],
      level: 4,
      playCost: 6,
      dp: 6000,
    });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "WhenDigivolving",
        actions: [{ kind: "PlaceUnder", position: "bottom" }, { kind: "Return", to: "hand" }],
      },
      { trigger: "AllTurns", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger" }] },
    ]);
    expect(compiled.effects[0]?.actions[1]).not.toHaveProperty("optional");
  });

  it("returning a [Vemmon] to the deck bottom unsuspends the host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: TOP,
              dp: 4000,
              as: "host",
              suspended: true,
              under: [{ card: SNATCH }, { card: VEMMON, as: "stackCard" }],
            },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    expect(s.perm("host").isSuspended).toBe(true);

    await advance(s.engine).verb.returnToDeck([s.inst("stackCard").instanceId]); // to bottom (default)
    await settle(() => s.perm("host").isSuspended === false);

    // The inherited clause fired: the host is unsuspended, and the Vemmon is in the deck.
    expect(s.perm("host").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
    const stackCardId = s.inst("stackCard").instanceId;
    expect((s.state.players[0] as PlayerState).deck.some((c) => c.instanceId === stackCardId)).toBe(true);
  });

  it("returning a NON-[Vemmon] stack card does NOT unsuspend (name gate)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: TOP,
              dp: 4000,
              as: "host",
              suspended: true,
              under: [{ card: SNATCH }, { card: NON_VEMMON, as: "stackCard" }],
            },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    const stackCardId = s.inst("stackCard").instanceId;

    await advance(s.engine).verb.returnToDeck([stackCardId]);
    await settle(() => (s.state.players[0] as PlayerState).deck.some((c) => c.instanceId === stackCardId));

    // The card moved, but the host stays suspended — the watcher gates on the [Vemmon] name.
    expect((s.state.players[0] as PlayerState).deck.some((c) => c.instanceId === stackCardId)).toBe(true);
    expect(s.perm("host").isSuspended).toBe(true);
  });

  it("uses the inherited trigger only once per turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: TOP,
            as: "host",
            suspended: true,
            under: [{ card: SNATCH }, { card: VEMMON, as: "first" }, { card: VEMMON, as: "second" }],
          },
        ],
      },
    });

    await advance(s.engine).verb.returnToDeck([s.inst("first").instanceId]);
    await settle(() => s.perm("host").isSuspended === false);
    s.perm("host").isSuspended = true;

    await advance(s.engine).verb.returnToDeck([s.inst("second").instanceId]);
    await settle();

    expect(s.perm("host").isSuspended).toBe(true);
  });
});

describe("BT11-065 when digivolving", () => {
  it("places up to 2 Vemmon under itself and recovers Fusionize after reaching 4", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: VEMMON, as: "base", under: [{ card: VEMMON, as: "preexisting" }] },
            { card: "BT1-010", as: "neighbor" },
          ],
          hand: [{ card: SNATCH, as: "snatch" }],
          trash: [
            { card: VEMMON, as: "trashVemmon1" },
            { card: VEMMON, as: "trashVemmon2" },
            { card: "BT11-105", as: "fusionize" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("snatch").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT11-105"));

    expect(s.perm("base").stack.filter(({ cardId }) => cardId === VEMMON)).toHaveLength(4);
    expect(s.perm("base").stack.at(-1)?.instanceId).toBe(s.inst("preexisting").instanceId);
    expect(s.perm("neighbor").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT11-105");
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });
});
