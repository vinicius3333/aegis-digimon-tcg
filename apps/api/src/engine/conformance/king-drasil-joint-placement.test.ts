import { describe, expect, it } from "vitest";
import { cite } from "./_kb.js";
import { advance } from "../testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../testkit/harness.js";
import "../../cards/index.js";

describe("BT13-007 public joint Digi-Egg and Royal Knight placement", () => {
  it("places the revealed egg first, then all Royal Knights beneath existing cards", async () => {
    cite(
      "comprehensive-0292",
      "3-1-3-4 and 4-7-5: owner chooses multi-card order; stack cards default face-up",
      "703276fe13872e365e719f8577a6ccf56e5e00dac5dc84cd15a5434784dee855",
    );
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT13-007", as: "host", under: [{ card: "BT1-001", as: "existing" }] },
          eggDeck: [{ card: "BT1-001", as: "egg", faceUp: false }],
          battleArea: [
            { card: "AD1-008", as: "knightA" },
            { card: "BT13-040", as: "knightB" },
            { card: "BT1-009", as: "quiet" },
          ],
          deck: [{ card: "BT1-028", as: "deck" }],
          security: [{ card: "BT1-009", as: "security" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }], security: [{ card: "BT1-009" }] },
      },
      { autoSelectCards: true, autoOrderCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;
    s.state.isFirstPlayersFirstTurn = true;
    await s.ready();
    const host = s.perm("host");
    const eggId = s.inst("egg").instanceId;
    const existingId = s.inst("existing").instanceId;
    const knightAId = s.perm("knightA").topCard.instanceId;
    const knightBId = s.perm("knightB").topCard.instanceId;
    await advance(s.engine).runTurn(0);
    await settle();
    // The selected bottom-first order is egg, then Royal Knight A, then Royal Knight B,
    // followed by the host's pre-existing source.
    expect(host.stack.map((card) => card.instanceId)).toEqual([eggId, knightAId, knightBId, existingId]);
    expect(host.stack.every((card) => card.faceUp)).toBe(true);
    expect(s.state.players[0]!.eggDeck).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("quiet").permanentId,
    ]);
    expect(host.inBreeding).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("honors the activating player's explicit Royal Knight order choice", async () => {
    cite(
      "comprehensive-0292",
      "3-1-3-4: the player causing a multi-card move chooses placement order",
      "703276fe13872e365e719f8577a6ccf56e5e00dac5dc84cd15a5434784dee855",
    );
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT13-007", as: "host", under: [{ card: "BT1-001", as: "existing" }] },
          eggDeck: [{ card: "BT1-001", as: "egg", faceUp: false }],
          battleArea: [
            { card: "AD1-008", as: "knightA", under: [{ card: "BT1-001", as: "shedA" }] },
            { card: "BT13-040", as: "knightB", under: [{ card: "BT1-002", as: "shedB" }] },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: true, autoOrderCards: false, autoOrderTriggers: true },
    );
    s.state.memory = 3;
    s.state.isFirstPlayersFirstTurn = true;
    await s.ready();
    const host = s.perm("host");
    const eggId = s.inst("egg").instanceId;
    const existingId = s.inst("existing").instanceId;
    const knightAId = s.perm("knightA").topCard.instanceId;
    const knightBId = s.perm("knightB").topCard.instanceId;
    const turn = advance(s.engine).runTurn(0);
    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const order = s.decisions.find((entry) => entry.req.kind === "orderCards")?.req.options?.candidateInstanceIds ?? [];
    expect(order).toEqual(expect.arrayContaining([eggId, knightAId, knightBId]));
    expect(order).toHaveLength(3);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "orderCards", order: [knightAId, eggId, knightBId] },
      }),
    ).toMatchObject({ ok: true });
    await turn;
    await settle();
    expect(host.stack.map((card) => card.instanceId)).toEqual([knightAId, eggId, knightBId, existingId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("shedA").instanceId, s.inst("shedB").instanceId].sort(),
    );
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });
});
