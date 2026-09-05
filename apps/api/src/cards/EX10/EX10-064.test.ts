import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-064.js";
import { registerIrCard } from "../../engine/effects/interpreter.js";
import "../index.js";

const CARD_ID = "EX10-064";

describe("EX10-064 Yuu Amano & Nene Amano", () => {
  it("records the exact catalog and executable contract", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Purple", "Black"],
      playCost: 4,
      dp: 0,
      evoCosts: [],
      forms: ["-"],
      attributes: ["-"],
      types: ["General", "Bagra Army", "Twilight"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find(({ trigger }) => trigger === "StartOfYourMainPhase")).toMatchObject({
      actions: [
        {
          kind: "Draw",
          amount: 1,
          optional: true,
          abortOnDecline: true,
          cost: { kind: "place", target: { count: 1, from: ["hand", "trash"] }, position: "bottom" },
        },
      ],
    });
    expect(compiled.effects?.find(({ trigger }) => trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          mode: "instead",
          sourceFilter: { controller: "mine", kind: ["Digimon"], hasDigiXrosRequirement: true },
          actions: [
            // `underTamers` is the only ZoneRef the material picker reads for "under your
            // Tamers"; the previous `tamerCards` token matched nothing there.
            { kind: "DigiXrosMaterialZoneExpansion", zones: ["underTamers", "trash"], cost: { kind: "suspend" } },
          ],
        },
      ],
    });
  });

  it("Q5174 places the payment at the Tamer's true bottom and draws exactly 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "tamer", under: [{ card: "BT1-009", as: "existing" }] }],
          hand: [{ card: "EX10-026", as: "material" }],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnStartMainPhase, s.perm("tamer"));
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("drawn").instanceId));
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("material").instanceId,
      s.inst("existing").instanceId,
    ]);
  });

  it("Q5175/Q5176 DigiXroses with one card under another Tamer and one from trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX10-055", as: "tactimon" }],
          trash: [{ card: "EX10-027", as: "trashMaterial" }],
          battleArea: [
            { card: CARD_ID, as: "expander" },
            { card: "EX10-063", as: "otherTamer", under: [{ card: "EX10-026", as: "underMaterial" }] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 12;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("tactimon").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("underMaterial").instanceId, s.inst("trashMaterial").instanceId],
          expanderPermanentIds: [s.perm("expander").permanentId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX10-055"));
    expect(s.perm("expander").isSuspended).toBe(true);
    expect(s.state.memory).toBe(4);
  });

  it("Q5175/Q5176 effect-play path pays the expander and consumes exactly one card from each extra zone", async () => {
    // This is the card-effect boundary: BT26-006's inherited effect plays the DigiXros card
    // through PlayWithoutCost { allowDigiXros: true }. There is deliberately no playCard
    // digiXros declaration and no client-supplied expanderPermanentIds shortcut.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX10-026",
              as: "attacker",
              under: [
                { card: "BT26-006", as: "monimon" },
                { card: "BT1-009", as: "costA" },
                { card: "BT1-009", as: "costB" },
              ],
            },
            { card: CARD_ID, as: "expander" },
            {
              card: "EX10-063",
              as: "otherTamer",
              under: [
                { card: "EX10-026", as: "underMaterial" },
                { card: "EX10-027", as: "underExtra" },
              ],
            },
          ],
          hand: [{ card: "EX10-058", as: "played" }],
          trash: [
            { card: "EX10-027", as: "trashMaterial" },
            { card: "EX10-026", as: "trashExtra" },
          ],
        },
        1: { security: [{ card: "BT1-001", as: "security" }] },
      },
      { autoAcceptOptional: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    // Resolve the effect's real prompts explicitly. Auto-selecting the maximum here would
    // choose the attacker's top card plus both extra-zone cards, exceeding the two one-card
    // quotas and making the test pass without proving the printed payment.
    await settle(
      () =>
        s.state.pendingDecision?.kind === "selectCards" && JSON.parse(s.state.pendingDecision.payloadJson).max === 2,
    );
    let decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("costA").instanceId, s.inst("costB").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision?.kind === "selectCards" && JSON.parse(s.state.pendingDecision.payloadJson).max === 2,
    );
    decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: {
          kind: "selectCards",
          instanceIds: [s.inst("underMaterial").instanceId, s.inst("trashMaterial").instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX10-058"), 5000);
    await settle(() => s.state.pendingDecision === undefined);

    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX10-058")!;
    expect(s.perm("expander").isSuspended).toBe(true);
    expect(played.stack.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("underMaterial").instanceId, s.inst("trashMaterial").instanceId]),
    );
    expect(s.perm("otherTamer").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("underExtra").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("trashExtra").instanceId,
      s.inst("costA").instanceId,
      s.inst("costB").instanceId,
    ]);
    // EX10-058 costs 11; BT26-006 reduces by 2 and two DigiXros materials reduce by 4.
    expect(s.state.memory).toBe(0);
  });

  it("Q5178 adds the quotas from 2 separately suspended copies", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX10-034", as: "blastmon" }],
          trash: [
            { card: "EX10-026", as: "first" },
            { card: "EX10-027", as: "second" },
          ],
          battleArea: [
            { card: CARD_ID, as: "firstExpander" },
            { card: CARD_ID, as: "secondExpander" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 13;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("blastmon").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("first").instanceId, s.inst("second").instanceId],
          expanderPermanentIds: [s.perm("firstExpander").permanentId, s.perm("secondExpander").permanentId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX10-034"));
    expect(s.perm("firstExpander").isSuspended).toBe(true);
    expect(s.perm("secondExpander").isSuspended).toBe(true);
  });

  it("Q5178/Q5179 adds both copies' under-Tamer and trash quotas on effect play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX10-026",
              as: "attacker",
              under: [
                { card: "BT26-006", as: "monimon" },
                { card: "BT1-009", as: "costA" },
                { card: "BT1-009", as: "costB" },
              ],
            },
            { card: CARD_ID, as: "firstExpander" },
            { card: CARD_ID, as: "secondExpander" },
            {
              card: "EX10-063",
              as: "otherTamer",
              under: [
                { card: "EX10-026", as: "underA" },
                { card: "EX10-027", as: "underB" },
              ],
            },
          ],
          hand: [{ card: "EX10-058", as: "played" }],
          trash: [
            { card: "EX10-027", as: "trashA" },
            { card: "EX10-026", as: "trashB" },
          ],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(
      () =>
        s.state.pendingDecision?.kind === "selectCards" && JSON.parse(s.state.pendingDecision.payloadJson).max === 2,
    );
    let decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("costA").instanceId, s.inst("costB").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision?.kind === "selectCards" && JSON.parse(s.state.pendingDecision.payloadJson).max === 2,
    );
    decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: {
          kind: "selectCards",
          instanceIds: [s.inst("underA").instanceId, s.inst("underB").instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX10-058"),
      5000,
    );
    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX10-058")!;
    expect(s.perm("firstExpander").isSuspended).toBe(true);
    expect(s.perm("secondExpander").isSuspended).toBe(true);
    expect(played.stack.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("underA").instanceId, s.inst("underB").instanceId]),
    );
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("trashA").instanceId, s.inst("trashB").instanceId]),
    );
    expect(s.state.memory).toBe(0);
  });

  it("Q5178 lets two replacement copies be accepted independently", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX10-026",
              as: "attacker",
              under: [
                { card: "BT26-006", as: "monimon" },
                { card: "BT1-009", as: "costA" },
                { card: "BT1-009", as: "costB" },
              ],
            },
            { card: CARD_ID, as: "firstExpander" },
            { card: CARD_ID, as: "secondExpander" },
            {
              card: "EX10-063",
              as: "otherTamer",
              under: [
                { card: "EX10-026", as: "underA" },
                { card: "EX10-027", as: "underB" },
              ],
            },
          ],
          hand: [{ card: "EX10-058", as: "played" }],
          trash: [
            { card: "EX10-027", as: "trashA" },
            { card: "EX10-026", as: "trashB" },
          ],
        },
      },
      { autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    let decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision?.kind === "selectCards" && JSON.parse(s.state.pendingDecision.payloadJson).max === 2,
    );
    decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("costA").instanceId, s.inst("costB").instanceId] },
      }),
    ).toEqual({ ok: true });
    const costDecisionId = decision.decisionId;
    await settle(
      () =>
        s.state.pendingDecision?.kind === "optional" &&
        s.state.pendingDecision.decisionId !== costDecisionId &&
        s.decisions.filter(({ req }) => req.kind === "optional").length >= 2,
      5000,
    );
    decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    const firstReplacementId = decision.decisionId;
    await settle(
      () =>
        s.state.pendingDecision?.kind === "optional" &&
        s.state.pendingDecision.decisionId !== firstReplacementId &&
        s.decisions.filter(({ req }) => req.kind === "optional").length >= 3,
      5000,
    );
    decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision?.kind === "selectCards" && JSON.parse(s.state.pendingDecision.payloadJson).max === 2,
      5000,
    );
    decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: {
          kind: "selectCards",
          instanceIds: [s.inst("underA").instanceId, s.inst("trashA").instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX10-058"),
      5000,
    );
    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX10-058")!;
    expect(s.perm("firstExpander").isSuspended).toBe(true);
    expect(s.perm("secondExpander").isSuspended).toBe(false);
    expect(played.stack.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("underA").instanceId, s.inst("trashA").instanceId]),
    );
    expect(played.stack.map(({ instanceId }) => instanceId)).not.toContain(s.inst("underB").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("trashB").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("fails the compiled quota mutation when its nested expansion action is removed", async () => {
    const runEffectPlay = async () => {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [
              {
                card: "EX10-026",
                as: "attacker",
                under: [
                  { card: "BT26-006", as: "monimon" },
                  { card: "BT1-009", as: "costA" },
                  { card: "BT1-009", as: "costB" },
                ],
              },
              { card: CARD_ID, as: "expander" },
              { card: "EX10-063", as: "otherTamer", under: [{ card: "EX10-026", as: "underMaterial" }] },
            ],
            hand: [{ card: "EX10-058", as: "played" }],
            trash: [{ card: "EX10-027", as: "trashMaterial" }],
          },
        },
        { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true, preferInstanceIds: preferred },
      );
      preferred.push(s.inst("underMaterial").instanceId, s.inst("trashMaterial").instanceId);
      s.state.memory = 5;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.pendingDecision === undefined &&
          s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX10-058"),
        5000,
      );
      return {
        permanent: s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX10-058")!,
        underMaterialId: s.inst("underMaterial").instanceId,
        trashMaterialId: s.inst("trashMaterial").instanceId,
      };
    };

    const original = await runEffectPlay();
    expect(original.permanent.stack.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([original.underMaterialId, original.trashMaterialId]),
    );
    const mutant = structuredClone(compiled) as typeof compiled;
    const replacement = mutant.effects?.find(({ trigger }) => trigger === "AllTurns")?.actions?.[0];
    expect(replacement?.kind).toBe("Replacement");
    if (replacement?.kind === "Replacement") replacement.actions = [];
    registerIrCard(CARD_ID, mutant);
    try {
      const mutated = await runEffectPlay();
      let mutationRejected = false;
      try {
        expect(mutated.permanent.stack.map(({ instanceId }) => instanceId)).toEqual(
          expect.arrayContaining([mutated.underMaterialId, mutated.trashMaterialId]),
        );
      } catch {
        mutationRejected = true;
      }
      expect(mutationRejected).toBe(true);
    } finally {
      registerIrCard(CARD_ID, compiled);
    }
  });

  it("rejects the expander for a DigiXros card outside Bagra Army/Twilight", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT10-009", as: "shoutmon" }],
        trash: [{ card: "BT10-008", as: "material" }],
        battleArea: [{ card: CARD_ID, as: "expander" }],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("shoutmon").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("material").instanceId],
          expanderPermanentIds: [s.perm("expander").permanentId],
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-expander" });
  });

  it("plays itself from security without paying", async () => {
    const s = setupEngine({ 0: { security: [{ card: CARD_ID, as: "tamer" }] } });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("tamer"));
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID));
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("declines the optional expansion without suspending or consuming extra-zone materials", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX10-026",
              as: "attacker",
              under: [
                { card: "BT26-006", as: "monimon" },
                { card: "BT1-009", as: "costA" },
                { card: "BT1-009", as: "costB" },
              ],
            },
            { card: CARD_ID, as: "expander" },
            { card: "EX10-063", as: "otherTamer", under: [{ card: "EX10-026", as: "underMaterial" }] },
          ],
          hand: [{ card: "EX10-058", as: "played" }],
          trash: [{ card: "EX10-027", as: "trashMaterial" }],
        },
      },
      { autoChooseOption: true },
    );
    s.state.memory = 12;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    // First accept BT26-006's optional play branch. EX10-064's replacement then presents its
    // own optional choice; decline that second prompt to prove the original play continues.
    await settle(
      () =>
        s.state.pendingDecision?.kind === "optional" &&
        s.decisions.filter(({ req }) => req.kind === "optional").length >= 1,
    );
    let decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision?.kind === "selectCards" && JSON.parse(s.state.pendingDecision.payloadJson).max === 2,
    );
    decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("costA").instanceId, s.inst("costB").instanceId] },
      }),
    ).toEqual({ ok: true });
    const costDecisionId = decision.decisionId;
    await settle(
      () =>
        s.state.pendingDecision?.kind === "optional" &&
        s.state.pendingDecision.decisionId !== costDecisionId &&
        s.decisions.filter(({ req }) => req.kind === "optional").length >= 2,
      5000,
    );
    decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards" && s.decisions.length >= 5);
    decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX10-058"),
      5000,
    );
    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX10-058")!;
    expect(s.perm("expander").isSuspended).toBe(false);
    expect(played.stack.map(({ instanceId }) => instanceId)).not.toContain(s.inst("underMaterial").instanceId);
    expect(played.stack.map(({ instanceId }) => instanceId)).not.toContain(s.inst("trashMaterial").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("trashMaterial").instanceId);
  });
});
