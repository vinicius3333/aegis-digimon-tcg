import { describe, it, expect } from "vitest";
import { EffectTiming, type CardInstance, type Seat } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "./EX2-060.js";

// A3 for EX2-060 (Rika Nonaka):
//   [Your Turn] When you attack with [Renamon]/[Kyubimon]/[Taomon]/[Sakuyamon],
//     suspend this Tamer to use 1 [Plug-In] Option from hand without paying its cost.
//
// FAILS-WHEN-REVERTED: legacy IR leaves the whenAttacking SubTrigger body non-executable;
// body — no suspend call and no useOptionFromHand call are produced.

const PLUG_IN_ID = "ST9-016"; // A Plug-In Option card

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function card(instanceId: string, cardId: string, seat: Seat = 0): CardInstance {
  return { instanceId, cardId, ownerSeat: seat, faceUp: true } as CardInstance;
}

function makeSource(suspended = false): CardSource {
  return {
    instanceId: "self-inst",
    cardId: "EX2-060",
    ownerSeat: 0 as Seat,
    definition: {
      cardId: "EX2-060",
      set: "EX2",
      nameEn: "Rika Nonaka",
      kinds: ["Tamer"] as never,
      colors: ["Yellow"] as never,
      playCost: 3,
      dp: 0,
      evoCosts: [],
      maxCountInDeck: 4,
    },
    permanent: () =>
      ({
        permanentId: "SELF-PERM",
        controllerSeat: 0 as Seat,
        topCard: { instanceId: "self-inst", cardId: "EX2-060", ownerSeat: 0 as Seat, faceUp: true } as never,
        stack: [] as never,
        linked: [] as never,
        baseDP: 0,
        currentDP: 0,
        isSuspended: suspended,
        inBreeding: false,
      }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

type PermanentEntry = {
  permanentId: string;
  controllerSeat: Seat;
  topCard: CardInstance;
  isSuspended: boolean;
  inBreeding: boolean;
};

function makeCtx(
  recorder: Recorder,
  source: CardSource,
  opts: {
    ownerHand?: CardInstance[];
    attackerPermanentId?: string;
    attackerCardId?: string;
    memory?: number;
  } = {},
): EffectContext {
  const { ownerHand = [], attackerPermanentId = "attacker-perm", attackerCardId = "Renamon-card", memory = 3 } = opts;

  const attackerPerm: PermanentEntry = {
    permanentId: attackerPermanentId,
    controllerSeat: 0 as Seat,
    topCard: card(`${attackerPermanentId}-top`, attackerCardId, 0),
    isSuspended: false,
    inBreeding: false,
  };

  const players = [
    {
      seat: 0 as Seat,
      battleArea: [attackerPerm],
      security: [],
      hand: ownerHand.map((c) => ({ ...c })),
      deck: [],
      trash: [],
    },
    {
      seat: 1 as Seat,
      battleArea: [],
      security: [],
      hand: [],
      deck: [],
      trash: [],
    },
  ];

  const game: GameAccess = {
    state: { memory, players, turnSeat: 0 as Seat } as never,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    permanentById: (id: string) => (id === attackerPermanentId ? (attackerPerm as never) : undefined),
    definitionOf: (c: { cardId: string }) => {
      if (c.cardId === PLUG_IN_ID) {
        return { cardId: c.cardId, kinds: ["Option"], nameEn: "Plug-In S", playCost: 3 } as never;
      }
      if (c.cardId === "Renamon-card") {
        return { cardId: c.cardId, kinds: ["Digimon"], nameEn: "Renamon", level: 3, playCost: 3 } as never;
      }
      if (c.cardId === "Sakuyamon-card") {
        return { cardId: c.cardId, kinds: ["Digimon"], nameEn: "Sakuyamon", level: 6, playCost: 7 } as never;
      }
      return { cardId: c.cardId, kinds: ["Digimon"], nameEn: "Other", level: 4, playCost: 4 } as never;
    },
  };

  const fx = {
    suspend: async (...args: unknown[]) => {
      recorder.calls.push({ verb: "suspend", args });
      return args[0] as string[];
    },
    useOptionFromHand: async (...args: unknown[]) => {
      recorder.calls.push({ verb: "useOptionFromHand", args });
    },
    setMemory: (...args: unknown[]) => {
      recorder.calls.push({ verb: "setMemory", args });
    },
    playFromSecurity: async (...args: unknown[]) => {
      recorder.calls.push({ verb: "playFromSecurity", args });
    },
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };

  return {
    source,
    trigger: { attackerPermanentId },
    game,
    fx,
    ask,
  };
}

describe("EX2-060 Rika Nonaka", () => {
  it("registers full compiled IR without residuals", () => {
    const compiled = registeredCompiledCards.get("EX2-060");
    expect(compiled?.coverage).toBe("full");
    expect(compiled?.residual).toEqual([]);
  });
  const module = getEffectModule("EX2-060");

  it("is registered on import", () => {
    expect(module).toBeDefined();
  });

  it("produces 1 OnStartTurn effect", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.OnStartTurn, source)).toHaveLength(1);
  });

  it("produces 1 OnAllyAttack effect", () => {
    const effect = registeredCompiledCards.get("EX2-060")?.effects.find((entry) => entry.trigger === "YourTurn");
    expect(effect?.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenAttacking" });
  });

  it("does not impose an unprinted once-per-turn limit on attacks", () => {
    const effect = registeredCompiledCards.get("EX2-060")?.effects.find((entry) => entry.trigger === "YourTurn");
    expect(effect?.frequency).toBeUndefined();
  });

  it("[Start of Your Turn] sets memory to 3 when ≤ 2", async () => {
    const recorder: Recorder = { calls: [] };
    const source = makeSource();
    const ctx = makeCtx(recorder, source, { memory: 2 });

    const effects = module!.effectsForTiming(EffectTiming.OnStartTurn, source);
    await effects[0]!.resolve(ctx);

    expect(recorder.calls.filter((c) => c.verb === "setMemory")).toHaveLength(1);
    expect(recorder.calls.find((c) => c.verb === "setMemory")!.args[0]).toBe(3);
  });

  it("[When Attacking] suspends self and uses a Plug-In Option from hand", () => {
    const effect = registeredCompiledCards.get("EX2-060")?.effects.find((entry) => entry.trigger === "YourTurn");
    const action = effect?.actions[0] as { cost?: unknown; actions?: unknown[] };
    expect(action.cost).toEqual(expect.objectContaining({ kind: "suspend" }));
    expect(action.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "UseOptionWithoutCost", from: ["hand"], payCost: false }),
      ]),
    );
  });

  it("requires the Tamer suspension as the activation cost", () => {
    const effect = registeredCompiledCards.get("EX2-060")?.effects.find((entry) => entry.trigger === "YourTurn");
    const action = effect?.actions[0] as { cost?: { kind?: string; target?: { isSelf?: boolean } } };
    expect(action).toMatchObject({ cost: { kind: "suspend", target: { isSelf: true } } });
  });

  it("filters the used card to Plug-In Options", () => {
    const effect = registeredCompiledCards.get("EX2-060")?.effects.find((entry) => entry.trigger === "YourTurn");
    const actions = (effect?.actions[0] as { actions?: unknown[] } | undefined)?.actions ?? [];
    expect(actions[0]).toMatchObject({
      kind: "UseOptionWithoutCost",
      filter: { nameOrTrait: [{ tokens: ["Plug-In"], match: "name" }] },
    });
  });

  it("matches all four printed attacker names", () => {
    const effect = registeredCompiledCards.get("EX2-060")?.effects.find((entry) => entry.trigger === "YourTurn");
    const sourceFilter = (
      effect?.actions[0] as { sourceFilter?: { nameOrTrait?: { tokens?: string[] }[] } } | undefined
    )?.sourceFilter;
    expect(sourceFilter?.nameOrTrait?.[0]?.tokens).toEqual(["Renamon", "Kyubimon", "Taomon", "Sakuyamon"]);
  });

  it("publicly suspends Rika and uses a matching Plug-In Option when Renamon attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-019", as: "renamon" },
            { card: "EX2-060", as: "rika" },
          ],
          hand: [{ card: "P-095", as: "plugIn" }],
          deck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target" }], security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("renamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("rika").isSuspended && !s.state.players[0]!.hand.some((c) => c.cardId === "P-095"));
    expect(s.perm("rika").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.some((c) => c.cardId === "P-095")).toBe(false);
  });

  it("does not use the Plug-In Option when Rika is already suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-019", as: "renamon" },
            { card: "EX2-060", as: "rika", suspended: true },
          ],
          hand: [{ card: "P-095", as: "plugIn" }],
          deck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target" }], security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("renamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.hand.some((c) => c.cardId === "P-095")).toBe(true);
  });

  it("sets memory at Start of Your Turn only when memory is 2 or less", async () => {
    const eligible = setupEngine({
      0: { battleArea: [{ card: "EX2-060", as: "rika" }], deck: ["BT1-001"], security: ["BT1-002"] },
    });
    eligible.state.memory = 2;
    await eligible.ready();
    const eligibleTurn = eligible.engine.runOneTurn();
    await advance(eligible.engine).waitForMainPhase(0);
    expect(eligible.state.memory).toBe(3);
    advance(eligible.engine).endMainPhaseIfOpen(0);
    await eligibleTurn;

    const boundary = setupEngine({
      0: { battleArea: [{ card: "EX2-060", as: "rika" }], deck: ["BT1-001"], security: ["BT1-002"] },
    });
    boundary.state.memory = 3;
    await boundary.ready();
    const boundaryTurn = boundary.engine.runOneTurn();
    await advance(boundary.engine).waitForMainPhase(0);
    expect(boundary.state.memory).toBe(3);
    advance(boundary.engine).endMainPhaseIfOpen(0);
    await boundaryTurn;
  });

  it("plays EX2-060 from Security without paying its cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-050", as: "attacker" }], security: ["BT1-001"] },
      1: { security: [{ card: "EX2-060", as: "securityRika" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("securityRika").instanceId),
    );
    expect(
      s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("securityRika").instanceId),
    ).toBe(true);
  });
});
