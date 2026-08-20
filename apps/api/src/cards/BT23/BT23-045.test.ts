import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-045.js";

describe("BT23-045 TigerVespamon ACE", () => {
  it("places a qualifying hand card face up at security bottom before returning an eligible Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-045", as: "tiger" }],
          hand: [{ card: "BT23-015", as: "zaxon" }],
          security: [{ card: "BT1-010", as: "oldSecurity" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const zaxonId = s.inst("zaxon").instanceId;
    const targetId = s.perm("target").permanentId;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("tiger"));

    expect(s.state.players[0]!.security.at(-1)).toMatchObject({ instanceId: zaxonId, faceUp: true });
    expect(s.state.players[1]!.battleArea.some((card) => card.permanentId === targetId)).toBe(false);
    expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
  });

  it("flips the top face-up security card face down to unsuspend after this Digimon suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-045", as: "tiger", suspended: true }],
          security: [{ card: "BT23-015", as: "topSecurity", faceUp: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireSubTrigger("whenSuspended", {
      subjectPermanentId: s.perm("tiger").permanentId,
    });

    expect(s.perm("tiger").isSuspended).toBe(false);
    expect(s.state.players[0]!.security[0]).toMatchObject({ faceUp: false });
  });

  it("declares Blast Digivolve from hand", () => {
    const counter = compiled.effects.find((entry) => entry.trigger === "Counter") as any;
    expect(counter).toMatchObject({
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve" }],
    });
  });

  it("requires placing a Royal Base or Zaxon Digimon in security before returning an eligible opponent Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "Return",
        target: {
          filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", relativeToSource: true } },
          count: 1,
        },
        to: "hand",
        cost: {
          kind: "place",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Royal Base", "Zaxon"], match: "trait" }],
            },
            count: 1,
            from: ["hand", "trash"],
          },
          destination: "security",
          position: "bottom",
          faceDown: false,
        },
        optional: true,
        abortOnDecline: true,
      });
    }
  });

  it("only reacts when this Digimon suspends and pays by flipping the top face-up security card", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    const subtrigger = effect.actions[0];
    expect(subtrigger).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      sourceFilter: { isSelfRef: true },
    });
    expect(subtrigger.actions[0]).toMatchObject({
      kind: "Unsuspend",
      target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
      cost: {
        kind: "flipSecurity",
        target: {
          filter: { zone: "security", controller: "mine", position: "top", faceUp: true },
          count: 1,
        },
        raw: "by flipping your top face-up security card face down",
      },
      optional: true,
      abortOnDecline: true,
    });
  });
});
