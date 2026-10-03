import { describe, expect, it } from "vitest";
import type { Permanent } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";

export interface ScrambleRulingSpec {
  cardId: string;
  name: string;
  qno: {
    requirements: string;
    burstOrDna: string;
    tamer: string;
    delayWithoutTarget?: string;
    delayMustReturn: string;
  };
  rookie: string;
  champion: string;
  ultimate: string;
  dna: { card: string; host: string; partner: string };
  burst?: { card: string; host: string; tamer: string };
  tamer: { card: string; onto: string };
  smallInTrash: string;
  offColorInTrash: string;
}

const SCRAMBLE_COST = 2;
const STARTING_MEMORY = 10;

function topIds(s: EngineSetup): string[] {
  return s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId);
}

function stackIds(permanent: Permanent): string[] {
  return [...permanent.stack, permanent.topCard].map((card) => card.cardId);
}

async function playScramble(s: EngineSetup, cardId: string): Promise<void> {
  s.state.memory = STARTING_MEMORY;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("scramble").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => topIds(s).includes(cardId) && s.state.pendingDecision === undefined, 2000);
}

async function runStartOfTurn(s: EngineSetup): Promise<void> {
  s.state.players[0]!.battleArea.find(
    (permanent) => permanent.topCard.cardId === s.inst("scramble").cardId,
  )!.placedByEffect = true;
  s.state.isFirstPlayersFirstTurn = true;
  const turn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(0);
  advance(s.engine).endMainPhaseIfOpen(0);
  await turn;
}

export function describeScrambleRulings(spec: ScrambleRulingSpec): void {
  const { cardId, qno } = spec;

  describe(`${cardId} ${spec.name} — KB Q&A rulings`, () => {
    it(`[Main] digivolves only into a card whose digivolution requirements are met (${qno.requirements})`, async () => {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: spec.rookie, as: "host" }],
            hand: [
              { card: cardId, as: "scramble" },
              { card: spec.ultimate, as: "ultimate" },
              { card: spec.champion, as: "champion" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
      );
      preferred.push(s.inst("ultimate").instanceId);
      await s.ready();

      await playScramble(s, cardId);

      expect(s.perm("host").topCard.cardId).toBe(spec.champion);
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("ultimate").instanceId);
      const offered = s.decisions.flatMap(({ req }) => req.options?.candidateInstanceIds ?? []);
      expect(offered).not.toContain(s.inst("ultimate").instanceId);
    });

    it(`[Main] digivolves 1 Digimon normally and never DNA digivolves (${qno.burstOrDna})`, async () => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: spec.dna.host, as: "host" },
              { card: spec.dna.partner, as: "partner" },
            ],
            hand: [
              { card: cardId, as: "scramble" },
              { card: spec.dna.card, as: "jogress" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();

      await playScramble(s, cardId);

      expect(stackIds(s.perm("host"))).toEqual([spec.dna.host, spec.dna.card]);
      expect(stackIds(s.perm("partner"))).toEqual([spec.dna.partner]);
      expect(s.perm("partner").permanentId).not.toBe(s.perm("host").permanentId);
      expect(s.state.memory).toBe(STARTING_MEMORY - SCRAMBLE_COST - 1);
    });

    // eslint-disable-next-line vitest/no-conditional-tests -- Only fixtures with a Burst Mode route register this ruling.
    if (spec.burst !== undefined) {
      const burst = spec.burst;
      it(`[Main] digivolves into a Burst Mode card by its normal cost, not by burst digivolution (${qno.burstOrDna})`, async () => {
        const s = setupEngine(
          {
            0: {
              battleArea: [
                { card: burst.host, as: "host" },
                { card: burst.tamer, as: "tamer" },
              ],
              hand: [
                { card: cardId, as: "scramble" },
                { card: burst.card, as: "burstMode" },
              ],
            },
          },
          { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1 },
        );
        await s.ready();

        await playScramble(s, cardId);

        expect(s.decisions.some(({ req }) => req.options?.digivolveCostChoice !== undefined)).toBe(false);
        expect(s.perm("host").topCard.cardId).toBe(burst.card);
        expect(topIds(s)).toContain(burst.tamer);
        expect(s.state.players[0]!.hand.some((card) => card.cardId === burst.tamer)).toBe(false);
        expect(s.state.memory).toBe(STARTING_MEMORY - SCRAMBLE_COST - 2);
      });
    }

    it(`[Main] can't digivolve a Tamer, even into a card that treats a Tamer as a Digimon (${qno.tamer})`, async () => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: spec.tamer.card, as: "tamer" }],
            hand: [
              { card: cardId, as: "scramble" },
              { card: spec.tamer.onto, as: "onto" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();

      await playScramble(s, cardId);

      expect(s.perm("tamer").topCard.cardId).toBe(spec.tamer.card);
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("onto").instanceId);
      expect(s.state.memory).toBe(STARTING_MEMORY - SCRAMBLE_COST);

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("tamer").permanentId,
          instanceId: s.inst("onto").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("tamer").topCard.cardId === spec.tamer.onto, 2000);
      expect(s.perm("tamer").topCard.cardId).toBe(spec.tamer.onto);
    });

    // eslint-disable-next-line vitest/no-conditional-tests -- This optional published ruling applies only to its supplied fixtures.
    if (qno.delayWithoutTarget !== undefined) {
      it(`<Delay> activates even with no matching Digimon card in the trash (${qno.delayWithoutTarget})`, async () => {
        const s = setupEngine(
          {
            0: {
              battleArea: [{ card: cardId, as: "scramble" }],
              trash: [{ card: spec.offColorInTrash, as: "offColor" }],
            },
            1: { battleArea: ["BT1-010"] },
          },
          { autoAcceptOptional: true, autoSelectCards: true },
        );
        await s.ready();

        await runStartOfTurn(s);

        expect(topIds(s)).not.toContain(cardId);
        expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
          expect.arrayContaining([cardId, spec.offColorInTrash]),
        );
        expect(s.state.players[0]!.deck).toHaveLength(0);
      });
    }

    it(`<Delay> must return the only matching Digimon card, leaving nothing to play (${qno.delayMustReturn})`, async () => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: cardId, as: "scramble" }], trash: [{ card: spec.smallInTrash, as: "small" }] },
          1: { battleArea: ["BT1-010"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();

      await runStartOfTurn(s);

      expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("small").instanceId]);
      expect(s.state.players[0]!.battleArea).toHaveLength(0);
      expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual([cardId]);
    });
  });
}
