import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-220.js";

describe("P-220 Millenniummon", () => {
  it("provides Reboot and Blocker continuously", () => {
    const effects = getEffectModule("P-220")!.effectsForTiming(EffectTiming.None, {
      isOnBattleArea: () => true,
    } as unknown as CardSource);
    expect(effects.map((effect) => effect.effectKey)).toEqual(["P-220/reboot", "P-220/blocker"]);
  });

  it("returns three cost cards and only offers played trash Digimon at different levels", async () => {
    const cards = [
      { instanceId: "cost-1", cardId: "C1" },
      { instanceId: "cost-2", cardId: "C2" },
      { instanceId: "cost-3", cardId: "C3" },
      { instanceId: "play-5", cardId: "P5" },
      { instanceId: "play-5b", cardId: "P5B" },
      { instanceId: "play-6", cardId: "P6" },
    ];
    const definitions: Record<string, Record<string, unknown>> = {
      C1: { kinds: [], types: ["Composite"] },
      C2: { kinds: [], types: ["DM"] },
      C3: { kinds: [], types: ["Wicked God"] },
      P5: { kinds: ["Digimon"], level: 5, types: ["Composite"] },
      P5B: { kinds: ["Digimon"], level: 5, types: ["Ver.3"] },
      P6: { kinds: ["Digimon"], level: 6, types: ["Ver.5"] },
    };
    const owner = { trash: cards.slice(), battleArea: [], hand: [], deck: [], security: [], eggDeck: [] };
    const opponent = { trash: [], battleArea: [], hand: [], deck: [], security: [], eggDeck: [] };
    const selections: string[][] = [];
    const played: string[][] = [];
    const effect = getEffectModule("P-220")!.effectsForTiming(EffectTiming.OnDestroyedAnyone, {
      ownerSeat: 0,
      definition: { effectText: "" },
    } as unknown as CardSource)[0]!;
    await effect.resolve({
      source: { ownerSeat: 0 } as unknown as CardSource,
      game: {
        player: (seat: number) => (seat === 0 ? owner : opponent),
        definitionOf: (card: { cardId: string }) => definitions[card.cardId],
        opponentOf: () => 1,
      } as unknown as GameAccess,
      ask: {
        optional: async () => true,
        selectCards: async (_ctx: unknown, options: { candidates: string[] }) => {
          selections.push(options.candidates);
          return selections.length === 1
            ? ["cost-1", "cost-2", "cost-3"]
            : selections.length === 2
              ? ["play-5"]
              : ["play-6"];
        },
      },
      fx: {
        returnToDeck: async () => {},
        playInstances: async (ids: string[]) => {
          played.push(ids);
        },
      },
    } as unknown as EffectContext);
    expect(selections[2]).toEqual(["play-6"]);
    expect(played).toEqual([["play-5", "play-6"]]);
  });
});

describe("P-220 continuous behavior", () => {
  it("exposes Reboot and Blocker on a resident Millenniummon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-220", as: "millenniummon" }] } });
    await s.ready();
    const ledger = (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } })
      .continuous;
    expect(ledger.hasKeyword(s.perm("millenniummon").permanentId, "Reboot")).toBe(true);
    expect(ledger.hasKeyword(s.perm("millenniummon").permanentId, "Blocker")).toBe(true);
  });
});

describe("P-220 engine behavior", () => {
  it("de-digivolves an opposing Digimon by two and permits declining the optional deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-220", as: "millenniummon" }] },
        1: { battleArea: [{ card: "BT1-080", as: "target", under: ["BT1-009", "BT1-070", "BT1-020"] }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("millenniummon"));
    await settle();
    expect(s.perm("target").stack).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("returns three qualifying trash cards and plays two different-level eligible Digimon on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-220", as: "millenniummon" }],
          trash: [
            "BT18-013",
            "BT22-049",
            "BT19-099",
            { card: "BT26-040", as: "level4" },
            { card: "BT22-060", as: "level5" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const beforeDeck = s.state.players[0]!.deck.length;
    await advance(s.engine).verb.deletePermanent([s.perm("millenniummon").permanentId]);
    await settle();
    expect(s.state.players[0]!.deck.length).toBe(beforeDeck + 3);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("level4").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("level5").instanceId)).toBe(true);
  });
});
