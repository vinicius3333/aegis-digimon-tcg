import { digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-012.js";

describe("BT12-012 Agunimon", () => {
  it("digivolves from Takuya for 2 with a bonus draw and preserves the Tamer as a source", async () => {
    expect(digivolutionRequirementsFor("BT12-012")).toContainEqual({
      names: ["Takuya Kanbara"],
      cost: 2,
      isAlternate: true,
      baseIsTamer: true,
    });
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-088", as: "takuya" }],
        hand: [{ card: "BT12-012", as: "agunimon" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takuya").permanentId,
        instanceId: s.inst("agunimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard.cardId === "BT12-012");
    expect(s.state.memory).toBe(8);
    expect(s.perm("takuya").stack.map(({ cardId }) => cardId)).toContain("BT12-088");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-009");
  });

  it("rejects the Tamer evolution route from a non-Takuya Tamer", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-089", as: "takato" }], hand: [{ card: "BT12-012", as: "agunimon" }] },
    });
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takato").permanentId,
        instanceId: s.inst("agunimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("digivolves from BurningGreymon for the alternate cost of 1", async () => {
    expect(digivolutionRequirementsFor("BT12-012")).toContainEqual({
      names: ["BurningGreymon"],
      cost: 1,
      isAlternate: true,
    });
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-013", as: "burning" }], hand: [{ card: "BT12-012", as: "agunimon" }] },
    });
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("burning").permanentId,
        instanceId: s.inst("agunimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("burning").topCard.cardId === "BT12-012");
    expect(s.state.memory).toBe(9);
    expect(s.perm("burning").stack.map(({ cardId }) => cardId)).toContain("BT12-013");
  });

  it("may play Flamemon suspended on deletion", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT12-012", as: "aguni" }], hand: [{ card: "BT12-009", as: "flame" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("aguni").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT12-009"));
    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "BT12-009");
    expect(played?.isSuspended).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("can decline the suspended Flamemon play", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT12-012", as: "aguni" }], hand: [{ card: "BT12-009", as: "flame" }] } },
      { autoSelectCards: true },
    );
    let deletionSettled = false;
    void advance(s.engine)
      .verb.deletePermanent([s.perm("aguni").permanentId])
      .then(() => {
        deletionSettled = true;
      });
    await settle(() => {
      const pending = s.state.pendingDecision;
      if (pending?.kind === "optional") {
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: pending.decisionId,
          response: { kind: "optional", accept: false },
        });
      }
      return deletionSettled;
    });
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("flame").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("may play Takuya for free from the inherited On Deletion effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-013", as: "host", under: ["BT12-012"] }],
          hand: [{ card: "BT12-088", as: "takuya" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT12-088"));
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT12-088");
    expect(s.state.memory).toBe(0);
  });
});
