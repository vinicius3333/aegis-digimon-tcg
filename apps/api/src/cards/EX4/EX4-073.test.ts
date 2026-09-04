import { describe, expect, it } from "vitest";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import {
  CardKind,
  EffectTiming,
  getCardDefinition,
  type CardDefinition,
  type CardInstance,
  type GameState,
  type Permanent,
  type Seat,
} from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { compiled } from "./EX4-073.js";
import { advance } from "../../engine/testkit/advance.js";
import { makeInstance, setupEngine, settle } from "../../engine/testkit/harness.js";
import { pushOnStack } from "../../engine/state/access.js";
import "../BT14/BT14-062.js";

describe("EX4-073 Omnimon Alter-B", () => {
  it("registers mandatory When Digivolving and optional When Attacking effects", () => {
    expect(getCardDefinition("EX4-073")).toMatchObject({
      cardId: "EX4-073",
      nameEn: "Omnimon Alter-B",
      colors: ["Black"],
      level: 7,
      playCost: 15,
      dp: 15000,
      evoCosts: [{ color: "Black", level: 6, memoryCost: 5 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Holy Warrior"],
    });
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

  it("digivolves normally from a black level-6 Digimon for 5", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "AD1-004", as: "base" }],
        hand: [{ card: "EX4-073", as: "alterB" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("alterB").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX4-073");

    expect(s.state.memory).toBe(0);
  });

  it("digivolves from a level-7 Omnimon in name for 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-084", as: "omnimon" }],
        hand: [{ card: "EX4-073", as: "alterB" }],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("omnimon").permanentId,
        instanceId: s.inst("alterB").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("omnimon").topCard.cardId === "EX4-073");

    expect(s.state.memory).toBe(0);
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

  it("uses the public When Digivolving path and never exceeds the six-play-cost deletion budget", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX4-073", as: "subject" }], security: ["BT1-001", "BT1-002"] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "cost2" },
            { card: "BT1-013", as: "cost3" },
            { card: "BT1-019", as: "cost6" },
          ],
          security: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("subject"));
    await settle(() => s.state.players[1]!.battleArea.length < 3);
    expect(s.state.players[1]!.battleArea.map((perm) => perm.topCard.cardId)).toEqual(["BT1-019"]);
  });

  it("uses the public attack path for the full three-material exclusion budget", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-073", as: "attacker", under: ["EX4-048", "EX4-049", "EX4-051"] }],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "cost2" },
            { card: "BT1-013", as: "cost3" },
            { card: "BT1-019", as: "cost6" },
          ],
          security: ["BT1-001", "BT1-002", "BT1-003", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[0]!.battleArea[0]!.stack).toHaveLength(0);
  });

  it("Q3522 retries the protected lowest-cost Datamon instead of deleting the next target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-073", as: "attacker", under: ["AD1-004", "AD1-012"] }],
        },
        1: {
          battleArea: [
            { card: "BT14-062", as: "datamon" },
            { card: "AD1-003", as: "costSeven" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("attacker"), {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    await settle(() => s.perm("attacker").stack.length === 0);

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId).sort()).toEqual([
      "AD1-003",
      "BT14-062",
    ]);
  });

  it("Q6033 keeps the three-card security condition local to one activation", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX4-073",
              as: "attacker",
              under: [{ card: "AD1-004", as: "firstMaterial" }],
            },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstTarget" },
            { card: "BT1-010", as: "secondTarget" },
            { card: "BT1-011", as: "thirdTarget" },
          ],
          security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("attacker"), {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    await settle(() => s.perm("attacker").stack.length === 0);

    pushOnStack(s.perm("attacker"), makeInstance("AD1-012", 0, true));
    pushOnStack(s.perm("attacker"), makeInstance("BT10-067", 0, true));
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("attacker"), {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    await settle(() => s.perm("attacker").stack.length === 0);

    expect(s.perm("attacker").stack).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(4);
  });
  ex4CardBehaviorTests("EX4-073");
});
