import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-039.js";
import "./EX2-040.js";
import "./EX2-043.js";
import "./EX2-041.js";
import "./EX2-074.js";

describe("EX2-039 Impmon", () => {
  it("adds Beelzemon and Ai & Mako from the top four on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX2-039", as: "impmon" }],
          deck: [
            { card: "EX2-044", as: "beelzemon" },
            { card: "EX2-065", as: "aiMako" },
            "EX2-014",
            "EX2-015",
            "EX2-031",
            "EX2-032",
          ],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("impmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.deck.map((card) => card.cardId).join(",") === "EX2-031,EX2-032,EX2-014,EX2-015",
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("beelzemon").instanceId, s.inst("aiMako").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["EX2-031", "EX2-032", "EX2-014", "EX2-015"]);
  });

  it("does not recursively trigger an Impmon trashed by EX2-039's own mill", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-043", as: "attacker", under: ["EX2-040"] }],
          deck: [
            { card: "EX2-039", as: "firstImpmon" },
            "BT1-001",
            { card: "EX2-039", as: "secondImpmon" },
            "BT1-002",
            "BT1-003",
            { card: "BT1-004", as: "sentinel" },
          ],
        },
        1: { security: ["BT1-005"] },
      },
      {
        autoAcceptOptional: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferOptionIndex: 2,
      },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 5);

    expect(s.state.players[0]!.trash).toHaveLength(5);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("sentinel").instanceId]);
    assertNoLoudGap(s);
  });

  it("may trash only one card after activating its up-to-three mill", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-043", as: "attacker", under: ["EX2-040"] }],
          deck: [
            { card: "EX2-039", as: "impmon" },
            "BT1-001",
            { card: "BT1-002", as: "chosenMill" },
            { card: "BT1-003", as: "sentinel" },
          ],
        },
        1: { security: ["BT1-004"] },
      },
      {
        autoAcceptOptional: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferOptionIndex: 0,
      },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 3);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("chosenMill").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("sentinel").instanceId]);
    assertNoLoudGap(s);
  });

  it("grants its inherited DP bonus to a later Beelzemon form", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-074", as: "blastMode", under: ["EX2-039"] }] },
    });
    await s.ready();
    await s.engine.recomputeContinuousEffects();
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("blastMode").currentDP).toBe(18_000);
    assertNoLoudGap(s);
  });

  it("does not mill when the direct-trash optional effect is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-039", as: "resident" },
            { card: "EX2-041", as: "deleter" },
          ],
          deck: [
            { card: "EX2-039", as: "trashedImpmon" },
            { card: "BT1-001", as: "fillerOne" },
            { card: "BT1-002", as: "fillerTwo" },
            { card: "BT1-003", as: "fillerThree" },
            { card: "BT1-004", as: "fillerFour" },
          ],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    await s.ready();
    const deleterId = s.perm("deleter").permanentId;
    // No current public intent directly mills a chosen card; deleting EX2-041 drives its
    // production On Deletion top-deck trash effect, which emits the same event.
    void advance(s.engine).verb.deletePermanent([deleterId]);
    await settle(() => s.decisions.length > 0);
    const optionalDecision = s.decisions.find(({ req }) => req.kind === "optional");
    expect(optionalDecision).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optionalDecision!.req.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("trashedImpmon").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("fillerThree").instanceId,
      s.inst("fillerFour").instanceId,
    ]);
  });

  it("does not trigger its deck-trash effect when Impmon is only revealed", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX2-039", as: "playedImpmon" }],
          deck: [
            { card: "EX2-039", as: "revealedImpmon" },
            { card: "EX2-044", as: "beelzemon" },
            { card: "EX2-065", as: "aiMako" },
            { card: "BT1-001", as: "filler" },
          ],
          trash: [{ card: "EX2-039", as: "trashImpmon" }],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playedImpmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("beelzemon").instanceId));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("beelzemon").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("trashImpmon").instanceId);
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });
});
