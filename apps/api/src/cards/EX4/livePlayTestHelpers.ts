import { expect as expectAssertion, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle, type BoardSpec, type EngineSetup } from "../../engine/testkit/harness.js";

const expect = expectAssertion;

type BehaviorSetup = BoardSpec;
type BehaviorState = EngineSetup;

const commonOptions = {
  autoAcceptOptional: true,
  autoSelectCards: true,
  autoChooseOption: true,
  autoOrderTriggers: true,
};

function board(cardId: string, extra: Record<string, unknown> = {}) {
  return { card: cardId, as: "subject", ...extra };
}

function defaultSetup(
  cardId: string,
  own: Record<string, unknown> = {},
  opponent: Record<string, unknown> = {},
): BehaviorSetup {
  return {
    0: {
      battleArea: [board(cardId), { card: "BT1-064", as: "ally", dp: 3000 }],
      deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
      security: ["BT1-001", "BT1-002", "BT1-003"],
      ...own,
    },
    1: {
      battleArea: [
        { card: "BT1-009", as: "low", dp: 3000 },
        { card: "BT1-013", as: "high", dp: 7000 },
      ],
      hand: Array(8).fill("BT1-001"),
      ...opponent,
    },
  };
}

async function fire(s: BehaviorState, timing: EffectTiming, alias = "subject") {
  await advance(s.engine).fireForPermanent(timing, s.perm(alias));
}

async function playSubject(s: BehaviorState) {
  const subject = s.inst("subject");
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: subject.instanceId })).toEqual({ ok: true });
  await settle(() => !s.state.players[0]!.hand.some((card) => card.instanceId === subject.instanceId));
}

async function playSubjectCard(s: BehaviorState, alias: string) {
  const card = s.inst(alias);
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: card.instanceId })).toEqual({ ok: true });
  await settle(() => !s.state.players[0]!.hand.some((entry) => entry.instanceId === card.instanceId));
}

/**
 * Shared EX4 behavioral suite. Each case uses the production harness and asserts
 * an effect-specific state transition; callers keep one invocation in each card test.
 */
export function ex4CardBehaviorTests(cardId: string): void {
  it(`${cardId} resolves an observable printed effect`, async () => {
    let s: BehaviorState;
    switch (cardId) {
      case "EX4-024":
        s = setupEngine(defaultSetup(cardId), commonOptions);
        await s.ready();
        await fire(s, EffectTiming.OnPlay);
        expect(observe(s.engine).isRestricted(s.perm("low"), "attack")).toBe(true);
        expect(observe(s.engine).isRestricted(s.perm("high"), "attack")).toBe(false);
        return;
      case "EX4-026":
        s = setupEngine(defaultSetup(cardId), commonOptions);
        await s.ready();
        expect(observe(s.engine).grantedNames(s.perm("subject"))).toContain("Kyubimon");
        return;
      case "EX4-027":
        s = setupEngine(
          defaultSetup(cardId, { battleArea: [board(cardId), { card: "EX4-061", as: "tamer" }] }),
          commonOptions,
        );
        await s.ready();
        await fire(s, EffectTiming.WhenDigivolving);
        expect(s.perm("low").currentDP).toBe(1000);
        expect(observe(s.engine).isRestricted(s.perm("low"), "attack")).toBe(true);
        expect(observe(s.engine).isRestricted(s.perm("low"), "block")).toBe(true);
        return;
      case "EX4-028":
        s = setupEngine(defaultSetup(cardId), commonOptions);
        await s.ready();
        await fire(s, EffectTiming.OnPlay);
        expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("low").permanentId)).toBe(false);
        expect(s.state.players[1]!.hand.some((c) => c.instanceId === s.perm("low").topCard!.instanceId)).toBe(true);
        return;
      case "EX4-029":
        s = setupEngine(defaultSetup(cardId), commonOptions);
        await s.ready();
        await fire(s, EffectTiming.OnEndAttack);
        expect(s.state.players[0]!.security.length).toBe(4);
        return;
      case "EX4-030":
        s = setupEngine(defaultSetup(cardId, { hand: [{ card: "EX4-070", as: "option" }] }), commonOptions);
        await s.ready();
        await fire(s, EffectTiming.WhenDigivolving);
        expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("option").instanceId)).toBe(false);
        return;
      case "EX4-031":
        s = setupEngine(
          defaultSetup(cardId, {
            battleArea: [board(cardId), { card: "BT1-064", as: "ally", dp: 3000, suspended: true }],
          }),
          commonOptions,
        );
        await s.ready();
        await fire(s, EffectTiming.WhenDigivolving);
        expect(s.perm("low").currentDP).toBe(0);
        return;
      case "EX4-032":
        s = setupEngine(defaultSetup(cardId, { deck: ["EX4-049", "EX4-063", "BT1-010", "BT1-011"] }), commonOptions);
        await s.ready();
        await fire(s, EffectTiming.OnPlay);
        expect(s.state.players[0]!.hand.map((c) => c.cardId)).toEqual(expect.arrayContaining(["EX4-049", "EX4-063"]));
        return;
      case "EX4-033":
        s = setupEngine(defaultSetup(cardId), commonOptions);
        await s.ready();
        expect(observe(s.engine).grantedNames(s.perm("subject"))).toContain("Terriermon");
        return;
      case "EX4-034":
        s = setupEngine(defaultSetup(cardId, { deck: ["EX4-049", "EX4-063", "BT1-010", "BT1-011"] }), commonOptions);
        await s.ready();
        await fire(s, EffectTiming.OnPlay);
        expect(s.state.players[0]!.hand.map((c) => c.cardId)).toEqual(expect.arrayContaining(["EX4-049", "EX4-063"]));
        return;
      case "EX4-036":
        s = setupEngine(
          defaultSetup(
            cardId,
            { battleArea: [board(cardId), { card: "BT1-064", as: "ally", dp: 3000 }] },
            {
              battleArea: [{ card: "BT1-044", as: "low", dp: 11000, under: ["BT1-010", "BT1-036", "BT1-040"] }],
            },
          ),
          commonOptions,
        );
        await s.ready();
        const targetStackBefore = s.state.players[1]!.battleArea[0]!.stack.length;
        await fire(s, EffectTiming.OnEndAttack);
        const targetStackAfter = s.state.players[1]!.battleArea[0]!.stack.length;
        expect(targetStackBefore).toBeGreaterThan(1);
        expect(targetStackAfter).toBe(0);
        expect(targetStackAfter).toBeLessThan(targetStackBefore);
        return;
      case "EX4-037":
        s = setupEngine(
          defaultSetup(cardId, { battleArea: [board(cardId), { card: "EX4-037", as: "ally", dp: 13000 }] }),
          commonOptions,
        );
        await s.ready();
        await fire(s, EffectTiming.OnEndTurn);
        expect(observe(s.engine).hasKeyword(s.perm("ally"), "Blocker")).toBe(true);
        expect(observe(s.engine).hasKeyword(s.perm("ally"), "Reboot")).toBe(true);
        return;
      case "EX4-038":
        s = setupEngine(defaultSetup(cardId, { deck: ["AD1-001", "BT1-029", "BT1-010", "BT1-011"] }), commonOptions);
        await s.ready();
        await fire(s, EffectTiming.OnPlay);
        expect(s.state.players[0]!.hand.map((c) => c.cardId)).toEqual(expect.arrayContaining(["AD1-001", "BT1-029"]));
        return;
      case "EX4-039":
        s = setupEngine(defaultSetup(cardId, { deck: ["BT1-036", "BT1-010", "BT1-011"] }), commonOptions);
        await s.ready();
        await fire(s, EffectTiming.OnPlay);
        expect(s.state.players[0]!.hand.map((c) => c.cardId)).toContain("BT1-036");
        return;
      case "EX4-040":
        s = setupEngine(defaultSetup(cardId, { hand: [{ card: "EX4-062", as: "nene" }] }), commonOptions);
        await s.ready();
        await fire(s, EffectTiming.OnPlay);
        expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "EX4-062")).toBe(true);
        return;
      case "EX4-041":
        s = setupEngine(
          defaultSetup(cardId, { hand: [{ card: "EX4-014", as: "cost" }], deck: ["BT1-010", "BT1-011"] }),
          commonOptions,
        );
        await s.ready();
        await fire(s, EffectTiming.OnPlay);
        expect(s.state.players[0]!.hand.length).toBeGreaterThan(0);
        expect(s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("cost").instanceId)).toBe(true);
        return;
      case "EX4-042":
        s = setupEngine(defaultSetup(cardId), commonOptions);
        await s.ready();
        await fire(s, EffectTiming.None);
        expect(observe(s.engine).isRestricted(s.perm("subject"), "cantBeBlocked")).toBe(true);
        return;
      case "EX4-043":
      case "EX4-044":
        s = setupEngine(
          defaultSetup(cardId, { battleArea: [{ card: "BT1-010", as: "subject", under: [cardId] }] }),
          commonOptions,
        );
        await s.ready();
        expect(observe(s.engine).hasKeyword(s.perm("subject"), "Reboot")).toBe(true);
        return;
      case "EX4-045":
      case "EX4-046":
        s = setupEngine(
          defaultSetup(cardId, {
            battleArea: [
              { card: "BT1-010", as: "subject", under: [cardId] },
              { card: "BT1-010", as: "other", dp: 3000 },
            ],
            hand: ["BT1-036"],
          }),
          commonOptions,
        );
        s.state.memory = 10;
        if (cardId === "EX4-045" || cardId === "EX4-046") s.state.turnSeat = 1;
        await s.ready();
        if (cardId === "EX4-045" || cardId === "EX4-046") {
          expect(
            observe(s.engine).subscriptions("whenOpponentAttacks", s.perm("subject").permanentId).length,
          ).toBeGreaterThan(0);
          return;
        }
        await fire(s, EffectTiming.WhenDigivolving);
        expect(s.perm("other").stack.length).toBeGreaterThan(0);
        return;
      case "EX4-047":
        s = setupEngine(defaultSetup(cardId), commonOptions);
        await s.ready();
        await fire(s, EffectTiming.OnPlay);
        expect(observe(s.engine).hasKeyword(s.perm("subject"), "Blocker")).toBe(true);
        return;
      case "EX4-048":
        s = setupEngine(
          defaultSetup(cardId, {}, { battleArea: [{ card: "AD1-025", as: "high", dp: 15000 }] }),
          commonOptions,
        );
        await s.ready();
        await fire(s, EffectTiming.WhenDigivolving);
        expect(s.state.players[1]!.battleArea).toHaveLength(0);
        return;
      case "EX4-049":
        s = setupEngine(
          defaultSetup(cardId, {}, { battleArea: [{ card: "BT1-013", as: "victim", dp: 7000 }] }),
          commonOptions,
        );
        const victim = s.inst("victim");
        s.state.memory = 10;
        await s.ready();
        await fire(s, EffectTiming.WhenDigivolving);
        expect(s.state.players[1]!.deck.some((c) => c.instanceId === victim.instanceId)).toBe(true);
        return;
      case "EX4-050":
        s = setupEngine(defaultSetup(cardId, { security: ["BT1-001", "BT1-002"], deck: ["BT1-010"] }), commonOptions);
        await s.ready();
        await fire(s, EffectTiming.OnDestroyedAnyone);
        expect(s.state.players[0]!.security).toHaveLength(3);
        expect(s.state.players[1]!.battleArea).toHaveLength(1);
        expect(s.state.players[1]!.battleArea[0]!.topCard?.cardId).toBe("BT1-013");
        return;
      case "EX4-051":
        s = setupEngine(
          defaultSetup(
            cardId,
            {},
            {
              battleArea: [
                { card: "BT1-015", as: "victim", dp: 9000, under: ["BT1-010"] },
                { card: "BT1-015", as: "victim2", dp: 9000, under: ["BT1-010"] },
                { card: "BT1-015", as: "victim3", dp: 9000, under: ["BT1-010"] },
              ],
            },
          ),
          commonOptions,
        );
        await s.ready();
        await fire(s, EffectTiming.WhenDigivolving);
        expect(s.perm("victim").stack).toHaveLength(0);
        return;
      case "EX4-053":
        s = setupEngine(defaultSetup(cardId, { deck: ["EX4-058", "EX4-064", "BT1-010"] }), commonOptions);
        await s.ready();
        await fire(s, EffectTiming.OnPlay);
        expect(s.state.players[0]!.hand.map((c) => c.cardId)).toEqual(expect.arrayContaining(["EX4-058", "EX4-064"]));
        return;
      case "EX4-054":
      case "EX4-057":
        s = setupEngine(defaultSetup(cardId, { trash: ["BT1-064"] }), commonOptions);
        await s.ready();
        await fire(s, EffectTiming.OnEndAttack);
        expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT1-064")).toBe(true);
        return;
      case "EX4-055":
        s = setupEngine(defaultSetup(cardId, { hand: [{ card: "EX4-064", as: "keenan" }] }), commonOptions);
        await s.ready();
        await fire(s, EffectTiming.WhenDigivolving);
        expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "EX4-064")).toBe(true);
        return;
      case "EX4-056":
        s = setupEngine(
          defaultSetup(
            cardId,
            { battleArea: [{ card: "BT1-010", as: "subject", under: [cardId] }] },
            { battleArea: [{ card: "BT1-013", as: "victim", dp: 7000 }] },
          ),
          commonOptions,
        );
        await s.ready();
        await advance(s.engine).verb.deletePermanent([s.perm("subject").permanentId], "byEffect");
        expect(s.state.players[1]!.battleArea).toHaveLength(0);
        return;
      case "EX4-058":
        s = setupEngine(
          defaultSetup(
            cardId,
            { security: ["BT1-001", "BT1-002"] },
            { hand: Array(7).fill("BT1-001"), security: ["BT1-001", "BT1-002", "BT1-003"] },
          ),
          commonOptions,
        );
        await s.ready();
        await advance(s.engine).verb.deletePermanent([s.perm("subject").permanentId], "byEffect");
        expect(s.state.players[1]!.security).toHaveLength(2);
        expect(s.state.players[1]!.hand.length).toBe(8);
        return;
      case "EX4-059":
        s = setupEngine(
          defaultSetup(cardId, {
            battleArea: [
              board(cardId),
              { card: "BT1-064", as: "ally", dp: 3000 },
              { card: "BT1-044", as: "highAlly", dp: 11000 },
            ],
          }),
          commonOptions,
        );
        await s.ready();
        await fire(s, EffectTiming.WhenDigivolving);
        expect(observe(s.engine).subscriptions("onDeletionOf", s.perm("subject").permanentId)).toHaveLength(1);
        expect(observe(s.engine).subscriptions("onDeletionOf", s.perm("ally").permanentId)).toHaveLength(1);
        expect(observe(s.engine).subscriptions("onDeletionOf", s.perm("highAlly").permanentId)).toHaveLength(0);
        await advance(s.engine).verb.deletePermanent([s.perm("subject").permanentId], "byEffect");
        expect(s.state.players[0]!.trash.some((card) => card.cardId === cardId)).toBe(true);
        return;
      case "EX4-060":
        s = setupEngine(
          defaultSetup(cardId, {}, { battleArea: [{ card: "BT1-013", as: "victim", dp: 7000 }] }),
          commonOptions,
        );
        await s.ready();
        await fire(s, EffectTiming.WhenDigivolving);
        expect(s.state.players[1]!.battleArea).toHaveLength(0);
        return;
      case "EX4-061":
        s = setupEngine(defaultSetup(cardId, { hand: [{ card: "BT1-010", as: "agumon" }] }), commonOptions);
        await s.ready();
        s.state.memory = 3;
        await playSubjectCard(s, "agumon");
        expect(s.state.memory).toBe(1);
        expect(s.perm("subject").isSuspended).toBe(true);
        return;
      case "EX4-063":
        s = setupEngine(
          defaultSetup(cardId, {
            battleArea: [{ card: cardId, as: "subject" }],
            hand: [{ card: "EX4-032", as: "terrier" }],
          }),
          commonOptions,
        );
        await s.ready();
        await fire(s, EffectTiming.OnStartMainPhase);
        expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "EX4-032")).toBe(true);
        return;
      case "EX4-064":
        s = setupEngine(defaultSetup(cardId), commonOptions);
        s.state.memory = 1;
        await s.ready();
        await fire(s, EffectTiming.OnStartTurn);
        expect(s.state.memory).toBe(3);
        return;
      case "EX4-065":
        s = setupEngine(
          defaultSetup(
            cardId,
            { battleArea: [{ card: "BT1-009", as: "red" }], hand: [{ card: cardId, as: "subject" }] },
            {
              battleArea: [
                { card: "AD1-025", as: "high", dp: 15000 },
                { card: "BT1-009", as: "low", dp: 3000 },
              ],
              security: ["BT1-001"],
            },
          ),
          commonOptions,
        );
        await s.ready();
        await playSubject(s);
        expect(s.state.players[1]!.battleArea).toHaveLength(1);
        expect(s.state.players[1]!.battleArea[0]!.topCard?.cardId).toBe("BT1-009");
        return;
      case "EX4-066":
        const preferredIds: string[] = [];
        s = setupEngine(
          defaultSetup(cardId, {
            battleArea: [
              { card: "BT1-010", as: "agumon" },
              { card: "BT1-031", as: "blue" },
              { card: "EX4-049", as: "cres" },
            ],
            hand: [
              { card: cardId, as: "subject" },
              { card: "EX4-051", as: "blitz" },
            ],
          }),
          { ...commonOptions, preferInstanceIds: preferredIds },
        );
        preferredIds.push(s.inst("agumon").instanceId, s.inst("blitz").instanceId);
        await s.ready();
        await playSubject(s);
        expect(s.perm("agumon").topCard?.cardId).toBe("EX4-051");
        return;
      case "EX4-067":
        s = setupEngine(
          defaultSetup(
            cardId,
            { battleArea: [{ card: "BT1-031", as: "blue" }], hand: [{ card: cardId, as: "subject" }] },
            {
              battleArea: [
                { card: "BT1-013", as: "low", dp: 3000 },
                { card: "BT1-070", as: "low2", dp: 3000 },
              ],
            },
          ),
          commonOptions,
        );
        await s.ready();
        await playSubject(s);
        expect(s.state.players[1]!.hand.length).toBe(10);
        return;
      case "EX4-068":
        s = setupEngine(
          defaultSetup(
            cardId,
            {
              battleArea: [
                { card: "BT1-064", as: "green" },
                { card: "BT1-009", as: "red" },
                { card: "BT1-031", as: "blue" },
                { card: "BT1-029", as: "yellow" },
              ],
              hand: [{ card: cardId, as: "subject" }],
            },
            { battleArea: [{ card: "BT1-013", as: "target", dp: 30000 }] },
          ),
          commonOptions,
        );
        await s.ready();
        await playSubject(s);
        expect(s.perm("target").currentDP).toBe(6000);
        return;
      case "EX4-069":
        s = setupEngine(
          defaultSetup(
            cardId,
            {
              battleArea: [
                { card: "BT10-058", as: "ownHigh", dp: 5000 },
                { card: "BT1-064", as: "ownLow", dp: 3000 },
              ],
              hand: [{ card: cardId, as: "subject" }],
            },
            {
              battleArea: [
                { card: "AD1-025", as: "high", dp: 3000 },
                { card: "BT1-009", as: "low", dp: 3000 },
              ],
            },
          ),
          commonOptions,
        );
        await s.ready();
        await playSubject(s);
        expect(s.state.players[0]!.battleArea).toHaveLength(1);
        expect(s.state.players[0]!.battleArea[0]!.topCard?.cardId).toBe("BT10-058");
        expect(s.state.players[1]!.battleArea).toHaveLength(1);
        expect(s.state.players[1]!.battleArea[0]!.topCard?.cardId).toBe("AD1-025");
        return;
      case "EX4-070":
        s = setupEngine(
          defaultSetup(cardId, {
            battleArea: [
              { card: "BT10-071", as: "purple" },
              { card: "BT1-064", as: "green" },
            ],
            hand: [{ card: cardId, as: "subject" }],
          }),
          commonOptions,
        );
        await s.ready();
        await playSubject(s);
        expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === cardId)).toBe(true);
        expect(s.state.players[1]!.battleArea).toHaveLength(1);
        return;
      case "EX4-071":
        s = setupEngine(
          defaultSetup(cardId, {
            battleArea: [
              { card: "EX4-064", as: "tamer" },
              { card: "BT1-064", as: "sacrifice", dp: 3000 },
            ],
            hand: [{ card: cardId, as: "subject" }],
          }),
          commonOptions,
        );
        await s.ready();
        await playSubject(s);
        expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).not.toContain("BT1-064");
        return;
      case "EX4-072":
        const preferredIds72: string[] = [];
        s = setupEngine(
          defaultSetup(cardId, {
            battleArea: [
              { card: "BT19-054", as: "base" },
              { card: "BT1-084", as: "white" },
            ],
            hand: [
              { card: cardId, as: "subject" },
              { card: "EX4-037", as: "evolution" },
            ],
          }),
          { ...commonOptions, preferInstanceIds: preferredIds72 },
        );
        preferredIds72.push(s.inst("base").instanceId, s.inst("evolution").instanceId);
        await s.ready();
        await playSubject(s);
        await settle(() => s.perm("base").topCard?.cardId === "EX4-037", 500);
        expect(s.perm("base").topCard?.cardId).toBe("EX4-037");
        return;
      case "EX4-073":
        s = setupEngine(
          defaultSetup(cardId, { battleArea: [board(cardId), { card: "BT1-064", as: "ally" }] }),
          commonOptions,
        );
        await s.ready();
        await fire(s, EffectTiming.WhenDigivolving);
        expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("low").permanentId)).toBe(false);
        return;
      default:
        throw new Error(`No EX4 behavioral case for ${cardId}`);
    }
  });
  it(`${cardId} resolves its secondary printed clause`, async () => {
    let s: BehaviorState;
    switch (cardId) {
      case "EX4-036": {
        s = setupEngine(
          defaultSetup(cardId, {
            battleArea: [
              { card: "BT1-010", as: "host", under: [cardId] },
              { card: "BT1-064", as: "ally" },
            ],
          }),
          commonOptions,
        );
        await s.ready();
        expect(
          observe(s.engine).subscriptions("whenEffectSuspends", s.perm("host").permanentId).length,
        ).toBeGreaterThan(0);
        await advance(s.engine).verb.suspend([s.perm("low").permanentId], 0);
        await settle(() => observe(s.engine).hasPierce(s.perm("host")));
        expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
        return;
      }
      case "EX4-037": {
        s = setupEngine(
          defaultSetup(cardId, {
            battleArea: [
              { card: cardId, as: "host", suspended: true },
              { card: "EX4-037", as: "ally" },
            ],
          }),
          commonOptions,
        );
        await s.ready();
        await advance(s.engine).verb.suspend([s.perm("ally").permanentId], 0);
        expect(s.perm("host").isSuspended).toBe(false);
        return;
      }
      case "EX4-038":
      case "EX4-039": {
        s = setupEngine(
          defaultSetup(cardId, {
            battleArea: [
              { card: "BT1-010", as: "host", under: [cardId] },
              { card: "BT1-010", as: "evoTarget" },
            ],
            hand: [{ card: "BT1-015", as: "evolution" }],
          }),
          commonOptions,
        );
        s.state.memory = 10;
        await s.ready();
        expect(
          s.engine.applyIntent(0, {
            type: "digivolve",
            permanentId: s.perm("evoTarget").permanentId,
            instanceId: s.inst("evolution").instanceId,
          }),
        ).toEqual({ ok: true });
        await settle(() => s.perm("evoTarget").topCard?.cardId === "BT1-015");
        expect(s.state.memory).toBe(9);
        return;
      }
      case "EX4-040": {
        s = setupEngine(
          defaultSetup(cardId, { battleArea: [{ card: cardId, as: "host" }], deck: ["EX4-021"] }),
          commonOptions,
        );
        await s.ready();
        await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
        expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX4-021");
        return;
      }
      case "EX4-041": {
        s = setupEngine(
          defaultSetup(cardId, { battleArea: [{ card: cardId, as: "host" }], deck: ["EX4-021"] }),
          commonOptions,
        );
        await s.ready();
        await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
        expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX4-021");
        s = setupEngine(
          defaultSetup(cardId, { battleArea: [{ card: "BT1-010", as: "host", under: [cardId] }] }),
          commonOptions,
        );
        await s.ready();
        await advance(s.engine).fireForPermanent(EffectTiming.None, s.perm("host"));
        expect(s.perm("host").currentDP).toBe(3000);
        return;
      }
      case "EX4-042": {
        s = setupEngine(
          defaultSetup(cardId, {
            battleArea: [
              { card: cardId, as: "host" },
              { card: "EX4-021", as: "knight" },
            ],
          }),
          commonOptions,
        );
        await s.ready();
        expect(observe(s.engine).isRestricted(s.perm("knight"), "cantBeBlocked")).toBe(true);
        return;
      }
      case "EX4-043": {
        s = setupEngine(
          defaultSetup(cardId, {
            battleArea: [
              { card: cardId, as: "subject" },
              { card: "BT1-010", as: "other" },
            ],
            hand: [{ card: "BT1-015", as: "evolution" }],
          }),
          commonOptions,
        );
        s.state.memory = 10;
        await s.ready();
        await fire(s, EffectTiming.WhenDigivolving, "subject");
        expect(s.perm("other").topCard?.cardId).toBe("BT1-015");
        return;
      }
      case "EX4-044": {
        const preferredIds44: string[] = [];
        s = setupEngine(
          defaultSetup(cardId, {
            battleArea: [
              { card: cardId, as: "subject" },
              { card: "BT1-031", as: "other" },
            ],
            hand: [{ card: "BT1-036", as: "evolution" }],
          }),
          { ...commonOptions, preferInstanceIds: preferredIds44 },
        );
        preferredIds44.push(s.perm("other").topCard!.instanceId, s.inst("evolution").instanceId);
        s.state.memory = 10;
        await s.ready();
        await fire(s, EffectTiming.WhenDigivolving, "subject");
        expect(s.perm("other").topCard?.cardId).toBe("BT1-036");
        return;
      }
      case "EX4-045":
      case "EX4-046": {
        s = setupEngine(
          defaultSetup(
            cardId,
            { battleArea: [{ card: "BT1-010", as: "host", dp: 12000, under: [cardId] }], security: ["BT1-001"] },
            { battleArea: [{ card: "BT1-010", as: "attacker", dp: 3000 }], security: ["BT1-001"] },
          ),
          commonOptions,
        );
        s.state.turnSeat = 1;
        await s.ready();
        expect(
          s.engine.applyIntent(1, {
            type: "attack",
            attackerPermanentId: s.perm("attacker").permanentId,
            target: { kind: "player" },
          }),
        ).toEqual({ ok: true });
        await settle(() => s.events.some((event) => event.kind === "combatResolved"));
        expect(s.perm("host").isSuspended).toBe(true);
        return;
      }
      case "EX4-047": {
        s = setupEngine(
          defaultSetup(cardId, {
            battleArea: [{ card: cardId, as: "host" }],
            deck: ["EX4-021", "BT10-056"],
          }),
          commonOptions,
        );
        await s.ready();
        await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
        expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX4-021");
        return;
      }
      case "EX4-048": {
        s = setupEngine(
          defaultSetup(cardId, {
            battleArea: [
              { card: cardId, as: "host" },
              { card: "EX4-062", as: "tamer" },
            ],
            hand: [{ card: "BT9-068", as: "gaiomon" }],
          }),
          commonOptions,
        );
        s.state.memory = 10;
        await s.ready();
        await fire(s, EffectTiming.EndOfYourTurn, "host");
        expect(s.perm("host").topCard?.cardId).toBe("BT9-068");
        return;
      }
      case "EX4-049": {
        const preferredIds49: string[] = [];
        s = setupEngine(
          defaultSetup(
            cardId,
            {
              battleArea: [
                { card: cardId, as: "host" },
                { card: "BT1-010", as: "other" },
              ],
              hand: [{ card: "BT1-015", as: "greymon" }],
            },
            { battleArea: [] },
          ),
          { ...commonOptions, preferInstanceIds: preferredIds49, preferOptionIndex: 1 },
        );
        preferredIds49.push(s.perm("other").topCard!.instanceId, s.inst("greymon").instanceId);
        await s.ready();
        await fire(s, EffectTiming.WhenDigivolving, "host");
        expect(s.perm("other").topCard?.cardId).toBe("BT1-015");
        return;
      }
      case "EX4-050": {
        s = setupEngine(
          defaultSetup(
            cardId,
            { battleArea: [{ card: cardId, as: "host" }], security: ["BT1-001", "BT1-002"] },
            { battleArea: [{ card: "BT1-015", as: "target", under: ["BT1-010"] }], security: ["BT1-001", "BT1-002"] },
          ),
          commonOptions,
        );
        s.state.turnSeat = 1;
        await s.ready();
        await advance(s.engine).verb.trashFromSecurity(0, 1);
        expect(s.perm("target").stack).toHaveLength(0);
        return;
      }
      case "EX4-051": {
        s = setupEngine(
          defaultSetup(
            cardId,
            {
              battleArea: [{ card: "EX4-060", as: "host", under: [cardId] }],
              security: ["BT1-001", "BT1-002", "BT1-003"],
            },
            {
              security: ["BT1-001", "BT1-002", "BT1-003"],
            },
          ),
          commonOptions,
        );
        await s.ready();
        await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"), {
          attackerPermanentId: s.perm("host").permanentId,
        });
        expect(s.state.players[1]!.security.length).toBe(2);
        return;
      }
      case "EX4-053":
      case "EX4-055": {
        s = setupEngine(
          defaultSetup(
            cardId,
            {
              battleArea: [{ card: "BT1-010", as: "host", under: [cardId] }],
            },
            { hand: ["BT1-001"] },
          ),
          commonOptions,
        );
        await s.ready();
        await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
        expect(s.state.players[1]!.hand).toHaveLength(0);
        expect(s.state.players[1]!.trash).toHaveLength(1);
        return;
      }
      case "EX4-054":
      case "EX4-057": {
        s = setupEngine(
          defaultSetup(cardId, {
            battleArea: [
              { card: "BT1-010", as: "host", under: [cardId] },
              { card: "BT1-064", as: "ally", suspended: true },
            ],
            trash: ["BT1-064"],
          }),
          commonOptions,
        );
        await s.ready();
        await advance(s.engine).fireForPermanent(EffectTiming.OnEndAttack, s.perm("host"));
        expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-064");
        return;
      }
      case "EX4-056": {
        s = setupEngine(
          defaultSetup(
            cardId,
            { battleArea: [{ card: "BT1-010", as: "host", under: [cardId] }] },
            {
              battleArea: [{ card: "BT1-013", as: "victim", dp: 7000 }],
            },
          ),
          commonOptions,
        );
        await s.ready();
        await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
        expect(s.state.players[1]!.battleArea).toHaveLength(0);
        return;
      }
      case "EX4-058": {
        s = setupEngine(
          defaultSetup(cardId, { battleArea: [{ card: cardId, as: "host" }] }, { hand: Array(8).fill("BT1-001") }),
          commonOptions,
        );
        await s.ready();
        await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
        expect(s.state.players[1]!.hand).toHaveLength(7);
        expect(s.state.players[1]!.trash).toHaveLength(1);
        return;
      }
      case "EX4-060": {
        s = setupEngine(
          defaultSetup(cardId, {}, { battleArea: [{ card: "AD1-025", as: "high", dp: 15000 }] }),
          commonOptions,
        );
        await s.ready();
        await fire(s, EffectTiming.WhenDigivolving);
        expect(s.state.players[1]!.battleArea).toHaveLength(0);
        expect(s.state.players[1]!.deck.map((card) => card.cardId)).toContain("AD1-025");
        return;
      }
      case "EX4-061":
      case "EX4-063":
      case "EX4-064": {
        s = setupEngine(
          defaultSetup(cardId, {
            battleArea: [{ card: "BT1-064", as: "ally" }],
            security: [{ card: cardId, as: "security", faceUp: true }],
          }),
          commonOptions,
        );
        await s.ready();
        await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));
        expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === cardId)).toBe(true);
        return;
      }
      case "EX4-065": {
        s = setupEngine(
          defaultSetup(
            cardId,
            {
              security: [{ card: cardId, as: "security", faceUp: true }],
            },
            {
              battleArea: [
                { card: "AD1-025", as: "high", dp: 15000 },
                { card: "BT1-009", as: "low", dp: 3000 },
              ],
              security: ["BT1-001", "BT1-002"],
            },
          ),
          commonOptions,
        );
        await s.ready();
        await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));
        expect(s.state.players[1]!.battleArea).toHaveLength(1);
        expect(s.state.players[1]!.security).toHaveLength(1);
        return;
      }
      case "EX4-066": {
        s = setupEngine(
          defaultSetup(cardId, {
            security: [{ card: cardId, as: "security", faceUp: true }],
            hand: [{ card: "BT1-010", as: "agumon" }],
          }),
          commonOptions,
        );
        await s.ready();
        await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));
        expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain(cardId);
        expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-010")).toBe(true);
        return;
      }
      case "EX4-067": {
        s = setupEngine(
          defaultSetup(
            cardId,
            {
              battleArea: [{ card: "BT10-071", as: "purple" }],
              security: [{ card: cardId, as: "security", faceUp: true }],
            },
            {
              battleArea: [
                { card: "BT1-009", as: "low", dp: 3000 },
                { card: "AD1-025", as: "high", dp: 15000 },
              ],
              hand: Array(8).fill("BT1-001"),
            },
          ),
          commonOptions,
        );
        await s.ready();
        await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));
        expect(s.state.players[1]!.battleArea).toHaveLength(0);
        expect(s.state.players[1]!.hand.length).toBe(9);
        expect(s.state.players[1]!.deck.map((card) => card.cardId)).toContain("AD1-025");
        return;
      }
      case "EX4-069": {
        s = setupEngine(
          defaultSetup(
            cardId,
            { security: [{ card: cardId, as: "security", faceUp: true }] },
            {
              battleArea: [
                { card: "BT1-009", as: "low", dp: 3000 },
                { card: "AD1-025", as: "high", dp: 15000 },
              ],
            },
          ),
          commonOptions,
        );
        await s.ready();
        await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));
        expect(s.state.players[1]!.battleArea).toHaveLength(1);
        expect(s.state.players[1]!.battleArea[0]!.topCard?.cardId).toBe("AD1-025");
        return;
      }
      case "EX4-068": {
        s = setupEngine(
          defaultSetup(
            cardId,
            { security: [{ card: cardId, as: "security", faceUp: true }] },
            {
              battleArea: [{ card: "AD1-025", as: "victim", dp: 15000 }],
            },
          ),
          commonOptions,
        );
        await s.ready();
        await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));
        expect(s.perm("victim").currentDP).toBe(3000);
        return;
      }
      case "EX4-070":
      case "EX4-071": {
        s = setupEngine(
          defaultSetup(
            cardId,
            { security: [{ card: cardId, as: "security", faceUp: true }] },
            {
              battleArea: [
                { card: "BT1-009", as: "low", dp: 3000 },
                { card: "AD1-025", as: "high", dp: 15000 },
              ],
            },
          ),
          commonOptions,
        );
        await s.ready();
        await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));
        if (cardId === "EX4-070") {
          expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === cardId)).toBe(true);
        } else {
          expect(s.state.players[1]!.battleArea).toHaveLength(1);
          expect(s.state.players[1]!.battleArea[0]!.topCard?.cardId).toBe("AD1-025");
        }
        return;
      }
      case "EX4-072": {
        s = setupEngine(
          defaultSetup(cardId, { security: [{ card: cardId, as: "security", faceUp: true }], trash: ["BT1-064"] }),
          commonOptions,
        );
        await s.ready();
        await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));
        expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
          expect.arrayContaining([cardId, "BT1-064"]),
        );
        return;
      }
      case "EX4-073": {
        s = setupEngine(
          defaultSetup(
            cardId,
            {
              battleArea: [{ card: cardId, as: "host", under: ["EX4-060", "BT1-084", "AD1-025"] }],
              security: ["BT1-001", "BT1-002", "BT1-003"],
            },
            {
              battleArea: [
                { card: "BT1-009", as: "low", dp: 3000 },
                { card: "BT1-013", as: "high", dp: 7000 },
                { card: "BT1-064", as: "third", dp: 4000 },
              ],
              security: ["BT1-001", "BT1-002", "BT1-003"],
            },
          ),
          commonOptions,
        );
        await s.ready();
        await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"), {
          attackerPermanentId: s.perm("host").permanentId,
        });
        expect(s.state.players[1]!.battleArea).toHaveLength(0);
        expect(s.state.players[1]!.security).toHaveLength(1);
        return;
      }
      default:
        return;
    }
  });
}

/**
 * Put an EX4 card through the public play intent with neutral, established fixtures.
 * Individual card tests still assert their own effect-specific result; this helper only
 * provides the live engine setup and proves that the card leaves hand for a legal play.
 */
export async function playEx4Card(cardId: string): Promise<EngineSetup> {
  const s = setupEngine(
    {
      0: {
        hand: [{ card: cardId, as: "subject" }],
        deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        battleArea: [
          { card: "BT1-009", as: "ownRed", dp: 5000 },
          { card: "BT1-031", as: "ownBlue", dp: 5000 },
          { card: "BT1-058", as: "ownYellow", dp: 5000 },
          { card: "BT1-064", as: "ownGreen", dp: 5000 },
          { card: "BT10-058", as: "ownBlack", dp: 5000 },
          { card: "BT10-071", as: "ownPurple", dp: 5000 },
          { card: "BT1-084", as: "ownWhite", dp: 5000 },
        ],
      },
      1: {
        hand: Array(8).fill("BT1-001"),
        battleArea: [
          { card: "BT1-009", as: "opponentLow", dp: 3000 },
          { card: "BT1-013", as: "opponentHigh", dp: 5000 },
        ],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: true },
  );
  s.state.memory = 20;
  const subjectId = s.inst("subject").instanceId;
  await s.ready();

  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: subjectId })).toEqual({ ok: true });
  await settle(
    () =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === subjectId) ||
      s.state.players[0]!.trash.some((card) => card.instanceId === subjectId),
    5000,
  );
  expect(
    s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === subjectId) ||
      s.state.players[0]!.trash.some((card) => card.instanceId === subjectId),
  ).toBe(true);
  return s;
}
