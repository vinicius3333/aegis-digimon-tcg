import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-091.js";

describe("P-091 Saberdramon", () => {
  it("uses Raid to battle the highest-DP unsuspended Digimon, then Retaliation deletes the winner", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-091", as: "saberdramon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 9000, as: "highest" },
            { card: "BT1-010", dp: 3000, as: "lower" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const attackerId = s.perm("saberdramon").permanentId;
    const highestId = s.perm("highest").permanentId;
    const lowerId = s.perm("lower").permanentId;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attackerId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() =>
      !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId) &&
      !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === highestId)
    );

    expect(s.state.players[1]!.battleArea.some(
      (permanent) => permanent.permanentId === lowerId,
    )).toBe(true);
    assertNoLoudGap(s);
  });

  it("inherited On Deletion can return P-091 from its just-deleted host's stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-015", dp: 4000, as: "host", under: [{ card: "P-091", as: "source" }] }],
          trash: [
            { card: "BT1-009", as: "existingRed" },
            { card: "BT1-028", as: "ineligibleBlue" },
          ],
        },
        1: { battleArea: [{ card: "BT1-025", dp: 9000, suspended: true, as: "winner" }] },
      },
      { autoSelectCards: false },
    );
    const hostId = s.perm("host").permanentId;

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: hostId,
      target: { kind: "permanent", permanentId: s.perm("winner").permanentId },
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const decision = s.decisions.at(-1)!.req;
    expect(decision.sourceCardId).toBe("P-091");
    expect(decision.options?.candidateInstanceIds).toEqual(expect.arrayContaining([
      s.inst("source").instanceId,
      s.inst("existingRed").instanceId,
    ]));
    expect(decision.options?.candidateInstanceIds).not.toContain(s.inst("ineligibleBlue").instanceId);
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: decision.decisionId,
      response: { kind: "selectCards", instanceIds: [s.inst("source").instanceId] },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some(
      (card) => card.instanceId === s.inst("source").instanceId,
    ));

    expect(s.state.players[0]!.battleArea.some(
      (permanent) => permanent.permanentId === hostId,
    )).toBe(false);
    expect(s.state.players[1]!.battleArea.some(
      (permanent) => permanent.permanentId === s.perm("winner").permanentId,
    )).toBe(true);
    assertNoLoudGap(s);
  });
});
