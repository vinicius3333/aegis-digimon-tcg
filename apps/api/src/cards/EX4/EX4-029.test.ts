import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-029.js";

describe("EX4-029 Antylamon", () => {
  it("adds the suspended Digimon's DP and Security Attack plus one for the attack", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "AddDPFromSuspendedCost",
          dpSource: { kind: "suspendedTarget" },
          duration: "forThisAttack",
          alsoGainKeywords: [{ keyword: "SecurityAttack", amount: 1 }],
        },
      ],
    });
  });
  it("places the top deck card into security at three or fewer security", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfAttack")?.actions?.[0]).toMatchObject({
      kind: "SecurityManipulation",
      op: "placeFromDeck",
      toTop: true,
      condition: { kind: "youHave", count: 3, comparison: "lte" },
    });
  });

  it("recovers the deck top after a real attack at three security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX4-029", as: "antylamon" }],
        security: 3,
        deck: [{ card: "BT1-090", as: "recovery" }],
      },
      1: { security: ["BT1-090", "BT1-090"] },
    });
    const recoveryId = s.inst("recovery").instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("antylamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some(({ instanceId }) => instanceId === recoveryId));

    expect(s.state.players[0]!.security).toHaveLength(4);
  });
});
