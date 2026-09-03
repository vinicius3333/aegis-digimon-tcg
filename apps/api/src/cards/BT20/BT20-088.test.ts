import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-088.js";
import "./index.js";

describe("BT20-088 Violet Inboots", () => {
  it("gains memory only when the opponent has a Digimon", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase")).toMatchObject({
      actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "opponentHas", filter: { kind: ["Digimon"] } } }],
    });
  });

  it("gates the reduced Ghost digivolution on suspending this Tamer", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }] },
          actions: [
            {
              kind: "Digivolve",
              target: { filter: { controller: "mine", kind: ["Digimon"], zone: "battleArea" } },
              into: { nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }] },
              payCost: true,
              reduceCost: 2,
              cost: { kind: "suspend", target: { isSelf: true } },
              abortOnDecline: true,
            },
          ],
        },
      ],
    });
  });

  it("naturally evolves a Digimon after an own Ghost is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-088", as: "tamer" },
            { card: "BT20-063", as: "deletedGhost", dp: 1000 },
            { card: "BT20-067", as: "recipient", dp: 5000 },
          ],
          hand: [{ card: "BT20-072", as: "evolution" }],
        },
        1: { battleArea: [{ card: "BT20-079", as: "blocker", dp: 12000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("deletedGhost").permanentId,
        target: { kind: "permanent", permanentId: s.perm("blocker").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("recipient").topCard.cardId === "BT20-072");

    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT20-063")).toBe(true);
    expect(s.state.memory).toBe(1);
  });
});
