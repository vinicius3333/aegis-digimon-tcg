import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "./testkit/harness.js";
import { advance } from "./testkit/advance.js";
// Boot side-effect: self-registers every compiled-IR card module.
import "../cards/index.js";

/**
 * Engine seams around deletion handling and rule processing, driven through public intents.
 *
 * 1. A combat deletion must publish the deleted permanent's top card, so an inherited
 *    [On Deletion] condition about "this Digimon" can still read its host (BT17-053).
 * 2. The rule-check fixpoint must treat a 0 DP Digimon that cannot be deleted as settled,
 *    or the sweep never converges and the match is declared a draw (BT18-086).
 * 3. A leave-prevention replacement does not pre-empt the deletion trigger of the permanent
 *    it saves: the trigger resolves, then the prevention is used (KB Q2212, EX3-013).
 */
describe("deletion and rule-processing seams", () => {
  it("resolves an inherited [On Deletion] condition against the host deleted in battle", async () => {
    const s = setupEngine(
      {
        // BT2-059 is a vanilla [Unidentified] host; BT17-053's inherited clause plays a token
        // only when the deleted Digimon had that trait.
        0: { battleArea: [{ card: "BT2-059", under: ["BT17-053"], suspended: true, as: "host" }] },
        1: { battleArea: [{ card: "BT17-057", as: "attacker" }] },
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
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId.startsWith("TOKEN-")),
    );
  });

  it("converges the rule-check fixpoint when a 0 DP Digimon cannot be deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-086", as: "larva" },
            { card: "BT18-034", as: "lucemon" },
          ],
        },
        1: { hand: [{ card: "BT1-009", as: "filler" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    // Any public action re-runs the fixpoint; a protected 0 DP Digimon must settle it.
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("filler").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.gameOver).toBeFalsy();
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("larva").instanceId)).toBe(
      true,
    );
  });

  it("resolves the deletion trigger of a permanent whose leaving is then prevented (Q2212)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-072", under: ["BT1-009", "BT1-021", "BT2-060", "EX3-013"], as: "chaosX" }] },
        1: { security: ["BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const chaosId = s.perm("chaosX").permanentId;

    await advance(s.engine).verb.deletePermanent([chaosId]);
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(chaosId);
  });

  it("public Delete resolves the gained deletion trigger before the EX3-013 replacement (Q2212)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT12-072",
              under: ["BT1-009", "BT1-021", "BT2-060", "EX3-013"],
              as: "chaosX",
            },
          ],
        },
        1: {
          battleArea: ["BT1-009"],
          hand: [{ card: "ST1-16", as: "gaiaForce" }],
          security: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    s.state.turnSeat = 1;
    await s.ready();
    const chaosId = s.perm("chaosX").permanentId;
    const securityTopId = s.state.players[1]!.security[0]!.instanceId;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaiaForce").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(chaosId);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("ST1-16");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-021", "BT2-060"]);
    expect(s.perm("chaosX").stack.map(({ cardId }) => cardId)).toEqual(["BT1-009", "EX3-013"]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(securityTopId);
    expect(s.state.memory).toBe(2);
  });

  it("withholds a third party's deletion watcher for a permanent whose leaving is prevented (Q6030)", async () => {
    const s = setupEngine(
      {
        // EX5-063 Leviamon deletes the opponent's highest then lowest level Digimon, and its
        // [All Turns] watcher gains 1 memory for each opponent Digimon DELETED (Q6037).
        0: { hand: [{ card: "EX5-063", as: "leviamon" }] },
        1: {
          battleArea: [{ card: "EX1-073", as: "machine", under: ["EX1-008", "EX1-050", "BT1-020", "BT1-021"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 13;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("leviamon").instanceId })).toEqual({
      ok: true,
    });
    // Machinedramon pays both deletions by trashing 2 of its own level-5 sources each time.
    await settle(() => s.perm("machine").stack.length === 0);

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("machine").permanentId,
    );
    // Nothing was deleted, so Leviamon's watcher gains nothing.
    expect(s.state.memory).toBe(0);
  });
});
