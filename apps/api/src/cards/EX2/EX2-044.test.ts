import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-044.js";
import "./EX2-040.js";
import "./EX2-039.js";

describe("EX2-044 Beelzemon", () => {
  it("raises its deletion level by 1 for every 10 cards in trash", async () => {
    const trash = Array.from({ length: 8 }, () => "EX2-003");
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-042", as: "base" }],
          hand: [{ card: "EX2-044", as: "beelzemon" }],
          deck: ["EX2-001", "EX2-002", "EX2-003"],
          trash,
        },
        1: { battleArea: [{ card: "EX2-015", as: "levelFour" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 8;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("beelzemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.trash.length).toBeGreaterThanOrEqual(10);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("keeps the deletion ceiling at level 3 below ten cards in trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-042", as: "base" }],
          hand: [{ card: "EX2-044", as: "beelzemon" }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
          trash: Array.from({ length: 7 }, () => "EX2-003"),
        },
        1: { battleArea: [{ card: "EX2-015", as: "levelFour" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 8;
    const targetId = s.perm("levelFour").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("beelzemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length >= 9);
    expect(s.state.players[0]!.trash.length).toBe(9);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(true);
  });

  it("may play an Impmon from trash when directly trashed from the deck", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-043", as: "attacker", under: ["EX2-040"] }],
          deck: [
            { card: "EX2-044", as: "beelzemon" },
            { card: "BT1-001", as: "filler" },
          ],
          trash: [{ card: "EX2-039", as: "impmon" }],
        },
        1: { security: ["BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "EX2-044"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX2-039")).toBe(true);
  });

  it("does not trash or delete when the optional attack effect is declined", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-044", as: "beelzemon" }], deck: ["BT1-001", "BT1-002"] },
        1: { battleArea: [{ card: "EX2-019", as: "target" }], security: ["BT1-003"] },
      },
      { autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("beelzemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));
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
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("does not trigger when Beelzemon is only revealed by another effect", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX2-039", as: "playedImpmon" }],
          deck: [
            { card: "EX2-044", as: "revealedBeelzemon" },
            { card: "EX2-065", as: "aiMako" },
            { card: "BT1-001", as: "fillerOne" },
            { card: "BT1-002", as: "fillerTwo" },
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
    await settle(() =>
      s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("revealedBeelzemon").instanceId),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("revealedBeelzemon").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("trashImpmon").instanceId);
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });
});
