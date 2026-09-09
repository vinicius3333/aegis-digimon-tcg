import { Phase, type PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// BT19-006 Pagumon — Purple Digi-Egg, Lv.2 In-Training, Lesser.
// Inherited: "[On Deletion] If deleted other than by battle, return 1 level 3 purple Digimon
// card from your trash to the hand."
//
// Trash fixtures pair the one legal candidate against a near-miss on each filter axis:
//   BT10-071 Gazimon    — Purple, Lv3, Digimon  -> matches
//   ST6-07   Youkomon   — Purple, Lv4, Digimon  -> wrong level
//   BT1-028  Elecmon    — Blue,   Lv3, Digimon  -> wrong colour
//   BT19-006 Pagumon    — Purple, Lv2, Digi-Egg -> wrong level and kind
//   seat 1's BT2-067    — Purple, Lv3, Digimon  -> not YOUR trash
// The host in the isolating tests is BT3-083 Meramon (Purple Lv4), which is NOT itself a candidate;
// the lifecycle test uses the real route host BT2-067 DemiDevimon (Purple Lv3, digivolves from a
// Purple Lv2 at cost 0), which IS a candidate once trashed — see the dedicated test for that.
const hand = (s: { state: { players: PlayerState[] } }) => s.state.players[0]!.hand.map(({ cardId }) => cardId);
const trash = (s: { state: { players: PlayerState[] } }, seat: 0 | 1) =>
  s.state.players[seat]!.trash.map(({ cardId }) => cardId);

describe("BT19-006 Pagumon", () => {
  it("returns exactly one level 3 purple Digimon from your trash after a non-battle deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-083", as: "host", under: ["BT19-006"] }],
          trash: ["ST6-07", "BT1-028", "BT10-071", "BT19-006"],
        },
        1: { trash: ["BT2-067"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const eggInstanceId = s.perm("host").stack[0]!.instanceId;
    const hostInstanceId = s.perm("host").topCard!.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => hand(s).includes("BT10-071"));

    // Exact endpoints: only the matching card moved; every near-miss stayed put.
    expect(hand(s)).toEqual(["BT10-071"]);
    expect(trash(s, 0).sort()).toEqual(["BT19-006", "BT19-006", "BT1-028", "BT3-083", "ST6-07"].sort());
    expect(trash(s, 1)).toEqual(["BT2-067"]);
    // The whole stack — top card and the Pagumon beneath it — is in your trash.
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([eggInstanceId, hostInstanceId]),
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("counts a multicolour purple level 3 Digimon and still returns only one card", async () => {
    // "purple Digimon card" is satisfied by any card whose colours include Purple, so the
    // Green/Purple BT16-040 Wormmon is a legal candidate. Two candidates are available; the
    // clause returns 1.
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-083", as: "host", under: ["BT19-006"] }],
          trash: [{ card: "BT16-040", as: "wormmon" }, "BT10-071"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("wormmon").instanceId);
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => hand(s).length === 1);

    expect(hand(s)).toEqual(["BT16-040"]);
    expect(trash(s, 0).sort()).toEqual(["BT10-071", "BT19-006", "BT3-083"].sort());
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does nothing when your trash holds no level 3 purple Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-083", as: "host", under: ["BT19-006"] }],
          trash: ["ST6-07", "BT1-028"],
        },
        1: { trash: ["BT2-067"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(hand(s)).toEqual([]);
    expect(trash(s, 0).sort()).toEqual(["BT19-006", "BT1-028", "BT3-083", "ST6-07"].sort());
    expect(trash(s, 1)).toEqual(["BT2-067"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("can return the host's own card, which reaches your trash before the effect resolves", async () => {
    // §4-14-1/4-14-2: deletion trashes the card first, then the [On Deletion] effect written on
    // the digivolution card resolves. BT2-067 DemiDevimon is itself a level 3 purple Digimon, so
    // with an otherwise empty trash it is the only candidate and comes straight back to the hand.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-067", as: "host", under: ["BT19-006"] }],
          trash: ["BT1-028"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const hostInstanceId = s.perm("host").topCard!.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => hand(s).length === 1);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([hostInstanceId]);
    expect(trash(s, 0).sort()).toEqual(["BT19-006", "BT1-028"].sort());
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not fire when the host is deleted by battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-067", as: "host", dp: 1000, suspended: true, under: ["BT19-006"] }],
          trash: ["BT10-071"],
          deck: ["BT1-009", "BT1-012", "BT1-013", "BT1-010", "BT1-011", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker", dp: 5000 }],
          hand: ["BT1-013"],
          deck: ["BT1-009", "BT1-012", "BT1-013", "BT1-010", "BT1-011", "BT1-009"],
          security: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(hand(s)).toEqual([]);
    expect(trash(s, 0).sort()).toEqual(["BT19-006", "BT10-071", "BT2-067"].sort());
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("carries the return through the real Digi-Egg route: hatch -> digivolve in breeding -> battle area", async () => {
    // Peer/stack case. Every zone change is a public intent: `hatchEgg` takes BT19-006 off the
    // egg deck in the production Breeding window, the Purple Lv3 BT2-067 digivolves onto it in
    // the breeding area (Purple Lv2, cost 0), and `moveFromBreeding` carries the stack into the
    // battle area on the next own turn. Only then does the inherited [On Deletion] clause fire
    // from under the real host. The just-trashed host BT2-067 is itself a legal candidate, so
    // `preferInstanceIds` names the Gazimon to keep the endpoint unambiguous.
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "BT19-006", as: "egg" }],
          hand: [{ card: "BT2-067", as: "demidevimon" }, "BT1-013"],
          trash: ["ST6-07", "BT1-028", { card: "BT10-071", as: "gazimon" }],
          deck: ["BT1-009", "BT1-012", "BT1-013", "BT1-010", "BT1-011", "BT1-009"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          trash: ["BT2-067"],
          deck: ["BT1-009", "BT1-012", "BT1-013", "BT1-010", "BT1-011", "BT1-009"],
          security: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("gazimon").instanceId);
    const loop = s.engine.startTurnLoop();

    // Turn 1 (seat 0): hatch the Digi-Egg.
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT19-006");
    const eggInstanceId = s.state.players[0]!.breeding!.topCard!.instanceId;
    const eggPermanentId = s.state.players[0]!.breeding!.permanentId;
    expect(s.state.players[0]!.eggDeck).toHaveLength(0);

    // Digivolve the Purple Lv3 onto the egg inside the breeding area.
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eggPermanentId,
        instanceId: s.inst("demidevimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT2-067");
    expect(s.state.players[0]!.breeding!.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    advance(s.engine).endMainPhaseIfOpen(0);

    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);

    // Turn 3 (seat 0): move the raised stack into the battle area.
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: eggPermanentId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    const carrier = s.state.players[0]!.battleArea[0]!;
    expect(carrier.topCard!.cardId).toBe("BT2-067");
    expect(carrier.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);

    await advance(s.engine).waitForMainPhase(0);
    const handBefore = hand(s).length;
    await advance(s.engine).verb.deletePermanent([carrier.permanentId], "byEffect");
    await settle(() => hand(s).includes("BT10-071"));

    expect(hand(s).filter((cardId) => cardId === "BT10-071")).toHaveLength(1);
    expect(hand(s)).toHaveLength(handBefore + 1);
    expect(trash(s, 0)).toEqual(expect.arrayContaining(["ST6-07", "BT1-028", "BT2-067", "BT19-006"]));
    expect(trash(s, 0)).not.toContain("BT10-071");
    expect(trash(s, 1)).toEqual(["BT2-067"]);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
