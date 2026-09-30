import { describe, expect, it } from "vitest";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import {
  activateDelay,
  delayDigivolvesThroughAlternateCondition,
  memorySpent,
  setupTraining,
} from "../P/qaRulings2.testSupport.js";

export interface BondRulingSpec {
  cardId: string;
  name: string;
  rookie: string;
  scramble: string;
  training: string;
  qno: { requirement: string; blast: string; blastAfterSecurityLoss: string; delay: string };
}

const SECURITY_ATTACKER = "LM-021";
const ATTACKER_TAMER = "BT1-085";

async function openCounterWindow(
  spec: BondRulingSpec,
  securityCount: number,
  attacker: string[],
): Promise<EngineSetup> {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: spec.rookie, as: "rookie" }],
        hand: [{ card: spec.cardId, as: "bond" }],
        security: securityCount,
      },
      1: { battleArea: [{ card: attacker[0]!, as: "attacker" }, ...attacker.slice(1)] },
    },
    { autoDeclineOptional: true },
  );
  s.state.turnSeat = 1;
  s.state.memory = 2;
  await s.ready();
  expect(
    s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle();
  return s;
}

function blastDigivolve(s: EngineSetup) {
  return s.engine.applyIntent(0, {
    type: "digivolve",
    instanceId: s.inst("bond").instanceId,
    permanentId: s.perm("rookie").permanentId,
    useBlastDigivolve: true,
  });
}

export function describeBondRulings(spec: BondRulingSpec): void {
  describe(`${spec.cardId} ${spec.name} — KB Q&A rulings`, () => {
    it(`treats the security-gated [${spec.rookie}] route as a standard digivolution requirement an effect digivolution can use (${spec.qno.requirement})`, async () => {
      for (const securityCount of [2, 3]) {
        const s = setupEngine(
          {
            0: {
              battleArea: [{ card: spec.rookie, as: "rookie" }],
              hand: [
                { card: spec.scramble, as: "scramble" },
                { card: spec.cardId, as: "bond" },
              ],
              security: securityCount,
            },
          },
          { autoAcceptOptional: true, autoSelectCards: true },
        );
        s.state.memory = 5;
        await s.ready();

        expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("scramble").instanceId })).toEqual({
          ok: true,
        });
        await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.hand.length < 2, 2000);

        expect(s.perm("rookie").topCard.cardId, `${securityCount} security`).toBe(
          securityCount <= 2 ? spec.cardId : spec.rookie,
        );
        expect(s.state.memory).toBe(3);
      }
    });

    it(`<Blast Digivolve>s from [${spec.rookie}] when an opponent attacks while you have 2 or fewer security cards (${spec.qno.blast})`, async () => {
      const low = await openCounterWindow(spec, 2, ["BT1-009"]);
      expect(blastDigivolve(low)).toEqual({ ok: true });
      await settle(() => low.perm("rookie").topCard.cardId === spec.cardId);
      expect(low.perm("rookie").topCard.cardId).toBe(spec.cardId);
      expect(low.state.memory).toBe(2);

      const high = await openCounterWindow(spec, 3, ["BT1-009"]);
      expect(blastDigivolve(high)).not.toEqual({ ok: true });
      expect(high.perm("rookie").topCard.cardId).toBe(spec.rookie);
    });

    it(`<Blast Digivolve>s when an attack effect drops security from 3 to 2 before the Counter timing (${spec.qno.blastAfterSecurityLoss})`, async () => {
      const s = await openCounterWindow(spec, 3, [SECURITY_ATTACKER, ATTACKER_TAMER]);
      expect(s.state.players[0]!.security).toHaveLength(2);

      expect(blastDigivolve(s)).toEqual({ ok: true });
      await settle(() => s.perm("rookie").topCard.cardId === spec.cardId);
      expect(s.perm("rookie").topCard.cardId).toBe(spec.cardId);
    });

    it(`an effect such as ${spec.training}'s <Delay> digivolves [${spec.rookie}] into this card at 2 or fewer security cards (${spec.qno.delay})`, async () => {
      await delayDigivolvesThroughAlternateCondition(
        spec.training,
        { battleArea: [{ card: spec.rookie, as: "host" }], hand: [{ card: spec.cardId, as: "target" }], security: 2 },
        {},
        1,
        spec.cardId,
      );

      const s = await setupTraining(spec.training, {
        battleArea: [{ card: spec.rookie, as: "host" }],
        hand: [{ card: spec.cardId, as: "target" }],
        security: 3,
      });
      await activateDelay(s);
      expect(s.perm("host").topCard.cardId).toBe(spec.rookie);
      expect(memorySpent(s)).toBe(0);
    });
  });
}
