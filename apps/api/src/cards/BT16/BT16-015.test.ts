import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-015.js";
import "../index.js";

/**
 * BT16-015 Phoenixmon (X Antibody). The behavioral tests below cover the `[Your Turn]` clause
 * "while [Phoenixmon] or [X Antibody] is in this Digimon's digivolution cards, attach [End of
 * Attack] to all of this Digimon's [On Deletion] effects", against the card's own KB rulings:
 * Q2614 (the projection reaches INHERITED [On Deletion] effects, each still gated by its own
 * conditions) and Q2615 (the projected copies stop applying the moment the source clause does).
 *
 * The end-of-attack window is driven through the production fire seam with the same attacker
 * payload the combat controller supplies at the end of an attack (CR §11-6), because no intent
 * reaches that window on its own without also arranging a full legal attack.
 */
describe("BT16-015", () => {
  const attackerPayload = (permanentId: string) => ({ attackerPermanentId: permanentId });

  it("projects an inherited [On Deletion] into its own end of attack (Q2614)", async () => {
    const s = setupEngine(
      {
        0: {
          // BT2-019 Phoenixmon satisfies the source clause; BT13-014 Garudamon supplies the
          // inherited "[On Deletion] Delete 1 of your opponent's Digimon with 6000 DP or less".
          battleArea: [{ card: "BT16-015", as: "phoenixmonX", under: ["BT2-019", "BT13-014"] }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "prey", dp: 6000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("phoenixmonX").permanentId;
    const preyId = s.perm("prey").permanentId;

    await advance(s.engine).fireGlobal(EffectTiming.OnEndAttack, attackerPayload(hostId));
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === preyId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === preyId)).toBe(false);
  });

  it("stops projecting once the source clause's condition is gone (Q2615)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-015", as: "phoenixmonX", under: [{ card: "BT2-019", as: "phoenixmon" }, "BT13-014"] },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "prey", dp: 6000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("phoenixmonX").permanentId;
    const preyId = s.perm("prey").permanentId;

    // Removing [Phoenixmon] from the digivolution cards is what ＜De-Digivolve＞ does to the
    // source clause in Q2615: the condition stops holding, the continuous recompute drops the
    // projection, and the collector no longer offers the projected copies (§15-4-4-5).
    await advance(s.engine).verb.trashDigivolutionCards(hostId, [s.inst("phoenixmon").instanceId], 0);
    await advance(s.engine).fireGlobal(EffectTiming.OnEndAttack, attackerPayload(hostId));
    await settle(() => true);

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === preyId)).toBe(true);
  });

  it("does not project without [Phoenixmon] or [X Antibody] in its digivolution cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-015", as: "phoenixmonX", under: ["BT13-014"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "prey", dp: 6000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("phoenixmonX").permanentId;
    const preyId = s.perm("prey").permanentId;

    await advance(s.engine).fireGlobal(EffectTiming.OnEndAttack, attackerPayload(hostId));
    await settle(() => true);

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === preyId)).toBe(true);
  });

  it("projects its own printed [On Deletion] while the condition holds", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-015", as: "phoenixmonX", under: ["BT2-019"] }],
          hand: [{ card: "BT16-008", as: "playedAvian" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "prey", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("phoenixmonX").permanentId;
    const preyId = s.perm("prey").permanentId;

    await advance(s.engine).fireGlobal(EffectTiming.OnEndAttack, attackerPayload(hostId));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-008"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-008")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === preyId)).toBe(false);
  });

  it("keeps its printed [On Deletion] firing on an actual deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-015", as: "phoenixmonX" }],
          hand: [{ card: "BT16-008", as: "playedAvian" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "withinPlayedDP", dp: 4000 },
            { card: "BT1-009", as: "abovePlayedDP", dp: 5000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("phoenixmonX").permanentId;
    const withinId = s.perm("withinPlayedDP").permanentId;
    const aboveId = s.perm("abovePlayedDP").permanentId;

    await advance(s.engine).verb.deletePermanent([hostId]);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-008"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-008")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === withinId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === aboveId)).toBe(true);
  });

  it("compiles the projection under both [When Digivolving] and [Your Turn]", () => {
    const projection = {
      kind: "GrantStatic",
      grant: { keyword: "EndOfAttack", targetFilter: { keyword: "OnDeletion" } },
    };
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "Blitz" } });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject(projection);
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "YourTurn", actions: [projection] });
  });
});
