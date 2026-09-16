import { EffectTiming, getCardDefinition, type CardInstance } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter/matching/definition.js";
import { settle, setupEngine, type BoardSpec, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-065.js";

function handMainEffectKey(s: EngineSetup, instance: CardInstance): string {
  const source = observe(s.engine).cardSource(instance);
  return effectsOf(EffectTiming.OnDeclaration, source).find((effect) => effect.effectKey.startsWith("BT23-065/"))!
    .effectKey;
}

function handMainBoard(ghostmonCardId: string, withTamer: boolean): BoardSpec {
  return {
    0: {
      battleArea: [
        { card: ghostmonCardId, as: "ghostmon" },
        ...(withTamer ? [{ card: "BT23-087", as: "violet" }] : []),
      ],
      hand: [{ card: "BT23-065", as: "phantomon" }],
      trash: [{ card: "BT23-064", as: "bakemon" }],
    },
  };
}

describe("BT23-065 Phantomon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-065")).toMatchObject({
      cardId: "BT23-065",
      nameEn: "Phantomon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Purple", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Ghost", "LIBERATOR"],
    });
    const printed = (text: string | undefined) => (text ?? "").replace(/\u00a0/g, " ");
    expect(printed(getCardDefinition("BT23-065")!.effectText)).toBe(
      "[Hand] [Main] If you have [Violet Inboots], by placing 1 [Bakemon] from your trash as any of your [Ghostmon]'s bottom digivolution card, it digivolves into this card for a digivolution cost of 3, ignoring digivolution requirements.\n[On Deletion] You may play 1 level 4 or lower Digimon card with the [Ghost] trait from your trash without paying the cost.",
    );
    expect(printed(getCardDefinition("BT23-065")!.inheritedEffectText)).toBe(
      "[On Deletion] You may play 1 level 4 or lower Digimon card with the [Ghost] trait from your trash without paying the cost.",
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("places Bakemon under Ghostmon, digivolves into itself and pays the printed 3", async () => {
    const s = setupEngine(handMainBoard("BT23-061", true), {
      autoSelectCards: true,
      autoDeclineOptional: true,
    });
    await s.ready();
    s.state.memory = 5;
    const phantomonId = s.inst("phantomon").instanceId;
    const bakemonId = s.inst("bakemon").instanceId;
    const ghostmonId = s.inst("ghostmon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: phantomonId,
        effectKey: handMainEffectKey(s, s.inst("phantomon")),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ghostmon").topCard?.instanceId === phantomonId);

    expect(getCardDefinition("BT23-061")!.level).toBe(3);
    expect([...s.perm("ghostmon").stack, s.perm("ghostmon").topCard!].map((card) => card.instanceId)).toEqual([
      bakemonId,
      ghostmonId,
      phantomonId,
    ]);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([]);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("pays 2 when the Ghostmon host reduces the cost (Q5334)", async () => {
    const s = setupEngine(handMainBoard("BT21-065", true), {
      autoSelectCards: true,
      autoDeclineOptional: true,
    });
    await s.ready();
    s.state.memory = 5;
    const phantomonId = s.inst("phantomon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: phantomonId,
        effectKey: handMainEffectKey(s, s.inst("phantomon")),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ghostmon").topCard?.instanceId === phantomonId);

    expect([...s.perm("ghostmon").stack, s.perm("ghostmon").topCard!].map((card) => card.cardId)).toEqual([
      "BT23-064",
      "BT21-065",
      "BT23-065",
    ]);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("lets the controller pick which of two [Ghostmon] hosts receives Bakemon and Phantomon", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-061", as: "firstGhostmon" },
            { card: "BT23-061", as: "secondGhostmon" },
            { card: "BT23-087", as: "violet" },
          ],
          hand: [{ card: "BT23-065", as: "phantomon" }],
          trash: [{ card: "BT23-064", as: "bakemon" }],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true, preferInstanceIds },
    );
    await s.ready();
    preferInstanceIds.push(s.perm("secondGhostmon").topCard!.instanceId);
    s.state.memory = 5;
    const phantomonId = s.inst("phantomon").instanceId;
    const bakemonId = s.inst("bakemon").instanceId;
    const secondId = s.inst("secondGhostmon").instanceId;
    const firstId = s.inst("firstGhostmon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: phantomonId,
        effectKey: handMainEffectKey(s, s.inst("phantomon")),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("secondGhostmon").topCard?.instanceId === phantomonId);

    expect(
      [...s.perm("secondGhostmon").stack, s.perm("secondGhostmon").topCard!].map((card) => card.instanceId),
    ).toEqual([bakemonId, secondId, phantomonId]);
    expect(
      s.decisions.some(({ req }) => {
        const candidates = req.options?.candidateInstanceIds ?? [];
        return (
          candidates.includes(s.perm("firstGhostmon").permanentId) &&
          candidates.includes(s.perm("secondGhostmon").permanentId)
        );
      }),
    ).toBe(true);
    expect(s.perm("firstGhostmon").topCard!.instanceId).toBe(firstId);
    expect(s.perm("firstGhostmon").stack).toHaveLength(0);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses the hand Main effect without Violet Inboots", async () => {
    const s = setupEngine(handMainBoard("BT21-065", false), { autoSelectCards: true });
    await s.ready();
    s.state.memory = 5;
    const phantomonId = s.inst("phantomon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: phantomonId,
        effectKey: handMainEffectKey(s, s.inst("phantomon")),
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    await settle();

    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([phantomonId]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT23-064"]);
    expect(s.perm("ghostmon").stack.map((card) => card.instanceId)).toEqual([]);
  });

  it("does not count a Violet Inboots that is only in the trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-065", as: "ghostmon" }],
          hand: [{ card: "BT23-065", as: "phantomon" }],
          trash: [
            { card: "BT23-064", as: "bakemon" },
            { card: "BT23-087", as: "violet" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("phantomon").instanceId,
        effectKey: handMainEffectKey(s, s.inst("phantomon")),
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    await settle();
    expect(s.state.memory).toBe(5);
    expect(s.perm("ghostmon").stack.map((card) => card.instanceId)).toEqual([]);
  });

  it("refuses the hand Main effect with no [Ghostmon] host on the board", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-064", as: "notGhostmon" },
            { card: "BT23-087", as: "violet" },
          ],
          hand: [{ card: "BT23-065", as: "phantomon" }],
          trash: [{ card: "BT23-064", as: "bakemon" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("phantomon").instanceId,
        effectKey: handMainEffectKey(s, s.inst("phantomon")),
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    await settle();
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT23-064"]);
  });

  it("refuses the hand Main effect with no [Bakemon] in the trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-065", as: "ghostmon" },
            { card: "BT23-087", as: "violet" },
          ],
          hand: [{ card: "BT23-065", as: "phantomon" }],
          trash: [{ card: "BT23-062", as: "notBakemon" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("phantomon").instanceId,
        effectKey: handMainEffectKey(s, s.inst("phantomon")),
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    await settle();
    expect(s.state.memory).toBe(5);
    expect(s.perm("ghostmon").stack.map((card) => card.instanceId)).toEqual([]);
  });

  it("refuses activation while another digivolving effect is resolving (Q5335)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT21-065", as: "ghostmon" },
          { card: "BT23-087", as: "violet" },
        ],
        hand: [{ card: "BT23-065", as: "phantomon" }],
        trash: [{ card: "BT23-064", as: "bakemon" }],
      },
    });
    await s.ready();
    s.state.memory = 5;
    const phantomonKey = handMainEffectKey(s, s.inst("phantomon"));

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("phantomon").instanceId,
        effectKey: phantomonKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision !== undefined);
    expect(s.state.pendingDecision).toBeDefined();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("phantomon").instanceId,
        effectKey: phantomonKey,
      }),
    ).toEqual({ ok: false, reason: "decision-pending" });
  });

  it("matches bracketed card names exactly, not by substring", () => {
    const near = [
      { cardId: "TEST-001", nameEn: "Bakemon X", token: "Bakemon" },
      { cardId: "TEST-002", nameEn: "DarkGhostmon", token: "Ghostmon" },
      { cardId: "TEST-003", nameEn: "Violet Inboots Ace", token: "Violet Inboots" },
    ];
    for (const { cardId, nameEn, token } of near) {
      expect(matchNameOrTrait({ cardId, nameEn }, { tokens: [token], match: "name" })).toBe(true);
      expect(matchNameOrTrait({ cardId, nameEn }, { tokens: [token], match: "nameExact" })).toBe(false);
      expect(matchNameOrTrait({ cardId, nameEn: token }, { tokens: [token], match: "nameExact" })).toBe(true);
    }
    const main = compiled.effects.find((entry) => entry.trigger === "Main")!;
    expect((main as { condition?: unknown }).condition).toMatchObject({
      kind: "youHave",
      filter: { zone: "battleArea", nameOrTrait: [{ tokens: ["Violet Inboots"], match: "nameExact" }] },
    });
    expect(main.actions[0]).toMatchObject({
      kind: "PlaceUnder",
      target: { filter: { zone: "trash", nameOrTrait: [{ tokens: ["Bakemon"], match: "nameExact" }] }, count: 1 },
      underFilter: { controller: "mine", nameOrTrait: [{ tokens: ["Ghostmon"], match: "nameExact" }] },
      position: "bottom",
      bindHostAs: "ghostmonHost",
    });
    expect(main.actions[1]).toMatchObject({
      kind: "Digivolve",
      target: { fromSelectionRef: "ghostmonHost" },
      from: ["hand"],
      source: "triggerSource",
      costOverride: 3,
      payCost: true,
      ignoreRequirements: true,
    });
    expect((main as { isFromHand?: boolean }).isFromHand).toBe(true);
  });

  it("plays a level-4 Ghost from trash for free after a real combat deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-065", as: "phantomon" }],
          trash: [
            { card: "BT4-080", as: "ghost" },
            { card: "BT20-072", as: "tooHigh" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "wall", dp: 12000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    const phantomonId = s.inst("phantomon").instanceId;
    const ghostId = s.inst("ghost").instanceId;
    const highId = s.inst("tooHigh").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("phantomon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === ghostId));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([highId, phantomonId]);
    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === ghostId);
    expect(played).toBeDefined();
    expect(played!.stack.map((card) => card.instanceId)).toEqual([]);
    expect(getCardDefinition("BT4-080")!.playCost).toBe(5);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("wall").instanceId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("leaves the trash untouched when the optional On Deletion play is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-065", as: "phantomon" }],
          trash: [{ card: "BT4-080", as: "ghost" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "wall", dp: 12000, suspended: true }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const phantomonId = s.inst("phantomon").instanceId;
    const ghostId = s.inst("ghost").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("phantomon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === phantomonId));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual([ghostId, phantomonId].sort());
    expect(s.state.players[0]!.battleArea.map((p) => p.permanentId)).toEqual([]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("runs the inherited On Deletion from under a host after a real combat deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-010", under: ["BT23-065"], as: "host" }],
          trash: [{ card: "BT4-080", as: "ghost" }],
        },
        1: { battleArea: [{ card: "BT1-011", as: "wall", dp: 12000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const ghostId = s.inst("ghost").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === ghostId));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === ghostId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("compiles both On Deletion copies with the printed filter", () => {
    const deletions = compiled.effects.filter((entry) => entry.trigger === "OnDeletion");
    expect(deletions).toHaveLength(2);
    expect(deletions.filter((entry) => (entry as { isInherited?: boolean }).isInherited === true)).toHaveLength(1);
    for (const effect of deletions) {
      expect(effect.actions[0]).toMatchObject({
        kind: "PlayWithoutCost",
        from: ["trash"],
        payCost: false,
        optional: true,
        target: {
          count: 1,
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            levelComparison: { op: "lte", value: 4 },
            nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }],
          },
        },
      });
    }
  });
});
