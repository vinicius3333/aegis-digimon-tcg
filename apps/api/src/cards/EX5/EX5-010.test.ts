import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-010.js";
import "../BT9/BT9-047.js";
import "../P/P-130.js";
import "../index.js";

describe("EX5-010 Sandiramon", () => {
  it("matches the catalog and encodes all three printed clauses", () => {
    expect(getCardDefinition("EX5-010")).toMatchObject({
      cardId: "EX5-010",
      nameEn: "Sandiramon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Holy Beast", "Deva"],
      effectText: expect.stringContaining("without the same name as the cards in your battle area or trash"),
      inheritedEffectText: expect.stringContaining("[Four Sovereigns]/[God Beast]"),
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("draws and optionally plays a unique Deva into breeding on play", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Draw", controller: "mine", amount: 1 },
      {
        kind: "PlayWithoutCost",
        breeding: true,
        optional: true,
        notSameNameAs: ["battleArea", "trash"],
        from: ["hand"],
      },
    ]);
  });
  it("deletes an opposing Digimon at 5000 DP or less on deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 5000 } } },
    });
  });
  it("grants Security Attack plus one to the inherited Digimon with the qualifying trait", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions?.[0]).toMatchObject({
      kind: "Aura",
      target: { filter: { isSelfRef: true }, isSelf: true },
      effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: 1 } },
      while: {
        kind: "selfHasTrait",
        filter: { nameOrTrait: [{ match: "trait", tokens: ["Four Sovereigns", "God Beast"] }] },
      },
    });
  });

  it("draws and puts a unique Deva into breeding, while rejecting a duplicate name", async () => {
    const resolve = async (candidate: string, expectPlacement: boolean) => {
      const s = setupEngine(
        {
          0: {
            hand: [
              { card: "EX5-010", as: "sandiramon" },
              { card: candidate, as: "candidate" },
            ],
            deck: [{ card: "BT1-010", as: "drawn" }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      s.state.memory = 7;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sandiramon").instanceId })).toEqual({
        ok: true,
      });
      if (expectPlacement) {
        await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("candidate").instanceId, 500);
      } else {
        await drainMicrotasks(500);
      }
      const placed = s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("candidate").instanceId;
      expect(placed).toBe(expectPlacement);
      expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("candidate").instanceId)).toBe(
        !expectPlacement,
      );
      return placed;
    };

    expect(await resolve("EX5-009", true)).toBe(true);
    expect(await resolve("EX5-010", false)).toBe(false);
  });

  it("covers Q3537/Q3538 name scope: battle area and trash count, stacked cards do not", async () => {
    const cases = [
      {
        label: "battle area",
        board: { battleArea: [{ card: "BT10-079", as: "sameName" }] },
        candidate: "BT10-079",
        placed: false,
      },
      { label: "trash", board: { trash: ["BT10-079"] }, candidate: "BT10-079", placed: false },
      {
        label: "under Digimon and Tamer",
        board: {
          battleArea: [
            { card: "BT1-009", as: "digimonHost", under: ["BT10-079"] },
            { card: "EX5-064", as: "tamerHost", under: ["BT10-079"] },
          ],
        },
        candidate: "EX5-009",
        placed: true,
      },
    ];

    for (const scenario of cases) {
      const s = setupEngine(
        {
          0: {
            ...scenario.board,
            hand: [
              { card: "EX5-010", as: "sandiramon" },
              { card: scenario.candidate, as: "candidate" },
            ],
            deck: [{ card: "BT1-010", as: "drawn" }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      s.state.memory = 20;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sandiramon").instanceId })).toEqual({
        ok: true,
      });
      if (scenario.placed) {
        await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("candidate").instanceId);
      } else {
        await drainMicrotasks(500);
      }
      const placed = s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("candidate").instanceId;
      expect(placed).toBe(scenario.placed);
      expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("candidate").instanceId)).toBe(
        !scenario.placed,
      );
      expect(s.state.players[0]!.hand).toContainEqual(
        expect.objectContaining({ instanceId: s.inst("drawn").instanceId }),
      );
      expect(s.state.pendingDecision).toBeUndefined();
    }
  });

  it("counts an Option placed in the battle area without treating stacked cards as name matches", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-010", as: "sandiramon" },
            { card: "EX5-009", as: "candidate" },
            { card: "EX5-071", as: "option" },
          ],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.placeOptionAsPermanent(s.inst("option").instanceId);
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("option").instanceId),
    ).toBe(true);
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sandiramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("candidate").instanceId);
    expect(s.state.players[0]!.breeding?.topCard?.instanceId).toBe(s.inst("candidate").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("answers Q3539/Q3541: breeding effect-play fires neither the candidate On Play nor when-played watchers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "watcherHost", under: ["EX5-006"] }],
          hand: [
            { card: "EX5-010", as: "sandiramon" },
            { card: "EX5-051", as: "candidate" },
          ],
          deck: [
            { card: "BT1-010", as: "drawnBySandiramon" },
            { card: "BT1-011", as: "watcherDraw" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sandiramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("candidate").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("watcherDraw").instanceId]);
    expect(s.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("drawnBySandiramon").instanceId }),
    );
    expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "EX5-051")).toBe(false);
    expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "EX5-006")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("answers Q3540: a breeding play moved out this turn still cannot attack", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-010", as: "sandiramon" },
            { card: "EX5-009", as: "candidate" },
            { card: "P-130", as: "lui" },
          ],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sandiramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("candidate").instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lui").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("candidate").instanceId),
    );
    const attack = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.state.players[0]!.battleArea.find(
        (perm) => perm.topCard?.instanceId === s.inst("candidate").instanceId,
      )!.permanentId,
      target: { kind: "player" },
    });
    expect(attack.ok).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("answers Q3542: an effect-play restriction prevents the breeding play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-010", as: "sandiramon" },
            { card: "EX5-009", as: "candidate" },
          ],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT9-047", as: "pomumon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sandiramon").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("candidate").instanceId }),
    );
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("drawn").instanceId }),
    );
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("draws but leaves the optional Deva in hand when the breeding play is declined", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-010", as: "sandiramon" },
            { card: "EX5-009", as: "candidate" },
          ],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sandiramon").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("candidate").instanceId }),
    );
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("drawn").instanceId }),
    );
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("deletes an opposing Digimon at exactly 5000 DP but preserves one above the boundary", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX5-010", as: "sandiramon", dp: 5000, suspended: true }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attacker", dp: 20000 },
            { card: "BT1-010", as: "atBoundary", dp: 5000 },
            { card: "BT1-011", as: "aboveBoundary", dp: 5001 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const atBoundaryId = s.perm("atBoundary").permanentId;
    const aboveBoundaryId = s.perm("aboveBoundary").permanentId;
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("sandiramon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === atBoundaryId), 500);
    expect(s.state.players[0]!.trash).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("sandiramon").instanceId }),
    );
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === atBoundaryId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === aboveBoundaryId)).toBe(true);
  });

  it("grants inherited Security Attack only to a Four Sovereigns host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX5-013", as: "qualified", under: ["EX5-010"] },
            { card: "BT1-009", as: "plain", under: ["EX5-010"] },
          ],
        },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("qualified"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).keywordAmount(s.perm("plain"), "SecurityAttack")).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("supports a legal Four Sovereigns evolution and rejects an illegal source", async () => {
    const legal = setupEngine({
      0: { battleArea: [{ card: "EX5-010", as: "base" }], hand: [{ card: "EX5-013", as: "evolution" }] },
    });
    await legal.ready();
    legal.state.memory = 10;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("base").topCard?.cardId === "EX5-013");
    expect(legal.perm("base").stack.map((card) => card.cardId)).toEqual(["EX5-010"]);
    expect(legal.state.memory).toBe(6);
    expect(observe(legal.engine).keywordAmount(legal.perm("base"), "SecurityAttack")).toBe(1);

    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-014", as: "base" }], hand: [{ card: "EX5-013", as: "evolution" }] },
    });
    await illegal.ready();
    illegal.state.memory = 10;
    const result = illegal.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: illegal.perm("base").permanentId,
      instanceId: illegal.inst("evolution").instanceId,
    });
    expect(result.ok).toBe(false);
    expect(illegal.perm("base").topCard?.cardId).toBe("BT1-014");
    expect(illegal.perm("base").stack).toHaveLength(0);
    expect(illegal.state.memory).toBe(10);
    expect(illegal.state.pendingDecision).toBeUndefined();
  });
});
