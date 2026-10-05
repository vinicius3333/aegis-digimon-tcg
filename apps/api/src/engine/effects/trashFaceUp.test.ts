import { describe, expect, it } from "vitest";
import { Zone, type GameState } from "@aegis/shared";
import { installVisibilityPort } from "../state/access.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import "../../cards/index.js";

/** Record each card's face state at the moment the visibility port learns it entered trash. */
function watchTrashArrivals(state: GameState): Map<string, boolean> {
  const faceUpOnArrival = new Map<string, boolean>();
  for (const player of state.players) {
    installVisibilityPort(player, (_owner, zone, card) => {
      if (zone === Zone.Trash) faceUpOnArrival.set(card.instanceId, card.faceUp);
    });
  }
  return faceUpOnArrival;
}

describe("trash is public: every card enters it face up", () => {
  it.each(["battle", "effect"] as const)(
    "Discord 1556527556319252540: hidden sources of a host deleted by %s are revealed on arrival in trash",
    async (cause) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT1-080", as: "attacker", under: ["BT1-009"] }, "BT1-009"],
            hand: [{ card: "ST1-16", as: "gaiaForce" }],
          },
          1: {
            battleArea: [
              {
                card: "EX9-018",
                as: "metal",
                suspended: true,
                under: ["BT2-005", { card: "EX13-046", as: "hidden", faceUp: false }],
              },
            ],
          },
        },
        { autoSelectCards: true, autoOrderTriggers: true },
      );
      s.state.memory = 10;
      const arrivals = watchTrashArrivals(s.state);
      await s.ready();
      expect(
        s.engine.applyIntent(
          0,
          cause === "battle"
            ? {
                type: "attack",
                attackerPermanentId: s.perm("attacker").permanentId,
                target: { kind: "permanent", permanentId: s.perm("metal").permanentId },
              }
            : {
                type: "playCard",
                instanceId: s.inst("gaiaForce").instanceId,
              },
        ),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.battleArea.length === 0);
      await settle();
      const trash = [...s.state.players[1]!.trash];
      expect(trash.map((card) => card.cardId)).toEqual(["BT2-005", "EX13-046", "EX9-018"]);
      expect(trash.every((card) => card.faceUp)).toBe(true);
      expect(trash.every((card) => arrivals.get(card.instanceId) === true)).toBe(true);
      expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "EX13-046")).toBe(
        false,
      );
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it.each([false, true])(
    "Link from the field reveals a shed source in trash (source initially faceUp=%s)",
    async (faceUp) => {
      const s = setupEngine({
        0: {
          battleArea: [
            { card: "BT21-009", as: "recipient" },
            { card: "BT21-009", as: "linkSource", under: [{ card: "BT1-009", as: "shed", faceUp }] },
          ],
        },
      });
      s.state.memory = 10;
      const arrivals = watchTrashArrivals(s.state);
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "linkCard",
          instanceId: s.inst("linkSource").instanceId,
          targetPermanentId: s.perm("recipient").permanentId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("recipient").linked.length === 1);
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("shed").instanceId]);
      expect(arrivals.get(s.inst("shed").instanceId)).toBe(true);
      expect(s.state.players[0]!.trash[0]!.faceUp).toBe(true);
    },
  );

  it("placing EX2-028 under another Digimon reveals its shed sources in trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-028", as: "attacker", under: [{ card: "BT1-009", as: "shed", faceUp: false }] },
            { card: "BT1-080", as: "recipient" },
          ],
        },
        1: { security: ["BT2-034"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const arrivals = watchTrashArrivals(s.state);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "attackEnded"));
    expect(s.perm("recipient").stack.map((card) => card.instanceId)).toEqual([s.inst("attacker").instanceId]);
    expect(arrivals.get(s.inst("shed").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash[0]!.faceUp).toBe(true);
  });

  it("Discord 1555363063300096090: a face-down hand card trashed as a cost reaches the opponent face up", async () => {
    const s = setupEngine({ 0: {}, 1: { hand: [{ card: "BT1-083", as: "drawn" }] } });
    const drawn = s.inst("drawn");
    // The draw-phase draw leaves the deck's face-down flag on the card in hand.
    drawn.faceUp = false;
    const arrivals = watchTrashArrivals(s.state);

    await advance(s.engine).verb.trash([drawn.instanceId]);

    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(drawn.instanceId);
    expect(arrivals.get(drawn.instanceId)).toBe(true);
  });

  it("an Option in the battle area and its stack enter trash face up", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-090", as: "option", under: ["BT1-091"] }] }, 1: {} });
    const option = s.perm("option");
    const optionTop = option.topCard;
    const stackCard = option.stack[0]!;
    const arrivals = watchTrashArrivals(s.state);

    await advance(s.engine).verb.trash([optionTop.instanceId]);

    expect(arrivals.get(optionTop.instanceId)).toBe(true);
    expect(arrivals.get(stackCard.instanceId)).toBe(true);
  });

  it("digivolution cards are face up when the opponent's view learns they entered trash", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-012", as: "host", under: ["BT1-009"] }] }, 1: {} });
    const host = s.perm("host");
    const source = host.stack[0]!;
    source.faceUp = false;
    const arrivals = watchTrashArrivals(s.state);

    await advance(s.engine).verb.trashDigivolutionCards(host.permanentId, [source.instanceId]);

    expect(arrivals.get(source.instanceId)).toBe(true);
  });
});
