import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

const cardId = "EX11-051";

describe("EX11-051 Necromon", () => {
  it("preserves the printed card, keywords, lowest-level deletion, Ghost play, and deletion evolution", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Necromon",
      colors: ["Purple"],
      level: 6,
      playCost: 11,
      dp: 12000,
      evoCosts: [{ color: "Purple", level: 5, memoryCost: 3 }],
      types: ["Ghost", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [], digivolutionRequirement: [] });
    for (const keyword of ["Piercing", "Execute"]) {
      expect(compiled.effects.some((effect) => effect.keywords?.some((entry) => entry.keyword === keyword))).toBe(true);
    }
    for (const trigger of ["OnPlay", "WhenDigivolving", "OnDeletion"]) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger)!;
      expect(effect.actions).toMatchObject([
        { kind: "Delete", target: { filter: { controller: "opponent", superlative: "lowestLevel" } } },
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          optional: true,
          target: {
            filter: { levelComparison: { op: "lte", value: 4 }, nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }] },
          },
        },
      ]);
    }
    expect(compiled.effects.filter(({ trigger }) => trigger === "OnDeletion")[1]?.actions[0]).toMatchObject({
      kind: "Digivolve",
      from: ["hand"],
      payCost: false,
      optional: true,
      into: { nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }] },
    });
  });

  it("deletes exactly 1 lowest-level opponent and may play a level 4 or lower Ghost from trash", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "source" }], trash: [{ card: "BT20-063", as: "ghost" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low" },
            { card: "EX11-049", as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    expect(s.state.players[1]!.battleArea.map((card) => card.permanentId)).toEqual([s.perm("high").permanentId]);
    expect(s.state.players[0]!.battleArea.some((card) => card.topCard.cardId === "BT20-063")).toBe(true);
    assertNoLoudGap(s);
  });

  it("deletes exactly one Digimon when two opponents tie for the lowest level", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowA" },
            { card: "BT7-067", as: "lowB" },
            { card: "BT4-085", as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[1]!.battleArea.some((card) => card.topCard.cardId === "BT4-085")).toBe(true);
    assertNoLoudGap(s);
  });

  it("plays only a level 4 or lower Ghost from the trash, never a level 5 Ghost or a level 3 non-Ghost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          trash: [
            { card: "BT4-085", as: "ghostTooHigh" },
            { card: "BT1-009", as: "nonGhost" },
            { card: "BT4-080", as: "ghostInRange" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    const playedInRange = s.state.players[0]!.battleArea.some(
      (card) => card.topCard.instanceId === s.inst("ghostInRange").instanceId,
    );
    expect(playedInRange).toBe(true);
    for (const alias of ["ghostTooHigh", "nonGhost"]) {
      expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst(alias).instanceId)).toBe(true);
    }
    assertNoLoudGap(s);
  });

  it("still deletes when the optional trash play is refused", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "source" }], trash: [{ card: "BT4-080", as: "ghost" }] },
        1: { battleArea: [{ card: "BT1-009", as: "low" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("ghost").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("may evolve another Ghost into a Ghost from hand for free when Necromon is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "source" },
            { card: "BT20-063", as: "ghost" },
          ],
          hand: [{ card: "BT11-078", as: "soulmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId]);
    expect(s.perm("ghost").topCard.cardId).toBe("BT11-078");
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });
});
