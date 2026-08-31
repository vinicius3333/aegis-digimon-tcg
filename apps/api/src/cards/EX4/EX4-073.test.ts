import { describe, expect, it } from "vitest";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import {
  CardKind,
  EffectTiming,
  type CardDefinition,
  type CardInstance,
  type GameState,
  type Permanent,
  type Seat,
} from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { compiled } from "./EX4-073.js";

describe("EX4-073 Omnimon Alter-B", () => {
  it("registers mandatory When Digivolving and optional When Attacking effects", () => {
    const source = {
      instanceId: "source",
      cardId: "EX4-073",
      ownerSeat: 0,
      definition: {},
      permanent: () => undefined,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    } as never;
    const module = getEffectModule("EX4-073")!;
    const digivolving = module.effectsForTiming(EffectTiming.WhenDigivolving, source);
    const attacking = module.effectsForTiming(EffectTiming.OnUseAttack, source);
    expect(digivolving).toHaveLength(1);
    expect(digivolving[0]?.optional).toBe(false);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.isInherited).not.toBe(true);
    expect(attacking).toHaveLength(1);
    expect(attacking[0]?.optional).toBe(true);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.condition).toMatchObject({
      kind: "selfDigivolutionStackMatchesFilter",
      filter: { kind: ["Digimon"], levelComparison: { op: "gte", value: 6 } },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions?.[0]?.optional).not.toBe(true);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 7, names: ["Omnimon"], cost: 2, isAlternate: true }]);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[1]).toMatchObject({
      kind: "DeleteBudget",
      minimum: 1,
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions?.[0]).toMatchObject({
      kind: "TrashDigivolution",
      amount: 3,
      upTo: true,
      minAmount: 1,
      choose: true,
      cardFilter: { kind: ["Digimon"], levelComparison: { op: "gte", value: 6 } },
    });
  });

  it("trashes three level-six materials, deletes lowest-cost Digimon/Tamers sequentially, and trashes two security", async () => {
    const card = (id: string, seat: Seat): CardInstance =>
      ({ cardId: id, instanceId: `${id}-${seat}`, ownerSeat: seat, faceUp: true }) as CardInstance;
    const def = (id: string, kind: CardKind, level = 5, cost = 5): CardDefinition => ({
      cardId: id,
      set: "TEST",
      nameEn: id,
      kinds: [kind],
      colors: ["Black"] as never,
      playCost: cost,
      dp: 1000,
      level,
      evoCosts: [],
      maxCountInDeck: 4,
    });
    const self = {
      permanentId: "self",
      controllerSeat: 0,
      topCard: card("EX4-073", 0),
      stack: [card("L6A", 0), card("L6B", 0), card("L6C", 0)],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const targets = ["tamer", "digimon", "expensive"].map(
      (id) =>
        ({
          permanentId: id,
          controllerSeat: 1,
          topCard: card(id, 1),
          stack: [],
          linked: [],
          isSuspended: false,
          inBreeding: false,
        }) as unknown as Permanent,
    );
    const players = [
      {
        battleArea: [self],
        security: [card("SEC1", 1), card("SEC2", 1), card("SEC3", 1)],
        hand: [],
        deck: [],
        trash: [],
      },
      {
        battleArea: targets,
        security: [card("OPPSEC1", 1), card("OPPSEC2", 1), card("OPPSEC3", 1)],
        hand: [],
        deck: [],
        trash: [],
      },
    ];
    const defs = new Map<string, CardDefinition>([
      ["EX4-073", def("EX4-073", CardKind.Digimon, 7, 15)],
      ["L6A", def("L6A", CardKind.Digimon, 6)],
      ["L6B", def("L6B", CardKind.Digimon, 6)],
      ["L6C", def("L6C", CardKind.Digimon, 6)],
      ["tamer", def("tamer", CardKind.Tamer, undefined, 2)],
      ["digimon", def("digimon", CardKind.Digimon, 4, 3)],
      ["expensive", def("expensive", CardKind.Digimon, 5, 7)],
    ]);
    const deleted: string[][] = [];
    const trashed: unknown[] = [];
    const securityTrash: unknown[] = [];
    const game = {
      state: { memory: 0, players, turnSeat: 0 as Seat } as unknown as GameState,
      player: (seat: Seat) => players[seat] as never,
      opponentOf: () => 1 as Seat,
      permanentById: (id: string) => [self, ...targets].find((p) => p.permanentId === id),
      definitionOf: (c: CardInstance) => defs.get(c.cardId)!,
    } as never;
    const source = {
      instanceId: self.topCard!.instanceId,
      cardId: "EX4-073",
      ownerSeat: 0 as Seat,
      definition: defs.get("EX4-073")!,
      permanent: () => self,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    } as never;
    const effect = getEffectModule("EX4-073")!.effectsForTiming(EffectTiming.OnUseAttack, source)[0]!;
    await effect.resolve({
      source,
      trigger: {},
      game,
      fx: {
        trashDigivolutionCards: async (...args: unknown[]) => trashed.push(args),
        deletePermanent: async (ids: string[]) => {
          deleted.push(ids);
          const index = targets.findIndex((p) => p.permanentId === ids[0]);
          if (index >= 0) targets.splice(index, 1);
        },
        trashFromSecurity: async (...args: unknown[]) => securityTrash.push(args),
      } as never,
      ask: {
        optional: async () => true,
        chooseOption: async () => 0,
        chooseTargets: async (_ctx: unknown, options: { candidates: string[] }) => [options.candidates[0]!],
        selectCards: async (_ctx: unknown, options: { candidates: string[] }) => options.candidates,
        selectPermanents: async () => [],
      },
    } as never);
    expect(trashed).toHaveLength(1);
    expect(deleted).toEqual([["tamer"], ["digimon"], ["expensive"]]);
    expect(securityTrash).toEqual([[1, 2, { fromTop: true }]]);
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-073");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });
  ex4CardBehaviorTests("EX4-073");
});
