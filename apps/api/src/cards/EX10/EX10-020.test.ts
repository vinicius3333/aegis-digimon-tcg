import { EffectDuration, EffectTiming, Zone, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "./EX10-020.js";
import { validateDigivolve, type DigivolveIntent } from "../../engine/actions/digivolve.js";
import { ContinuousEffectLedger } from "../../engine/effects/continuous.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

const CARD_ID = "EX10-020";

function onField(s: ReturnType<typeof setupEngine>, instanceId: string): boolean {
  return s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === instanceId);
}

async function fireEndTurn(s: ReturnType<typeof setupEngine>): Promise<void> {
  s.state.turnSeat = 0;
  await advance(s.engine).fireGlobal(EffectTiming.OnEndTurn);
}

describe("EX10-020 Puppetmon", () => {
  it("records the exact catalog and complete compiled clauses", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Green"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Puppet", "Dark Masters"],
    });
    expect(runtimeCompiledCard(CARD_ID)).toMatchObject({ coverage: "full", residual: [] });
  });

  it("plays itself from hand for 6 under the Dark Masters-only board condition", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX10-020", as: "puppetmon" }], battleArea: ["BT15-027"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const entries = JSON.parse(s.inst("puppetmon").activatableEffectsJson || "[]") as Array<{
      effectKey: string;
      instanceId: string;
    }>;
    const entry = entries.find(({ instanceId }) => instanceId === s.inst("puppetmon").instanceId);
    expect(entry).toBeDefined();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("puppetmon").instanceId,
        effectKey: entry!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX10-020"));
    await settle();
    expect(s.state.memory).toBe(0);
    await settle(() => false, 200);
    await fireEndTurn(s);
    await settle(() => !onField(s, s.inst("puppetmon").instanceId));
    expect(s.state.players[0]!.security).toContainEqual(expect.objectContaining({ cardId: CARD_ID, faceUp: true }));
  });

  it("may refuse the hand play and a non-Dark-Masters Digimon blocks it", async () => {
    const declined = setupEngine({ 0: { hand: [{ card: CARD_ID, as: "puppetmon" }] } }, { autoDeclineOptional: true });
    declined.state.memory = 6;
    await declined.ready();
    const [declinedEntry] = JSON.parse(declined.inst("puppetmon").activatableEffectsJson || "[]") as Array<{
      effectKey: string;
    }>;
    expect(declinedEntry).toBeDefined();
    expect(declined.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain(CARD_ID);
    expect(declined.state.memory).toBe(6);

    const blocked = setupEngine(
      { 0: { hand: [{ card: CARD_ID, as: "puppetmon" }], battleArea: ["AD1-001"] } },
      { autoAcceptOptional: true },
    );
    blocked.state.memory = 6;
    await blocked.ready();
    const entries = JSON.parse(blocked.inst("puppetmon").activatableEffectsJson || "[]") as Array<unknown>;
    expect(entries).toHaveLength(0);
  });

  it("a normal play does not arm the reduced-cost effect's delayed deletion", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "puppetmon" }] } });
    const instanceId = s.inst("puppetmon").instanceId;
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("puppetmon"));
    await fireEndTurn(s);
    expect(onField(s, instanceId)).toBe(true);
  });

  it("returns a suspended opposing Digimon to the deck bottom on play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX10-020", as: "puppetmon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
    });
    const targetId = s.perm("target").permanentId;
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("puppetmon"));
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === targetId));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(s.inst("target").instanceId);
  });

  it("returns exactly 1 suspended Digimon when attacking and ignores unsuspended targets", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "puppetmon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", suspended: true },
            { card: "BT1-010", as: "second", suspended: true },
            { card: "BT1-011", as: "standing" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("first").permanentId, s.perm("standing").permanentId);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("puppetmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => !s.state.players[1]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("first").instanceId),
    );
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).not.toContain(
      s.inst("first").instanceId,
    );
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toContain(
      s.inst("second").instanceId,
    );
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toContain(
      s.inst("standing").instanceId,
    );
  });

  it("can only digivolve into Apocalymon", () => {
    const s = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "base" }] } });
    const ledger = new ContinuousEffectLedger();
    ledger.addDigivolveIntoConstraint(
      s.perm("base").permanentId,
      (definition) => /apocalymon/i.test(definition.nameEn ?? ""),
      EffectDuration.Permanent,
    );
    const deps: Parameters<typeof validateDigivolve>[3] = {
      maxAffordable: () => 99,
      digivolveIntoAllowed: (_state, permanent, evolving) =>
        ledger.digivolveIntoAllowed(permanent.permanentId, getCardDefinition(evolving.cardId)!),
    };
    function intent(cardId: string): DigivolveIntent {
      const card = s.give(0, Zone.Hand, cardId);
      return {
        type: "digivolve",
        instanceId: card.instanceId,
        permanentId: s.perm("base").permanentId,
      };
    }
    expect(validateDigivolve(s.state, 0, intent("BT12-057"), deps)).toEqual({
      ok: false,
      reason: "invalid-evolution",
    });
    expect(validateDigivolve(s.state, 0, intent("BT15-102"), deps).ok).toBe(true);
  });

  it("places itself face up in security on deletion only when no green face-up security exists", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX10-020", as: "puppetmon" }] } });
    const instanceId = s.perm("puppetmon").topCard.instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("puppetmon").permanentId]);
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === instanceId));
    expect(s.state.players[0]!.security.find((card) => card.instanceId === instanceId)?.faceUp).toBe(true);

    const blocked = setupEngine({
      0: {
        battleArea: [{ card: CARD_ID, as: "puppetmon" }],
        security: [{ card: "BT1-071", faceUp: true }],
      },
    });
    await advance(blocked.engine).verb.deletePermanent([blocked.perm("puppetmon").permanentId]);
    expect(blocked.state.players[0]!.security.map(({ cardId }) => cardId)).not.toContain(CARD_ID);
    expect(blocked.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain(CARD_ID);
  });

  it("plays a level 5 Dark Masters-text card when checked from face-up security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          hand: [{ card: "BT15-027", as: "playTarget" }],
          security: [{ card: "EX10-020", faceUp: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "BT15-027"));
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT15-027");
  });

  it("face-down Security, refusal, and level-6 or no-text targets do not play a card", async () => {
    const run = async (faceUp: boolean, autoDeclineOptional: boolean) => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
          1: {
            hand: [
              { card: "BT15-027", as: "eligible" },
              { card: "BT15-102", as: "tooHigh" },
              { card: "BT1-071", as: "noText" },
            ],
            security: [{ card: CARD_ID, faceUp }],
          },
        },
        { autoDeclineOptional, autoAcceptOptional: !autoDeclineOptional, autoSelectCards: true },
      );
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle();
      return s;
    };
    for (const s of [await run(false, false), await run(true, true)]) {
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
      expect(s.state.players[1]!.hand.map(({ cardId }) => cardId)).toEqual(
        expect.arrayContaining(["BT15-027", "BT15-102", "BT1-071"]),
      );
    }
  });
});
