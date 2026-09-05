import { describe, expect, it } from "vitest";
import { EffectDuration, EffectTiming, getCardDefinition, getCompiledCard } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-059.js";
import "../index.js";

const CARD_ID = "EX10-059";

describe("EX10-059 DarknessBagramon", () => {
  it("records the exact catalog and evolution routes", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Purple", "Black"],
      level: 7,
      playCost: 16,
      dp: 16000,
      evoCosts: [
        { color: "Purple", level: 6, memoryCost: 6 },
        { color: "Black", level: 6, memoryCost: 6 },
      ],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Composite", "Bagra Army"],
    });
  });

  it("has complete compiled coverage and the printed DigiXros recipe", () => {
    expect(compiled).toBeDefined();
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digiXrosRequirement).toEqual([
      {
        materials: [{ names: ["Bagramon"] }, { names: ["DarkKnightmon"] }],
        count: 3,
        costReduction: 3,
      },
    ]);
  });

  it("requires all 3 Bagra Army trash cards before the deletion effect resolves", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = compiled.effects!.find((entry) => entry.trigger === trigger);
      expect(effect).toBeDefined();
      expect(effect!.actions).toMatchObject([
        {
          kind: "PlaceUnder",
          target: { filter: { isOpponentHand: true, controller: "opponent", zone: "hand" }, count: 1, from: ["hand"] },
          underFilter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
          position: "bottom",
        },
        {
          kind: "PlaceUnder",
          target: { filter: { zone: "trash", controller: "mine", kind: ["Digimon"] }, count: 3, from: ["trash"] },
          position: "top",
          optional: true,
          abortOnDecline: true,
        },
        { kind: "Delete", target: { filter: { controller: "opponent", hasDigivolutionCards: true } } },
      ]);
    }
  });

  it("copies All Turns effects from level 6 Bagra Army cards in its stack", () => {
    const allTurns = compiled.effects!.find((entry) => entry.trigger === "AllTurns");
    expect(allTurns).toMatchObject({
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "effects",
          copyTrigger: "AllTurns",
          filter: {
            kind: ["Digimon"],
            levels: [6],
            nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }],
          },
          duration: "permanent",
        },
      ],
    });
  });

  it("runs and preserves a copied All Turns effect from a valid mixed evolution stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: CARD_ID,
              as: "darkness",
              under: [{ card: "EX10-058", as: "lilithmon" }, { card: "EX10-057", as: "piedmon" }, "BT1-009", "BT1-010"],
            },
          ],
          trash: [{ card: "BT10-071", as: "payoff" }],
        },
        1: { battleArea: [{ card: "AD1-001", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    for (const turnSeat of [1, 0] as const) {
      s.state.turnSeat = turnSeat;
      await advance(s.engine).recompute();
      const conferrals = advance(s.engine).ledgers.continuous.listStackEffectConferrals();
      expect(conferrals).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            targetPermanentId: s.perm("darkness").permanentId,
            stackInstanceId: s.inst("lilithmon").instanceId,
          }),
        ]),
      );
      expect(conferrals.some(({ stackInstanceId }) => stackInstanceId === s.inst("piedmon").instanceId)).toBe(false);
    }

    expect(await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT10-071"));

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT10-071")).toBe(true);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("payoff").instanceId)).toBe(false);
    expect(s.perm("darkness").stack).toHaveLength(2);
  });

  it("confers only the stack card's [All Turns] effects, never its [On Play]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "darkness", under: [{ card: "EX10-058", as: "lilithmon" }] }],
        },
        1: { battleArea: [{ card: "AD1-001", as: "recipient" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).recompute();

    // EX10-058's [On Play] grants an opposing permanent "[End of Your Turn] Delete 1 of your
    // Digimon". It is NOT an [All Turns] effect, so firing this card's own [On Play] must not
    // resolve it. Without `copyTrigger` the conferral is trigger-unrestricted and the granted
    // end-of-turn watcher appears on the opposing Digimon.
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("darkness"));
    await settle(() => s.state.pendingDecision === null);
    expect(
      advance(s.engine).ledgers.subTriggers.subscriptionsFor("endOfTurn", s.perm("recipient").permanentId),
    ).toHaveLength(0);

    // The [All Turns] conferral from the level-6 [Bagra Army] stack card is still live and tagged.
    const conferrals = advance(s.engine).ledgers.continuous.listStackEffectConferrals();
    expect(
      conferrals.some(
        ({ stackInstanceId, trigger }) => stackInstanceId === s.inst("lilithmon").instanceId && trigger === "AllTurns",
      ),
    ).toBe(true);
  });

  it("Q5162 places a random opposing hand card only under an opposing host at the bottom", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "darkness" },
            { card: "EX10-064", as: "ownTamer" },
          ],
        },
        1: {
          hand: [{ card: "BT1-009", as: "handCard" }],
          battleArea: [{ card: "EX10-026", as: "host", under: [{ card: "BT1-010", as: "existing" }] }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("host").permanentId);
    await s.ready();
    expect(getCompiledCard(CARD_ID)?.effects[0]?.actions?.[1]).toMatchObject({ kind: "PlaceUnder", optional: true });
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("darkness"));
    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("handCard").instanceId,
      s.inst("existing").instanceId,
    ]);
    expect(s.perm("ownTamer").stack).toHaveLength(0);
  });

  it("Q5162 keeps opposing hand identities hidden while exposing only opaque pick ids", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "darkness" }] },
      1: {
        hand: [
          { card: "BT1-009", as: "firstHand", faceUp: false },
          { card: "BT1-010", as: "secondHand", faceUp: false },
        ],
        battleArea: [{ card: "EX10-026", as: "host" }],
      },
    });
    await s.ready();
    const pending = advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("darkness"));
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const decision = s.state.pendingDecision;
    expect(decision?.kind).toBe("selectCards");
    expect(decision?.seat).toBe(0);
    const payload = JSON.parse(decision!.payloadJson) as {
      candidateInstanceIds?: string[];
      visibleInstanceIds?: string[];
      visibleCards?: { instanceId: string; cardId: string }[];
    };
    expect(payload.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.inst("firstHand").instanceId, s.inst("secondHand").instanceId]),
    );
    expect(payload.visibleInstanceIds).toEqual(payload.candidateInstanceIds);
    expect(payload.visibleCards ?? []).toEqual([]);

    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: decision!.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("secondHand").instanceId] },
      }).ok,
    ).toBe(false);
    expect(s.state.pendingDecision?.decisionId).toBe(decision!.decisionId);
    expect(s.state.players[1]!.hand).toHaveLength(2);

    const accepted = s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: decision!.decisionId,
      response: { kind: "selectCards", instanceIds: [s.inst("firstHand").instanceId] },
    });
    expect(accepted).toEqual({ ok: true });
    await pending;
    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("firstHand").instanceId]);
    expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("secondHand").instanceId]);
    expect(s.state.pendingDecision == null).toBe(true);
  });

  it("Q5163 cannot place the opposing hand card under a host that isn't affected by effects", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "darkness" }] },
        1: {
          hand: [{ card: "BT1-009", as: "handCard" }],
          battleArea: [{ card: "EX10-026", as: "host" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    // Q5163: the opponent's only Digimon is unaffectable and they control no Tamers, so the card
    // may be chosen but cannot be placed.
    advance(s.engine).ledgers.continuous.addRestriction(
      s.perm("host").permanentId,
      "beAffected",
      EffectDuration.Permanent,
      { fromSourceKind: ["Digimon"] },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("darkness"));
    await settle(() => s.state.pendingDecision === null);

    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("handCard").instanceId);
  });

  it("DigiXroses only the printed Bagramon and DarkKnightmon pair for 6 less", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "darkness" },
            { card: "EX10-056", as: "bagramon" },
            { card: "EX10-031", as: "darkknight" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 16;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("darkness").instanceId,
        digiXros: { materialInstanceIds: [s.inst("bagramon").instanceId, s.inst("darkknight").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID));
    expect(s.state.memory).toBe(6);
  });

  it("Q5161 places exactly 3 Bagra Army cards as top sources before deleting only a permanent with cards under it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "darkness" }],
          trash: [
            { card: "BT10-073", as: "first" },
            { card: "BT10-077", as: "second" },
            { card: "EX10-027", as: "third" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "stacked", under: ["BT1-010"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("first").instanceId, s.inst("second").instanceId, s.inst("third").instanceId]),
    );
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("darkness"));
    await settle(() => s.perm("darkness").stack.length === 3);
    expect(
      s
        .perm("darkness")
        .stack.map(({ instanceId }) => instanceId)
        .slice(-3),
    ).toEqual(
      expect.arrayContaining([s.inst("first").instanceId, s.inst("second").instanceId, s.inst("third").instanceId]),
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("Q5161 cannot pay the deletion condition with only 2 matching trash cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "darkness" }],
          trash: [
            { card: "BT10-073", as: "first" },
            { card: "BT10-073", as: "second" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "stacked", under: ["BT1-010"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const targetId = s.perm("stacked").permanentId;
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("darkness"));
    await settle(() => s.state.pendingDecision === null);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(targetId);
    expect(s.perm("darkness").stack).toHaveLength(0);
  });
});
