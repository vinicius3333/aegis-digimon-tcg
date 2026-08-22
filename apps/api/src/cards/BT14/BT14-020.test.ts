import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT14-020.js";

describe("BT14-020", () => {
  it("trashes one opposing source and prevents this Digimon from being blocked at the start of your main phase", () => expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")).toMatchObject({ actions: [{ kind: "TrashDigivolution", amount: 1 }, { kind: "Restrict", restriction: "beBlocked", duration: "forTheTurn" }] }));
  it("inherits replacement play of Gomamon from its digivolution cards when deleted", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "OpponentsTurn", actions: [{ kind: "Replacement", event: "wouldBeDeleted", actions: [{ kind: "PlayWithoutCost", from: ["digivolutionCards"], payCost: false }] }] }));

  it("trashes an opposing source at the start of main phase", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT14-020", as: "gomamon" }] },
      1: { battleArea: [{ card: "BT1-015", as: "opponent", under: ["BT1-001"] }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 10;
    await advance(s.engine).runTurn(0);
    expect(s.state.players[1]!.battleArea[0]!.stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-001")).toBe(true);
  });
});
