import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-043.js";

describe("BT23-043 CannonBeemon", () => {
  it("uses its inherited effect to flip security and preserve another Royal Base Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-046", as: "carrier", under: ["BT23-043"] },
            { card: "BT23-045", as: "protected" },
          ],
          security: [{ card: "BT23-015", as: "faceUpSecurity", faceUp: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const protectedId = s.perm("protected").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([protectedId], "byEffect")).toBe(0);
    expect(s.state.players[0]!.battleArea.some((card) => card.permanentId === protectedId)).toBe(true);
    expect(s.state.players[0]!.security[0]).toMatchObject({ faceUp: false });
  });

  it("grants Blocker to all of your Royal Base Digimon in Security", () => {
    const security = compiled.effects.find((entry) => entry.trigger === "OpponentsTurn") as any;
    expect(security).toMatchObject({
      isSecurity: true,
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }],
            },
            count: "all",
          },
          keyword: { keyword: "Blocker" },
        },
      ],
    });
  });

  it("prevents this Digimon from leaving except by its owner's effects", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    const replacement = effect.actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      sourceFilter: { isSelfRef: true },
      leaveCause: "otherThanYourEffect",
      actions: [
        {
          kind: "Prevent",
          mode: "leavePlay",
          cost: {
            kind: "flipSecurity",
            target: {
              filter: { zone: "security", controller: "mine", position: "top", faceUp: true },
              count: 1,
            },
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    });
    expect(effect.frequency).toBe("OncePerTurn");
  });

  it("inherits protection for one qualifying Royal Base Digimon", () => {
    const effect = compiled.effects.find((entry) => entry.isInherited) as any;
    expect(effect).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }],
          },
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }],
            },
            count: 1,
          },
          leaveCause: "otherThanYourEffect",
        },
      ],
    });
  });
});
