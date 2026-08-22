import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-050.js";
import "../index.js";

describe("BT26-050 Rosemon: Burst Mode", () => {
  it("encodes the independent suspend/lock targets and security cost", () => {
    expect(compiled.digivolutionRequirement).toEqual(
      expect.arrayContaining([
        { level: 6, traits: ["DATA SQUAD"], cost: 5, isAlternate: true },
        {
          cost: 0,
          isAlternate: true,
          names: ["Rosemon"],
          burstDigivolve: { returnTamerNamesExact: ["Yoshino Fujieda"] },
        },
      ]),
    );
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "Suspend" }, { kind: "Restrict", restriction: "unsuspend" }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        { kind: "Return", to: "deckBottom" },
        { kind: "SecurityManipulation", op: "trashTop" },
      ],
    });
  });

  it("publicly returns a suspended Digimon before trashing the opponent's top security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-050", as: "burstMode" },
          { card: "BT26-036", as: "returned", suspended: true },
        ],
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "opponent", suspended: true }],
        security: [{ card: "BT1-010", as: "security" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("burstMode"));

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toContain("BT26-036");
  });
});
