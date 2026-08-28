import { describe, expect, it } from "vitest";
import { EffectDuration, EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-014.js";
import "../index.js";

const CARD_ID = "EX10-014";

describe("EX10-014 Weatherdramon", () => {
  it("records the exact catalog, deferred Security play, debuffs, and Appmon Link", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Yellow"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Yellow", level: 3, memoryCost: 2 }],
      forms: ["Sup.", "Appmon"],
      linkDp: 3000,
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 2 }]);
    expect(compiled.effects?.find((effect) => effect.trigger === "Security")).toMatchObject({
      timing: "endOfBattle",
      isSecurity: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityBattleEnded",
          once: true,
          actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false }],
        },
      ],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "GainKeyword",
            keyword: { keyword: "SecurityAttack", amount: -1 },
            duration: "untilOpponentTurnEnd",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 2 },
          },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.isLinked)).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "ModifyDP",
          amount: -6000,
          duration: "forTheTurn",
          optional: true,
          abortOnDecline: true,
          cost: { kind: "trash", target: { filter: { zone: "linked", isSelfRef: true }, count: 1 } },
        },
      ],
    });
  });

  it("battles in security first, then plays itself and resolves On Play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 7000 }] },
        1: { security: [{ card: CARD_ID, as: "weatherdramon" }] },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID));

    const checkedIndex = s.events.findIndex((event) => event.kind === "securityChecked");
    const playedIndex = s.events.findIndex(
      (event) => event.kind === "cardPlayed" && "cardId" in event && event.cardId === CARD_ID,
    );
    expect(checkedIndex).toBeGreaterThanOrEqual(0);
    expect(playedIndex).toBeGreaterThan(checkedIndex);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain(CARD_ID);
    expect(advance(s.engine).ledgers.continuous.grantedKeywords(s.perm("attacker").permanentId)).toEqual(
      expect.arrayContaining([expect.objectContaining({ keyword: "SecurityAttack", amount: -1 })]),
    );
  });

  it("debuffs exactly 2 targets through their turn and then lapses", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
            { card: "BT1-011", as: "third" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("first").permanentId, s.perm("second").permanentId);
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    const ledger = advance(s.engine).ledgers.continuous;

    for (const alias of ["first", "second"]) {
      expect(ledger.grantedKeywords(s.perm(alias).permanentId)).toEqual(
        expect.arrayContaining([expect.objectContaining({ keyword: "SecurityAttack", amount: -1 })]),
      );
    }
    expect(ledger.grantedKeywords(s.perm("third").permanentId)).toEqual([]);

    ledger.sweep(s.state, "ownerTurnEnd", 1);
    expect(ledger.grantedKeywords(s.perm("first").permanentId)).toEqual([]);
    expect(ledger.grantedKeywords(s.perm("second").permanentId)).toEqual([]);
  });

  it("uses the normal yellow level-3 evolution route for 2 and resolves When Digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-013", as: "base" }],
          hand: [{ card: CARD_ID, as: "weatherdramon" }],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("weatherdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === CARD_ID);

    expect(s.state.memory).toBe(0);
    for (const alias of ["first", "second"]) {
      expect(advance(s.engine).ledgers.continuous.grantedKeywords(s.perm(alias).permanentId)).toEqual(
        expect.arrayContaining([expect.objectContaining({ keyword: "SecurityAttack", amount: -1 })]),
      );
    }
  });

  it("links only to an Appmon for cost 2 and contributes +3000 DP", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT21-009", as: "appmon" },
          { card: "BT1-009", as: "notAppmon" },
        ],
        hand: [{ card: CARD_ID, as: "weatherdramon" }],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("weatherdramon").instanceId,
        targetPermanentId: s.perm("notAppmon").permanentId,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("weatherdramon").instanceId,
        targetPermanentId: s.perm("appmon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("appmon").linked.some(({ cardId }) => cardId === CARD_ID));

    expect(s.state.memory).toBe(0);
    expect(s.perm("appmon").currentDP).toBe(5000);
  });

  it("Q5042 may trash itself as the link cost and applies exactly -6000 DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-009", as: "host", linked: [{ card: CARD_ID, as: "weather" }] }] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("weather").instanceId);
    expect(s.perm("target").currentDP).toBe(1000);
  });

  it("Q5043 may trash another link card on the same host, and the effect may be refused", async () => {
    const preferred: string[] = [];
    const accepted = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT21-009",
              as: "host",
              linked: [
                { card: CARD_ID, as: "weather" },
                { card: "BT26-010", as: "otherLink" },
              ],
            },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(accepted.inst("otherLink").instanceId);
    // Model an external <Link +1> grant so this is a legal two-link Appmon stack. Using an
    // Appmon host is important: the rule-check sweep correctly trashes Weatherdramon when
    // its host no longer satisfies Weatherdramon's printed [Appmon] link requirement.
    (
      accepted.engine as unknown as {
        continuous: {
          addLinkMaxGrant(permanentId: string, delta: number, duration: EffectDuration): void;
        };
      }
    ).continuous.addLinkMaxGrant(accepted.perm("host").permanentId, 1, EffectDuration.UntilEachTurnEnd);
    await accepted.ready();

    await advance(accepted.engine).fire(EffectTiming.OnUseAttack, accepted.perm("host"));
    expect(accepted.perm("host").linked.map(({ instanceId }) => instanceId)).toContain(
      accepted.inst("weather").instanceId,
    );
    expect(accepted.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      accepted.inst("otherLink").instanceId,
    );
    expect(accepted.perm("target").currentDP).toBe(1000);

    const declined = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-009", as: "host", linked: [{ card: CARD_ID, as: "weather" }] }] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 7000 }] },
      },
      { autoDeclineOptional: true },
    );
    await declined.ready();
    await advance(declined.engine).fire(EffectTiming.OnUseAttack, declined.perm("host"));

    expect(declined.perm("host").linked).toHaveLength(1);
    expect(declined.perm("target").currentDP).toBe(7000);
  });
});
