import { EffectDuration, type Seat } from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import "../../cards/index.js";
import { advance } from "../testkit/advance.js";
import { finalRevealOf } from "../state/visibility.js";
import { setupEngine, settle } from "../testkit/harness.js";

const TOKEN = "TOKEN-AthoRenePor-Token";

describe("#5365 token deck return lifecycle through public intents", () => {
  for (const seat of [0, 1] as const) {
    const opponent = (1 - seat) as Seat;
    it.each([TOKEN, "BT1-009"])(`seat ${seat}: EX9-018 returns %s`, async (card) => {
      const s = setupEngine(
        {
          [seat]: { hand: [{ card: "EX9-018", as: "metal" }], trash: ["BT1-048"] },
          [opponent]: { battleArea: [{ card, as: "target" }], deck: ["BT1-046"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = seat;
      s.state.memory = 10;
      await s.ready();
      const triggers = vi.spyOn(s.engine, "fireSubTrigger");
      const targetId = s.inst("target").instanceId;
      const beforeDeck = s.state.players[opponent]!.deck.map(({ instanceId }) => instanceId);
      expect(s.engine.applyIntent(seat, { type: "playCard", instanceId: s.inst("metal").instanceId })).toEqual({
        ok: true,
      });
      await settle();
      expect(s.state.pendingDecision).toBeUndefined();
      expect(
        s.state.players[seat]!.battleArea.find(({ topCard }) => topCard.cardId === "EX9-018")!.stack[0]!.faceUp,
      ).toBe(false);
      expect(s.state.players[opponent]!.battleArea).toHaveLength(0);
      expect(s.state.players[opponent]!.deck.map(({ instanceId }) => instanceId)).toEqual([
        ...beforeDeck,
        ...(card === TOKEN ? [] : [targetId]),
      ]);
      expect(triggers.mock.calls.some(([event]) => event === "whenEffectAddsToDeck")).toBe(card !== TOKEN);
      expect(
        s.events.some(
          (event) =>
            event.kind === "cardsMoved" &&
            event.instanceIds.includes(targetId) &&
            (event.to === "deckBottom" || event.to === "deck"),
        ),
      ).toBe(card !== TOKEN);
      for (const player of s.state.players) {
        for (const zone of [player.hand, player.trash, player.security, player.eggDeck]) {
          expect(zone.some(({ instanceId }) => instanceId === targetId)).toBe(false);
        }
      }
      expect(s.engine.applyIntent(seat, { type: "surrender" })).toEqual({ ok: true });
      expect(s.state.gameOver).toBe(true);
      expect(s.state.players[opponent]!.deck.some(({ instanceId }) => instanceId === targetId)).toBe(card !== TOKEN);
      expect(
        finalRevealOf(s.state)
          .find((player) => player.seat === opponent)!
          .deck.some(({ cardId }) => cardId === card),
      ).toBe(card !== TOKEN);
    });
    it.each([
      { option: "ST2-16", sources: ["BT1-028"], destination: "hand" },
      { option: "ST1-16", sources: ["BT1-009"], destination: "deletion" },
      { option: "ST10-14", sources: ["BT1-045", "BT10-079"], destination: "security" },
    ])(`seat ${seat}: token removal to $destination stays outside every game zone`, async ({ option, sources }) => {
      const s = setupEngine(
        {
          [seat]: { battleArea: sources, hand: [{ card: option, as: "option" }] },
          [opponent]: { battleArea: [{ card: TOKEN, as: "target" }], security: ["BT1-046"], deck: ["BT1-046"] },
        },
        { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
      );
      s.state.turnSeat = seat;
      s.state.memory = 10;
      await s.ready();
      const targetId = s.inst("target").instanceId;
      const securityBefore = s.state.players[opponent]!.security.map(({ instanceId }) => instanceId);
      expect(s.engine.applyIntent(seat, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
        ok: true,
      });
      await settle();
      expect(s.state.players[opponent]!.battleArea).toHaveLength(0);
      for (const player of s.state.players) {
        for (const zone of [player.hand, player.deck, player.eggDeck, player.security, player.trash]) {
          expect(zone.some(({ instanceId }) => instanceId === targetId)).toBe(false);
        }
      }
      // A vanished token was never added to security, so Chaos Degradation's "If you do"
      // does not trash an unrelated existing security card.
      expect(s.state.players[opponent]!.security.map(({ instanceId }) => instanceId)).toEqual(securityBefore);
      expect(s.state.pendingDecision).toBeUndefined();
    });
    it.each([false, true])(
      `seat ${seat}: Rosemon token return pays processing condition, prevented=%s`,
      async (prevented) => {
        const s = setupEngine(
          {
            [seat]: { battleArea: [{ card: "BT26-050", as: "rosemon" }] },
            [opponent]: {
              battleArea: [{ card: TOKEN, as: "target", suspended: true }],
              security: ["BT1-046", "BT1-046", "BT1-046"],
              deck: ["BT1-046"],
            },
          },
          { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
        );
        s.state.turnSeat = seat;
        s.state.memory = 10;
        await s.ready();
        const targetId = s.inst("target").instanceId;
        if (prevented)
          await advance(s.engine).verb.restrict(s.perm("target").permanentId, "beReturned", EffectDuration.Permanent);
        expect(
          s.engine.applyIntent(seat, {
            type: "attack",
            attackerPermanentId: s.perm("rosemon").permanentId,
            target: { kind: "player" },
          }),
        ).toEqual({ ok: true });
        await settle(
          () => s.events.some((event) => event.kind === "attackEnded") && s.state.pendingDecision === undefined,
        );
        expect(s.state.players[opponent]!.security).toHaveLength(prevented ? 2 : 1);
        expect(s.state.players[opponent]!.battleArea.some(({ topCard }) => topCard.instanceId === targetId)).toBe(
          prevented,
        );
        expect(s.state.players[opponent]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-046"]);
        expect(s.state.players[opponent]!.trash.some(({ instanceId }) => instanceId === targetId)).toBe(false);
      },
    );
    it.each(["restriction", "replacement"] as const)(
      `seat ${seat}: prevented token leave (%s) retains field token`,
      async (prevention) => {
        const s = setupEngine(
          {
            [seat]: { hand: [{ card: "EX9-018", as: "metal" }], trash: ["BT1-048"] },
            [opponent]: { battleArea: [{ card: TOKEN, as: "target" }], deck: ["BT1-046"] },
          },
          { autoAcceptOptional: true, autoSelectCards: true },
        );
        s.state.turnSeat = seat;
        s.state.memory = 10;
        await s.ready();
        const permanentId = s.perm("target").permanentId;
        const tokenId = s.inst("target").instanceId;
        // Supplemental controls isolate the prevention seam; they are not printed token abilities.
        if (prevention === "restriction") {
          await advance(s.engine).verb.restrict(permanentId, "beReturned", EffectDuration.Permanent);
        } else {
          vi.spyOn(s.engine, "consultLeavePrevention").mockResolvedValue(new Set([permanentId]));
        }
        expect(s.engine.applyIntent(seat, { type: "playCard", instanceId: s.inst("metal").instanceId })).toEqual({
          ok: true,
        });
        await settle();
        expect(s.perm("target").topCard.instanceId).toBe(tokenId);
        expect(s.state.players[opponent]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-046"]);
        expect(s.state.pendingDecision).toBeUndefined();
      },
    );
  }

  it.each([false, true])("deck %s top routing removes token and keeps ordinary card ordering", async (toTop) => {
    const s = setupEngine({
      1: {
        battleArea: [
          { card: TOKEN, as: "token" },
          { card: "BT1-009", as: "regular" },
        ],
        deck: ["BT1-046"],
      },
    });
    const tokenId = s.inst("token").instanceId;
    const regularId = s.inst("regular").instanceId;
    await advance(s.engine).verb.returnToDeck([tokenId, regularId], { toTop });
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.map(({ cardId }) => cardId)).toEqual(
      toTop ? ["BT1-009", "BT1-046"] : ["BT1-046", "BT1-009"],
    );
    expect(
      s.events
        .filter((event) => event.kind === "cardsMoved")
        .flatMap((event) => (event.kind === "cardsMoved" ? event.instanceIds : [])),
    ).not.toContain(tokenId);
    expect(s.state.players[1]!.deck.some(({ instanceId }) => instanceId === regularId)).toBe(true);
  });
});
