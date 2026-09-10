import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-085.js";
import "./index.js";
import "../BT1/BT1-013.js";
import "./BT20-047.js";
import "../ST18/ST18-10.js";

describe("BT20-085 Shoto Kazama", () => {
  it("matches the catalog and treats the bracketed Tamer name as exact", () => {
    expect(getCardDefinition("BT20-085")).toMatchObject({
      cardId: "BT20-085",
      nameEn: "Shoto Kazama",
      colors: ["Green"],
      kinds: ["Tamer"],
      playCost: 3,
      evoCosts: [],
      types: ["LIBERATOR"],
      maxCountInDeck: 4,
    });
    const printed = getCardDefinition("BT20-085")!;
    expect(printed.effectText!.replaceAll("\u00a0", " ")).toContain(
      "By returning this Tamer to the bottom of the deck, you may play 1 [Shoto Kazama] from your hand without paying the cost.",
    );
    expect(printed.effectText!.replaceAll("\u00a0", " ")).toContain(
      "until the end of their turn, 1 of your Digimon with the [Vortex Warriors] trait gets +2000 DP.",
    );
    expect(printed.securityEffectText).toBe("[Security] Play this card without paying the cost.");
    const reference = { tokens: ["Shoto Kazama"], match: "nameExact" as const };
    expect(matchNameOrTrait({ nameEn: "Shoto Kazama" }, reference)).toBe(true);
    expect(matchNameOrTrait({ nameEn: "Shoto Kazama Jr." }, reference)).toBe(false);
  });

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
      target: {
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          levels: [3],
          nameOrTrait: [{ match: "trait", tokens: ["Avian", "Bird"] }],
        },
      },
      from: ["trash"],
    });
    expect(effect?.actions[0]).toMatchObject({
      target: { filter: { nameOrTrait: [{ tokens: ["Shoto Kazama"], match: "nameExact" }] } },
    });
    expect(effect?.actions).toHaveLength(2);
  });

  it("gates the Vortex Warriors DP effect on the suspend cost", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn");
    expect(effect).toMatchObject({
      actions: [
        {
          kind: "Suspend",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          cost: { kind: "suspend", target: { isSelf: true } },
          abortOnDecline: true,
        },
        {
          kind: "ModifyDP",
          target: { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ match: "trait" }] } },
          amount: 2000,
          duration: "untilOpponentTurnEnd",
        },
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
    const declinedTurn = declined.engine.startTurnLoop();
    await advance(declined.engine).waitForMainPhase(0);
    expect(declined.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT20-085"]);
    expect(declined.state.players[0]!.hand.map((card) => card.instanceId)).toContain(
      declined.inst("replacement").instanceId,
    );
    expect(declined.state.players[0]!.trash.map((card) => card.instanceId)).toContain(declined.inst("bird").instanceId);
    expect(declined.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await declinedTurn;

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
    const acceptedTurn = accepted.engine.startTurnLoop();
    await advance(accepted.engine).waitForMainPhase(0);
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
    expect(accepted.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await acceptedTurn;
  });

  it("separates the opposing suspend target from the own Vortex Warriors DP target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-085", as: "shoto" },
            { card: "ST18-10", dp: 7000, as: "vortex" },
          ],
          deck: ["BT20-010", "BT20-010"],
        },
        1: { battleArea: [{ card: "BT20-047", as: "opponent" }], deck: ["BT20-010", "BT20-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    // Drive the real turn loop. The partner has the Vortex Warriors trait but no Vortex
    // keyword, so its presence cannot open an unrelated end-of-turn attack decision.
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
    // The public one-turn driver leaves the next seat's Main phase open in this
    // harness. The resolved event proves the End-of-Your-Turn effect completed;
    // the opponent's sole legal target has then naturally passed its unsuspend
    // phase, while this Tamer remains suspended until its owner's next turn.
    expect(s.perm("shoto").isSuspended).toBe(true);
    expect(s.perm("vortex").currentDP).toBe(9000);
    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "effectResolved", sourceCardId: "BT20-085", timing: "OnEndTurn" }),
    );

    // Continue seat 1 -> seat 0 through the public loop. The opponent turn
    // exercises the printed duration boundary without mutating turn ownership
    // or memory.
    const turnLoop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("vortex").currentDP).toBe(7000);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });

  it("plays the exact Shoto instance from a public security check without cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "attacker" }], deck: ["BT1-010"] },
      1: { security: [{ card: "BT20-085", as: "securityShoto" }], deck: ["BT1-010"] },
    });
    const shotoId = s.inst("securityShoto").instanceId;
    await s.ready();
    const beforeMemory = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === shotoId));
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === shotoId)).toBe(true);
    expect(s.state.memory).toBe(beforeMemory);
  });
});
