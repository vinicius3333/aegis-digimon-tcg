import { getCardDefinition } from "@aegis/shared";
import { describe, it, expect } from "vitest";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-099.js";
import "./BT9-099.js";
import "../BT1/BT1-021.js";
import "../BT1/BT1-085.js";
import "../BT20/BT20-020.js";
describe("BT9-099 Sunrise Buster", () => {
  it("matches catalog values and the Tamer-scaled DP and security IR", () => {
    expect(getCardDefinition("BT9-099")).toMatchObject({
      colors: ["Yellow", "Red"],
      kinds: ["Option"],
      playCost: 5,
      securityEffectText: "[Security] Activate this card's [Main] effect.",
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "Main",
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["hand"],
              payCost: false,
              optional: true,
              target: { filter: { kind: ["Tamer"], colors: ["Red", "Yellow"] } },
            },
            {
              kind: "ModifyDP",
              amount: -3000,
              duration: "forTheTurn",
              scaling: { unit: "cards", per: 1, filter: { kind: ["Tamer"], colors: ["Red", "Yellow"] } },
            },
          ],
        },
        { trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] },
      ],
    });
  });

  it("reduces an opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT1-085", "BT1-087"], hand: [{ card: "BT9-099", as: "option" }] },
        1: { battleArea: [{ card: "BT1-025", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 5000);
    expect(s.perm("target").currentDP).toBe(5000);
  });
});

describe("BT9-099 Sunrise Buster — KB Q&A rulings", () => {
  it("cannot play a Tamer while its user's opponent forbids playing Tamers by effects (Q4665)", async () => {
    const boardWithSunriseBusterInSecurity = async () => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT1-021", as: "attacker" }],
            hand: [{ card: "BT20-020", as: "fighterMode" }],
          },
          1: {
            hand: [{ card: "BT1-085", as: "tamer" }],
            security: [{ card: "BT9-099", as: "sunriseBuster", faceUp: false }, "BT9-007"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 6;
      await s.ready();
      return s;
    };

    const attackIntoSunriseBuster = async (s: EngineSetup) => {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("sunriseBuster").instanceId) &&
          s.state.pendingDecision === undefined,
      );
    };

    const restricted = await boardWithSunriseBusterInSecurity();
    expect(
      restricted.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: restricted.perm("attacker").permanentId,
        instanceId: restricted.inst("fighterMode").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => restricted.perm("attacker").topCard.cardId === "BT20-020" && restricted.state.pendingDecision === undefined,
    );
    await attackIntoSunriseBuster(restricted);

    expect(restricted.perm("attacker").topCard.cardId).toBe("BT20-020");
    expect(restricted.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT9-099");
    expect(restricted.state.players[1]!.hand.map(({ cardId }) => cardId)).toContain("BT1-085");
    expect(restricted.state.players[1]!.battleArea).toHaveLength(0);

    const unrestricted = await boardWithSunriseBusterInSecurity();
    await attackIntoSunriseBuster(unrestricted);
    expect(unrestricted.state.players[1]!.hand.map(({ cardId }) => cardId)).not.toContain("BT1-085");
    expect(unrestricted.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-085"]);
  });
});
