import { describe, expect, it } from "vitest";
import type { DecisionResponse } from "@aegis/shared";
import { setupEngine, settle, type EngineSetup, type SetupEngineOptions } from "../../engine/testkit/harness.js";
import "./BT15-081.js";
import { compiled } from "./BT15-100.js";

describe("BT15-100", () => {
  it("deletes an opposing level 4 and level 6 Digimon, paying for the first by trashing a hand card", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Main",
      actions: [
        {
          kind: "CostGatedBlock",
          cost: { kind: "trash" },
          actions: [
            {
              kind: "Delete",
              target: { filter: { levels: [4] } },
              additionalSimultaneousTargets: [{ filter: { levels: [6] } }],
            },
          ],
        },
      ],
    });
  });
  it("from trash reacts to a Leviamon X Antibody digivolution and returns itself to the bottom", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "AllTurns",
      isFromTrash: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          actions: [
            {
              kind: "CostGatedBlock",
              cost: { kind: "return" },
              actions: [{ kind: "Delete", additionalSimultaneousTargets: [{ filter: { levels: [6] } }] }],
            },
          ],
        },
      ],
    }));

  // Vilemon and Piemon are deleted at the same time, so Vilemon can delete itself to keep the
  // [Dark Masters] Piemon in play (Discord 1557502317098573905; ruling pattern of Q6463).
  it("naturally trashes a hand card and deletes both levels at once, letting Vilemon save Piemon from Main", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-068", as: "source" }],
          hand: [
            { card: "BT15-100", as: "option" },
            { card: "BT15-069", as: "cost" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT15-072", as: "level4" },
            { card: "BT15-079", as: "level6" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    const level4Id = s.perm("level4").permanentId;
    const level6Id = s.perm("level6").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((p) => p.permanentId === level4Id) &&
        s.state.pendingDecision === undefined,
    );

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === level4Id)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === level6Id)).toBe(true);
  });

  it("naturally resolves the Trash trigger on Leviamon (X Antibody) digivolution, deleting both levels at once", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-077", as: "base" }],
          hand: [{ card: "BT15-081", as: "leviamon" }],
          trash: [{ card: "BT15-100", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT15-072", as: "level4" },
            { card: "BT15-079", as: "level6" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    const leviamonInstanceId = s.inst("leviamon").instanceId;
    const optionInstanceId = s.inst("option").instanceId;
    const level4Id = s.perm("level4").permanentId;
    const level6Id = s.perm("level6").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: leviamonInstanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard?.instanceId === leviamonInstanceId &&
        !s.state.players[1]!.battleArea.some((p) => p.permanentId === level4Id) &&
        s.state.pendingDecision === undefined,
    );

    expect(s.perm("base").topCard?.instanceId).toBe(leviamonInstanceId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionInstanceId)).toBe(false);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(optionInstanceId);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === level4Id)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === level6Id)).toBe(true);
  });
});

const LEVEL_3 = "BT1-009";
const LEVEL_4 = "BT1-014";
const LEVEL_5 = "BT1-020";
const LEVEL_6 = "BT1-080";
const OPPONENT_TAMER = "BT15-083";

async function respondTo(s: EngineSetup, response: DecisionResponse): Promise<{ ok: boolean }> {
  await settle(() => s.state.pendingDecision !== undefined);
  return s.engine.applyIntent(0, {
    type: "respondDecision",
    decisionId: s.state.pendingDecision!.decisionId,
    response,
  });
}

function battleAreaIds(s: EngineSetup, seat: 0 | 1): string[] {
  return s.state.players[seat]!.battleArea.map(({ permanentId }) => permanentId);
}

async function digivolveIntoLeviamon(optionZone: "hand" | "trash", options: SetupEngineOptions = {}) {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT15-077", as: "base" }],
        hand: [
          { card: "BT15-081", as: "leviamon" },
          ...(optionZone === "hand" ? [{ card: "BT15-100", as: "option" }] : []),
        ],
        trash: optionZone === "trash" ? [{ card: "BT15-100", as: "option" }] : [],
      },
      1: {
        battleArea: [
          { card: LEVEL_4, as: "level4" },
          { card: LEVEL_6, as: "level6" },
          { card: LEVEL_3, as: "level3" },
          { card: LEVEL_5, as: "level5" },
          { card: OPPONENT_TAMER, as: "tamer" },
        ],
      },
    },
    { autoSelectCards: true, autoAcceptOptional: true, ...options },
  );
  s.state.memory = 10;
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("leviamon").instanceId,
    }),
  ).toEqual({ ok: true });
  return s;
}

describe("BT15-100 Seventh Lightning — KB Q&A rulings", () => {
  it("must delete both a level 4 and a level 6 Digimon when the opponent has both, never just 1 (Q2597)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT15-068" }],
        hand: [{ card: "BT15-100", as: "option" }, { card: "BT15-069", as: "cost" }, { card: "BT15-069" }],
      },
      1: {
        battleArea: [
          { card: LEVEL_4, as: "level4" },
          { card: LEVEL_4, as: "otherLevel4" },
          { card: LEVEL_6, as: "level6" },
          { card: LEVEL_6, as: "otherLevel6" },
          { card: LEVEL_5, as: "level5" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();
    const level4Id = s.perm("level4").permanentId;
    const level6Id = s.perm("level6").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    expect(await respondTo(s, { kind: "optional", accept: true })).toEqual({ ok: true });
    expect(await respondTo(s, { kind: "selectCards", instanceIds: [s.inst("cost").instanceId] })).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    expect(s.decisions.at(-1)!.req.options).toMatchObject({ min: 1, max: 1 });
    expect(s.decisions.at(-1)!.req.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([level4Id, s.perm("otherLevel4").permanentId]),
    );
    expect(await respondTo(s, { kind: "chooseTargets", instanceIds: [] })).toMatchObject({ ok: false });
    expect(await respondTo(s, { kind: "chooseTargets", instanceIds: [level4Id] })).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    expect(s.decisions.at(-1)!.req.options).toMatchObject({ min: 1, max: 1 });
    expect(s.decisions.at(-1)!.req.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([level6Id, s.perm("otherLevel6").permanentId]),
    );
    expect(await respondTo(s, { kind: "chooseTargets", instanceIds: [] })).toMatchObject({ ok: false });
    expect(await respondTo(s, { kind: "chooseTargets", instanceIds: [level6Id] })).toEqual({ ok: true });
    await settle(() => !battleAreaIds(s, 1).includes(level6Id));

    expect(battleAreaIds(s, 1)).toEqual([
      s.perm("otherLevel4").permanentId,
      s.perm("otherLevel6").permanentId,
      s.perm("level5").permanentId,
    ]);
  });

  it("activates its {Trash} effect only while it is in the trash, not from the hand (Q5530)", async () => {
    const fromHand = await digivolveIntoLeviamon("hand");
    await settle(() => fromHand.perm("base").topCard?.cardId === "BT15-081");
    await settle(() => battleAreaIds(fromHand, 1).length === 2);
    await settle();

    expect(fromHand.state.pendingDecision).toBeUndefined();
    expect(fromHand.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      fromHand.inst("option").instanceId,
    ]);
    expect(battleAreaIds(fromHand, 1)).toEqual(
      expect.arrayContaining([fromHand.perm("level4").permanentId, fromHand.perm("level6").permanentId]),
    );

    const fromTrash = await digivolveIntoLeviamon("trash");
    const level4Id = fromTrash.perm("level4").permanentId;
    const level6Id = fromTrash.perm("level6").permanentId;
    await settle(
      () => !battleAreaIds(fromTrash, 1).includes(level4Id) && !battleAreaIds(fromTrash, 1).includes(level6Id),
    );

    expect(fromTrash.state.players[0]!.deck.at(-1)?.instanceId).toBe(fromTrash.inst("option").instanceId);
  });

  it("lets the player order its {Trash} effect and Leviamon (X Antibody)'s [When Digivolving] effect (Q5531)", async () => {
    async function resolveFirst(firstCardId: string): Promise<string[]> {
      const s = await digivolveIntoLeviamon("trash", { autoOrderTriggers: false });
      await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
      const options = s.decisions.at(-1)!.req.options!;
      const triggerKeys = options.triggerKeys!;
      const triggerCardIds = options.triggerCardIds!;
      expect([...triggerCardIds].sort()).toEqual(["BT15-081", "BT15-100"]);
      const firstIndex = triggerCardIds.indexOf(firstCardId);
      expect(
        await respondTo(s, {
          kind: "orderTriggers",
          order: [triggerKeys[firstIndex]!, triggerKeys[1 - firstIndex]!],
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.battleArea.length === 0);
      return s.state.players[1]!.trash.map(({ cardId }) => cardId);
    }

    const optionFirst = await resolveFirst("BT15-100");
    expect(optionFirst.slice(0, 2).sort()).toEqual([LEVEL_4, LEVEL_6].sort());

    const leviamonFirst = await resolveFirst("BT15-081");
    expect(leviamonFirst.slice(0, 3).sort()).toEqual([LEVEL_3, LEVEL_5, OPPONENT_TAMER].sort());
    expect(leviamonFirst.slice(3).sort()).toEqual([LEVEL_4, LEVEL_6].sort());
  });
});

describe("GitHub #4919 — Seventh Lightning cost without a level 4", () => {
  it("returns the trash source to deck bottom before deleting a level 6 even with no level 4", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-077", as: "base" }],
          hand: [{ card: "BT15-081", as: "levia" }],
          trash: [{ card: "BT15-100", as: "lightning" }],
        },
        1: { battleArea: [{ card: "BT15-079", as: "six" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("levia").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "BT15-100"));
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("lightning").instanceId);
    expect(s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("lightning").instanceId)).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
