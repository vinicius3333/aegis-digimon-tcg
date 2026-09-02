import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-058.js";
import "../index.js";

const CARD_ID = "EX10-058";

describe("EX10-058 Lilithmon", () => {
  it("records the exact catalog", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Purple"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [{ color: "Purple", level: 5, memoryCost: 3 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Demon Lord", "Bagra Army"],
    });
  });

  it("proves the granted turn-end deletion, the shared once-per-turn watcher pair, and DigiXros", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    // The printed Purple/Lv.5/cost-3 EvoCost row is NOT restated here: every
    // `digivolutionRequirement` entry is read as an ALTERNATE route, and this card prints no
    // `[Digivolve]` header.
    expect(compiled.digivolutionRequirement).toBeUndefined();
    expect(compiled.digiXrosRequirement).toEqual([
      { materials: [{ traits: ["Bagra Army"] }], count: 2, costReduction: 2 },
    ]);

    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "GainTriggeredEffect",
            target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
            gainedTrigger: "EndOfYourTurn",
            gainedActions: [
              { kind: "Delete", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 } },
            ],
            duration: "untilOpponentTurnEnd",
          },
        ],
      });
    }

    const allTurns = compiled.effects?.find((effect) => effect.trigger === "AllTurns");
    expect(allTurns).toMatchObject({ frequency: "OncePerTurn" });
    expect(allTurns?.actions).toMatchObject([
      {
        kind: "SubTrigger",
        event: "whenPlayed",
        sourceFilter: { controller: "opponent", kind: ["Digimon"] },
        oncePerTurnKey: "EX10-058/all-turns",
      },
      {
        kind: "SubTrigger",
        event: "onDeletionOf",
        sourceFilter: { controller: "opponent", kind: ["Digimon"] },
        oncePerTurnKey: "EX10-058/all-turns",
      },
    ]);
  });

  it("Q5159 installs the granted turn-end deletion on an OPPOSING permanent, not on its own side", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "lilithmon" },
            { card: "EX10-040", as: "ally" },
          ],
        },
        1: { battleArea: [{ card: "AD1-001", as: "recipient" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("lilithmon"));
    await settle(() => s.state.pendingDecision === null);

    const watchers = advance(s.engine).ledgers.subTriggers;
    expect(watchers.subscriptionsFor("endOfTurn", s.perm("recipient").permanentId)).toHaveLength(1);
    expect(watchers.subscriptionsFor("endOfTurn", s.perm("ally").permanentId)).toHaveLength(0);
    expect(watchers.subscriptionsFor("endOfTurn", s.perm("lilithmon").permanentId)).toHaveLength(0);
  });

  it("Q5157 trashes exactly 2 of its own sources and plays a purple level 4 or lower Digimon from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: CARD_ID,
              as: "lilithmon",
              under: [
                { card: "BT1-009", as: "first" },
                { card: "BT1-045", as: "second" },
              ],
            },
          ],
          trash: [{ card: "BT10-071", as: "payoff" }],
        },
        1: { battleArea: [{ card: "EX10-040", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("payoff").instanceId),
    );

    expect(s.perm("lilithmon").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("first").instanceId, s.inst("second").instanceId]),
    );
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toContain(
      s.inst("payoff").instanceId,
    );
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(s.inst("payoff").instanceId);
  });

  it("Q5157 cannot pay with only 1 digivolution card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "lilithmon", under: [{ card: "BT1-009", as: "only" }] }],
          trash: [{ card: "BT10-071", as: "payoff" }],
        },
        1: { battleArea: [{ card: "EX10-040", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");
    await settle(() => s.state.pendingDecision === null);

    expect(s.perm("lilithmon").stack).toHaveLength(1);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("payoff").instanceId);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).not.toContain(
      s.inst("payoff").instanceId,
    );
  });

  it("plays neither a level 5 purple nor a level 4 non-purple Digimon from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "lilithmon", under: ["BT1-009", "BT1-045"] }],
          trash: [
            { card: "EX10-047", as: "tooHigh" },
            { card: "AD1-001", as: "wrongColor" },
          ],
        },
        1: { battleArea: [{ card: "EX10-040", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");
    await settle(() => s.state.pendingDecision === null);

    const played = s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId);
    expect(played).not.toContain(s.inst("tooHigh").instanceId);
    expect(played).not.toContain(s.inst("wrongColor").instanceId);
  });

  it("spends one shared use for 'played or deleted' in the same turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "lilithmon", under: ["BT1-009", "BT1-045", "BT1-009", "BT1-045"] }],
          trash: [
            { card: "BT10-071", as: "first" },
            { card: "BT10-071", as: "second" },
          ],
        },
        1: {
          battleArea: [
            { card: "EX10-040", as: "victim" },
            { card: "EX10-043", as: "entrant" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");
    await settle(() => s.perm("lilithmon").stack.length === 2);
    expect(s.perm("lilithmon").stack).toHaveLength(2);

    // The second event this turn is the OTHER printed form ("are played"). It shares the same
    // once-per-turn key, so it must not pay a second time.
    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("entrant").permanentId,
      entryCause: "play",
    });
    await settle(() => s.state.pendingDecision === null);
    expect(s.perm("lilithmon").stack).toHaveLength(2);
  });

  it("DigiXroses with 2 Bagra Army Digimon for 4 less and rejects a non-Bagra-Army material", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "lilithmon" },
            { card: "EX10-026", as: "bagraFirst" },
            { card: "EX10-027", as: "bagraSecond" },
            { card: "EX10-040", as: "outsider" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 11;
    await s.ready();

    // EX10-040 DemiDevimon is purple but carries the [Evil] trait, not [Bagra Army].
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("lilithmon").instanceId,
        digiXros: { materialInstanceIds: [s.inst("bagraFirst").instanceId, s.inst("outsider").instanceId] },
      }),
    ).not.toEqual({ ok: true });

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("lilithmon").instanceId,
        digiXros: { materialInstanceIds: [s.inst("bagraFirst").instanceId, s.inst("bagraSecond").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID));

    expect(s.state.memory).toBe(4);
    expect(s.perm("lilithmon").stack.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("bagraFirst").instanceId, s.inst("bagraSecond").instanceId]),
    );
  });
});
