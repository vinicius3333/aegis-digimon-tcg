import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../testkit/harness.js";

async function selectSecurityDracomon(
  s: EngineSetup,
  options: { autoSelectCards: boolean },
  candidates: string[],
  chosen: string[],
): Promise<void> {
  await settle(() => s.state.pendingDecision?.kind === "selectCards");
  const selection = s.decisions.at(-1)!.req;
  expect(selection).toMatchObject({
    kind: "selectCards",
    options: { candidateInstanceIds: candidates, min: 0, max: 1 },
  });
  // Respond explicitly to the Security picker; only automate the later On Play search.
  options.autoSelectCards = true;
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: selection.decisionId,
      response: { kind: "selectCards", instanceIds: chosen },
    }),
  ).toEqual({ ok: true });
}

describe("Discord 1557553612228665396: BT20-093 Security arena", () => {
  it.each(["hand", "trash", "decline", "skip"] as const)(
    "resolves a real security check through the turn loop (%s)",
    async (route) => {
      const options = { autoSelectCards: false };
      const s = setupEngine({ 0: {}, 1: {} }, options);
      layDevScenario("arena-bt20-dragon-gene-security", s.state, [BLUE_DECK, RED_DECK]);
      await s.ready();
      const human = s.state.players[0]!;
      const opponent = s.state.players[1]!;
      const optionId = human.security[0]!.instanceId;
      const handId = human.hand[0]!.instanceId;
      const trashId = human.trash[0]!.instanceId;
      const establishedId = human.battleArea[0]!.topCard.instanceId;
      const loop = s.engine.startTurnLoop();
      try {
        await settle(() => s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(0);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(1);
        expect(
          s.engine.applyIntent(1, {
            type: "attack",
            attackerPermanentId: opponent.battleArea[0]!.permanentId,
            target: { kind: "player" },
          }),
        ).toEqual({ ok: true });

        await settle(() => s.state.pendingDecision?.kind === "optional");
        const consent = s.decisions.at(-1)!;
        expect(consent.seat).toBe(0);
        expect(consent.req.sourceCardId).toBe("BT20-093");
        expect(human.battleArea.map((p) => p.topCard.instanceId)).toEqual([establishedId]);
        expect(
          s.engine.applyIntent(0, {
            type: "respondDecision",
            decisionId: consent.req.decisionId,
            response: { kind: "optional", accept: route !== "decline" },
          }),
        ).toEqual({ ok: true });

        if (route !== "decline") {
          await selectSecurityDracomon(
            s,
            options,
            [handId, trashId],
            route === "skip" ? [] : [route === "hand" ? handId : trashId],
          );
        }
        await settle(
          () => s.events.some((event) => event.kind === "attackEnded") && s.state.pendingDecision === undefined,
        );

        const expectedIds = [
          establishedId,
          optionId,
          ...(route === "hand" ? [handId] : route === "trash" ? [trashId] : []),
        ];
        expect(human.battleArea.map((p) => p.topCard.instanceId).sort()).toEqual(expectedIds.sort());
        expect(human.hand.some((card) => card.instanceId === handId)).toBe(route !== "hand");
        expect(human.trash.some((card) => card.instanceId === trashId)).toBe(route !== "trash");
        expect(human.trash.some((card) => card.instanceId === optionId)).toBe(false);
        expect(human.security).toHaveLength(0);
        expect(human.battleArea.find((p) => p.topCard.instanceId === optionId)?.placedByEffect).toBe(true);
        expect(s.state.memory).toBe(3);
        expect(
          s.events.some(
            (event) => event.kind === "effectResolved" && event.sourceCardId === "EX3-037" && event.timing === "OnPlay",
          ),
        ).toBe(route === "trash");
        const searchResults = route === "trash" ? ["BT20-023", "EX3-074"] : [];
        expect(human.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(searchResults));
      } finally {
        s.engine.applyIntent(1, { type: "surrender" });
        await loop;
      }
    },
  );
});
