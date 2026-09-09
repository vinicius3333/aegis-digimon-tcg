import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX11-018.js";

const cardId = "EX11-018";

describe("EX11-018 Ryugumon", () => {
  it("matches the catalog and encodes Evade, Decode, the shared paid effect, and the self watcher", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Ryugumon",
      colors: ["Blue"],
      level: 6,
      playCost: 11,
      dp: 12000,
      types: ["Mollusk", "LIBERATOR", "Aquatic"],
      evoCosts: [{ color: "Blue", level: 5, memoryCost: 3 }],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Evade", raw: "＜Evade＞" }] }),
        expect.objectContaining({
          trigger: "Static",
          keywords: [{ keyword: "Decode", raw: "＜Decode (Lv.5 or lower w/[Aqua]/[Sea Animal] in any trait)＞" }],
        }),
      ]),
    );
    expect(
      compiled.effects.find(({ actions }) => actions.some((action) => action.kind === "Replacement")),
    ).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanBattle",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["digivolutionCards"],
              payCost: false,
              playedByDecode: true,
              optional: true,
              target: {
                filter: {
                  hostFilter: { isSelfRef: true },
                  levelComparison: { op: "lte", value: 5 },
                  nameOrTrait: [{ tokens: ["Aqua", "Sea Animal"], match: "traitContains" }],
                },
              },
            },
          ],
        },
      ],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          {
            kind: "Unsuspend",
            optional: true,
            abortOnDecline: true,
            target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
            cost: {
              kind: "place",
              destination: "digivolutionStack",
              position: "bottom",
              host: "self",
              target: {
                filter: {
                  zone: "hand",
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Aqua", "Sea Animal"], match: "traitContains" }],
                },
                count: 1,
                from: ["hand"],
              },
            },
          },
        ],
      });
    }
    expect(
      compiled.effects.find(({ actions }) =>
        actions.some((action) => action.kind === "SubTrigger" && action.event === "onAddDigivolutionCards"),
      ),
    ).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Return",
              to: "deckBottom",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  digivolutionCardsCompareToSource: "lte",
                },
                count: 1,
              },
            },
          ],
        },
      ],
    });
    expect(compiled.effects.some(({ isInherited }) => isInherited)).toBe(false);
    expect(compiled.effects.some(({ isSecurity }) => isSecurity)).toBe(false);
  });

  it("accepts Aquatic as an Aqua-containing cost through public play, places it at the bottom, and unsuspends the chosen Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "ally", suspended: true }],
          hand: [
            { card: cardId, as: "source" },
            { card: "BT10-023", as: "aquaticCost" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "returnTarget", under: ["BT1-012"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("aquaticCost").instanceId, s.perm("ally").permanentId, s.perm("returnTarget").permanentId);
    s.state.memory = 11;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("source").topCard.cardId === cardId);
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("source").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("aquaticCost").instanceId]);
    expect(s.perm("ally").isSuspended).toBe(false);
    expect(s.perm("source").isSuspended).toBe(false);
    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(s.inst("returnTarget").instanceId);
    assertNoLoudGap(s);
  });

  it("does nothing when the optional placement cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-010", as: "ally", suspended: true }],
          hand: [
            { card: cardId, as: "source" },
            { card: cardId, as: "cost" },
          ],
        },
      },
      { autoAcceptOptional: false },
    );
    s.state.memory = 11;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("ally").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const optional = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("does nothing without an Aqua/Sea Animal-containing hand card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-010", as: "ally", suspended: true }],
          hand: [
            { card: cardId, as: "source" },
            { card: "BT1-009", as: "cost" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 11;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("shares the placement-and-unsuspend use across all three timings", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "source" },
            { card: "BT1-009", as: "ally", suspended: true },
          ],
          hand: [
            { card: cardId, as: "firstCost" },
            { card: cardId, as: "secondCost" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("firstCost").instanceId, s.perm("ally").permanentId);
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    expect(s.perm("source").stack).toHaveLength(1);

    s.perm("ally").isSuspended = true;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("source"));
    expect(s.perm("source").stack).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.perm("ally").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("probes shared placement-and-unsuspend reuse across the next own turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "firstAlly", suspended: true },
            { card: "BT1-010", as: "secondAlly", suspended: true },
          ],
          hand: [
            { card: cardId, as: "source" },
            { card: "BT10-023", as: "firstCost" },
            { card: "BT1-033", as: "secondCost" },
          ],
          security: ["BT1-011", "BT1-012", "BT1-013"],
          deck: ["BT1-014", "BT1-015", "BT1-016"],
        },
        1: { security: ["BT1-017", "BT1-018", "BT1-019"], deck: ["BT1-020", "BT1-021", "BT1-022"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    await s.ready();
    s.state.turnSeat = 0;
    s.state.turnCount = 1;
    s.state.memory = 11;
    preferred.push(s.inst("firstCost").instanceId, s.perm("firstAlly").permanentId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("source").stack.length === 1 && !s.perm("firstAlly").isSuspended);
    expect(s.perm("source").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("firstCost").instanceId]);

    preferred.length = 0;
    s.state.turnSeat = 1;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    preferred.push(s.inst("secondCost").instanceId, s.perm("source").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.perm("source").isSuspended).toBe(false);
    expect(s.perm("source").stack.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("firstCost").instanceId, s.inst("secondCost").instanceId]),
    );
    expect(s.perm("source").stack).toHaveLength(2);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("secondCost").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("compares source counts after the addition and spends the watcher only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          hand: [
            { card: "BT1-009", as: "firstAdded" },
            { card: "BT1-010", as: "secondAdded" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "eligible", under: ["BT1-012"] },
            { card: "BT1-010", as: "secondEligible", under: ["BT1-014"] },
            { card: "BT1-011", as: "tooMany", under: ["BT1-009", "BT1-012"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.placeUnder(s.perm("source").permanentId, [s.inst("firstAdded").instanceId]);
    await settle(() => s.state.players[1]!.battleArea.length === 2);
    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(s.inst("eligible").instanceId);
    expect(
      s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === s.perm("tooMany").permanentId),
    ).toBe(true);

    await advance(s.engine).verb.placeUnder(s.perm("source").permanentId, [s.inst("secondAdded").instanceId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[1]!.deck).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("ignores cards added under another Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "source" },
            { card: "BT1-009", as: "other" },
          ],
          hand: [{ card: "BT1-009", as: "added" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.placeUnder(s.perm("other").permanentId, [s.inst("added").instanceId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.deck).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("Decodes either Aqua-containing branch at level 5 or lower, but not level 6 or battle deletion", async () => {
    for (const decodeCardId of ["BT10-023", "EX12-031"]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: cardId, as: "source", suspended: true, under: [{ card: decodeCardId, as: "decode" }] },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      expect(await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect")).toBe(1);
      expect(
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("decode").instanceId),
      ).toBe(true);
    }
    for (const [decodeCardId, cause] of [
      [cardId, "byEffect"],
      ["BT10-023", "byBattle"],
    ] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: cardId, as: "source", suspended: true, under: [{ card: decodeCardId, as: "candidate" }] },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      expect(await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], cause)).toBe(1);
      expect(s.state.players[0]!.battleArea).toHaveLength(0);
    }
  });

  it("plays only from its own digivolution cards, never from a neighbor's stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "source", suspended: true },
            { card: "BT1-009", as: "neighbor", under: [{ card: "BT10-023", as: "foreign" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const foreignId = s.inst("foreign").instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect")).toBe(1);
    await settle();

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === foreignId)).toBe(false);
    expect(s.perm("neighbor").stack.some(({ instanceId }) => instanceId === foreignId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("resolves Decode and accepted Evade in the same deletion window (Q6516)", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: cardId, as: "source", under: [{ card: "BT10-023", as: "decode" }] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const sourceId = s.perm("source").permanentId;
    const deletion = advance(s.engine).verb.deletePermanent([sourceId], "byEffect");
    await settle(() => s.events.some(({ kind }) => kind === "evadePrompt"));
    expect(s.engine.applyIntent(0, { type: "respondEvade", permanentId: sourceId, accept: true })).toEqual({
      ok: true,
    });
    expect(await deletion).toBe(0);
    expect(s.perm("source").isSuspended).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("decode").instanceId),
    ).toBe(true);
    assertNoLoudGap(s);
  });

  it("can Decode again after Evade prevents the first rule deletion (Q6515)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: cardId,
              as: "source",
              under: [
                { card: "BT10-023", as: "firstDecode" },
                { card: "EX12-031", as: "secondDecode" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const sourceId = s.perm("source").permanentId;
    const firstRuleDeletion = advance(s.engine).verb.deletePermanent([sourceId], "byRule");
    await settle(() => s.events.some(({ kind }) => kind === "evadePrompt"));
    expect(s.engine.applyIntent(0, { type: "respondEvade", permanentId: sourceId, accept: true })).toEqual({
      ok: true,
    });
    expect(await firstRuleDeletion).toBe(0);
    expect(await advance(s.engine).verb.deletePermanent([sourceId], "byRule")).toBe(1);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual(
      expect.arrayContaining([s.inst("firstDecode").instanceId, s.inst("secondDecode").instanceId]),
    );
    assertNoLoudGap(s);
  });

  it("uses Evade alone to suspend and prevent an effect deletion", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: cardId, as: "source" }] } });
    await s.ready();
    const sourceId = s.perm("source").permanentId;
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Evade")).toBe(true);
    const deletion = advance(s.engine).verb.deletePermanent([sourceId], "byEffect");
    await settle(() => s.events.some(({ kind }) => kind === "evadePrompt"));
    expect(s.engine.applyIntent(0, { type: "respondEvade", permanentId: sourceId, accept: true })).toEqual({
      ok: true,
    });
    expect(await deletion).toBe(0);
    expect(s.perm("source").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("digivolves only from a blue level 5 for the printed cost 3", async () => {
    const valid = setupEngine({
      0: { battleArea: [{ card: "BT1-040", as: "base" }], hand: [{ card: cardId, as: "source" }] },
    });
    valid.state.memory = 3;
    expect(
      valid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: valid.perm("base").permanentId,
        instanceId: valid.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => valid.perm("base").topCard.cardId === cardId);
    expect(valid.state.memory).toBe(0);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "EX12-044", as: "base" }], hand: [{ card: cardId, as: "source" }] },
    });
    invalid.state.memory = 3;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("source").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
