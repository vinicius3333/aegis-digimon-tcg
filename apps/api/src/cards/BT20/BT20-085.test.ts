import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-085.js";
import "./index.js";
import "../BT1/BT1-013.js";
import "./BT20-047.js";

describe("BT20-085 Shoto Kazama", () => {
  it("models the Start of Main Phase bottom-deck cost and gated follow-up", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase");
    expect(effect?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      optional: true,
      abortOnDecline: true,
      cost: { kind: "return", to: "deckBottom", target: { isSelf: true } },
    });
    expect(effect?.actions[1]).toMatchObject({
      kind: "PlayWithoutCost",
      condition: { kind: "allOf", conditions: [{ kind: "ifThisEffectActed" }, { kind: "youHaveNone" }] },
      target: { filter: { levels: [3], nameOrTrait: [{ match: "trait", tokens: ["Avian", "Bird"] }] } },
      from: ["trash"],
    });
    expect(effect?.actions).toHaveLength(2);
  });

  it("gates the Vortex Warriors DP effect on the suspend cost", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn");
    expect(effect).toMatchObject({
      actions: [
        { kind: "Suspend", cost: { kind: "suspend", target: { isSelf: true } }, abortOnDecline: true },
        { kind: "ModifyDP", amount: 2000, duration: "untilOpponentTurnEnd" },
      ],
    });
  });

  it("registers exactly one security play effect", () => {
    const security = compiled.effects.filter((entry) => entry.trigger === "Security");
    expect(security).toHaveLength(1);
    expect(security[0]).toMatchObject({ isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] });
  });

  it("only processes the after-Then Avian/Bird play after returning this Tamer", async () => {
    const declined = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-085", as: "shoto" }],
          hand: [{ card: "BT20-085", as: "replacement" }],
          trash: [{ card: "BT1-013", as: "bird" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await declined.ready();
    await advance(declined.engine).fireGlobal(EffectTiming.StartOfYourMainPhase);
    expect(declined.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT20-085"]);
    expect(declined.state.players[0]!.hand.map((card) => card.instanceId)).toContain(
      declined.inst("replacement").instanceId,
    );
    expect(declined.state.players[0]!.trash.map((card) => card.instanceId)).toContain(declined.inst("bird").instanceId);

    const preferred: string[] = [];
    const accepted = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-085", as: "shoto" }],
          hand: [
            { card: "BT20-085", as: "replacement" },
            { card: "BT20-085", as: "notReentered" },
          ],
          trash: [{ card: "BT1-013", as: "bird" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(accepted.inst("replacement").instanceId);
    const originalShotoInstanceId = accepted.inst("shoto").instanceId;
    const replacementInstanceId = accepted.inst("replacement").instanceId;
    await accepted.ready();
    await advance(accepted.engine).fireGlobal(EffectTiming.StartOfYourMainPhase);
    await settle(
      () =>
        accepted.state.players[0]!.deck.some((card) => card.instanceId === originalShotoInstanceId) &&
        accepted.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-013"),
    );
    expect(accepted.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(
      expect.arrayContaining(["BT20-085", "BT1-013"]),
    );
    // Capture identities before the source permanent leaves. Q5553/Q5554 concern the
    // physical returned card and the newly played copy; aliases must not be re-derived
    // from whichever permanent happens to remain after the phase-boundary effect.
    expect(accepted.state.players[0]!.deck.at(-1)?.instanceId).toBe(originalShotoInstanceId);
    expect(accepted.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      replacementInstanceId,
    );
    expect(accepted.state.players[0]!.hand.map((card) => card.instanceId)).toContain(
      accepted.inst("notReentered").instanceId,
    );
  });

  it("separates the opposing suspend target from the own Vortex Warriors DP target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-085", as: "shoto" },
            { card: "EX7-034", dp: 7000, as: "vortex" },
          ],
        },
        1: { battleArea: [{ card: "BT20-047", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).runTurn(0);

    expect(s.perm("shoto").isSuspended).toBe(true);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.perm("vortex").currentDP).toBe(9000);
  });
});
