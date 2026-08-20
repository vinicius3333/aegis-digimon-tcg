import { CardKind, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type {
  EffectContext,
  GameAccess,
  Primitives,
  ReplacementInstallPrevent,
  SubTriggerInstall,
} from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import module from "./BT26-044.js";
import "../index.js";

const CARD_ID = "BT26-044";

function source(): CardSource {
  return {
    instanceId: "lilamon",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: {} as CardDefinition,
    permanent: () => ({ permanentId: "lilamon-permanent" }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => true,
  };
}

describe("BT26-044 Lilamon", () => {
  it("uses the exact off-color Lv.4 DATA SQUAD evolution route for cost 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT25-023", as: "blueDataSquad" }],
        hand: [{ card: CARD_ID, as: "lilamon" }],
        deck: ["BT5-022"],
      },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueDataSquad").permanentId,
        instanceId: s.inst("lilamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("blueDataSquad").topCard.cardId === CARD_ID);
    expect(s.state.memory).toBe(0);
  });

  it("Q7035: may decline suspension and lock a different, already-suspended card", async () => {
    const unsuspended = {
      permanentId: "unsuspended",
      inBreeding: false,
      isSuspended: false,
      topCard: { cardId: "DIGIMON" },
    };
    const alreadySuspended = {
      permanentId: "already-suspended",
      inBreeding: false,
      isSuspended: true,
      topCard: { cardId: "TAMER" },
    };
    const cardSource = source();
    const restrict = vi.fn();
    const ctx = {
      source: cardSource,
      game: {
        opponentOf: () => 1 as Seat,
        player: () => ({ battleArea: [unsuspended, alreadySuspended] }),
        definitionOf: (card: { cardId: string }) => ({
          kinds: [card.cardId === "TAMER" ? CardKind.Tamer : CardKind.Digimon],
        }),
      } as unknown as GameAccess,
      ask: {
        optional: vi.fn(async () => false),
        chooseTargets: vi.fn(async (_ctx, options: { candidates: string[] }) => {
          expect(options.candidates).toEqual(["unsuspended", "already-suspended"]);
          return ["already-suspended"];
        }),
      },
      fx: { suspend: vi.fn(), restrict },
    } as unknown as EffectContext;
    await module.effectsForTiming(EffectTiming.OnPlay, cardSource)[0]!.resolve(ctx);
    expect(ctx.fx.suspend).not.toHaveBeenCalled();
    expect(restrict).toHaveBeenCalledWith("already-suspended", "unsuspend", expect.anything());
  });

  it("digivolves for the printed cost reduced by 1 after an opposing Digimon suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "lilamon" }],
          hand: [{ card: "BT26-043", as: "piximon" }],
          deck: ["BT5-022"],
        },
        1: { battleArea: [{ card: "BT5-022", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 2;
    await advance(s.engine).verb.suspend([s.perm("opponent").permanentId]);
    await settle(() => s.perm("lilamon").topCard.cardId === "BT26-043");
    expect(s.state.memory).toBe(0);
    expect(s.perm("lilamon").stack.some((card) => card.cardId === CARD_ID)).toBe(true);
  });

  it("installs both reactive routes with one per-instance budget and requires effect attribution under a Tamer", async () => {
    const cardSource = source();
    const installed: SubTriggerInstall[] = [];
    const tamer = { permanentId: "tamer", controllerSeat: 0 as Seat, topCard: { cardId: "TAMER" } };
    const ctx = {
      source: cardSource,
      game: {
        player: () => ({ hand: [{ instanceId: "candidate", cardId: "CANDIDATE" }] }),
        permanentById: () => tamer,
        definitionOf: (card: { cardId: string }) =>
          card.cardId === "TAMER"
            ? ({ kinds: [CardKind.Tamer], types: [] } as unknown as CardDefinition)
            : ({ kinds: [CardKind.Digimon], types: ["Fairy"] } as unknown as CardDefinition),
      } as unknown as GameAccess,
      fx: { subscribeSubTrigger: vi.fn((sub) => installed.push(sub)) } as unknown as Primitives,
    } as unknown as EffectContext;
    const effect = module
      .effectsForTiming(EffectTiming.None, cardSource)
      .find(({ effectKey }) => effectKey.endsWith("reactive-alt-digivolve"))!;
    await effect.resolve(ctx);
    expect(installed).toHaveLength(2);
    expect(new Set(installed.map(({ oncePerTurnKey }) => oncePerTurnKey))).toEqual(
      new Set([`lilamon/${CARD_ID}/reactive-alt-digivolve`]),
    );
    const trashWatcher = installed.find(({ event }) => event === "whenDigivolutionTrashed")!;
    expect(trashWatcher.matches!({ ...ctx, trigger: { subjectPermanentId: "tamer" } } as EffectContext)).toBe(false);
    expect(
      trashWatcher.matches!({ ...ctx, trigger: { subjectPermanentId: "tamer", byEffectSeat: 1 } } as EffectContext),
    ).toBe(true);
  });

  it("declining the optional reactive evolution releases its once-per-turn budget", async () => {
    const cardSource = source();
    const installed: SubTriggerInstall[] = [];
    const host = { permanentId: "lilamon-permanent", controllerSeat: 0 as Seat, topCard: { cardId: CARD_ID } };
    const ctx = {
      source: cardSource,
      game: {
        player: () => ({ hand: [{ instanceId: "candidate", cardId: "CANDIDATE" }] }),
        permanentById: () => host,
        definitionOf: () => ({ kinds: [CardKind.Digimon], types: ["Fairy"] }),
      } as unknown as GameAccess,
      ask: { optional: vi.fn(async () => false) },
      fx: { subscribeSubTrigger: vi.fn((sub) => installed.push(sub)) } as unknown as Primitives,
    } as unknown as EffectContext;
    const effect = module
      .effectsForTiming(EffectTiming.None, cardSource)
      .find(({ effectKey }) => effectKey.endsWith("reactive-alt-digivolve"))!;
    await effect.resolve(ctx);
    const watcher = installed.find(({ event }) => event === "whenSuspended")!;
    const subCtx = { ...ctx, oncePerTurnActivationDeclined: false } as EffectContext;
    await watcher.run(subCtx);
    expect(subCtx.oncePerTurnActivationDeclined).toBe(true);
  });

  it("a failed suspension-window evolution releases the shared budget for a later Tamer-trash window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "lilamon" },
            { card: "BT26-091", as: "tamer", under: [{ card: "AD1-001", as: "under", faceUp: false }] },
          ],
          hand: [{ card: "BT26-043", as: "piximon" }],
          deck: ["BT5-022"],
        },
        1: { battleArea: [{ card: "BT5-022", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = -9;
    await advance(s.engine).verb.suspend([s.perm("opponent").permanentId]);
    expect(s.perm("lilamon").topCard.cardId).toBe(CARD_ID);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("piximon").instanceId)).toBe(true);

    s.state.memory = 2;
    const primitives = (s.engine as unknown as { primitives: Primitives }).primitives;
    await primitives.trashDigivolutionCards(s.perm("tamer").permanentId, [s.inst("under").instanceId], {
      byEffectSeat: 0,
    });

    expect(s.perm("lilamon").topCard.cardId).toBe("BT26-043");
    expect(s.state.memory).toBe(0);
  });

  it("gives two Lilamon copies independent reactive once-per-turn budgets", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "first" },
            { card: CARD_ID, as: "second" },
          ],
          hand: [
            { card: "BT26-043", as: "firstEvolution" },
            { card: "BT26-043", as: "secondEvolution" },
          ],
          deck: ["BT5-022", "BT5-022"],
        },
        1: { battleArea: [{ card: "BT5-022", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("firstEvolution").instanceId, s.inst("secondEvolution").instanceId);
    await s.ready();
    s.state.memory = 4;

    await advance(s.engine).verb.suspend([s.perm("opponent").permanentId]);

    expect(s.perm("first").topCard.cardId).toBe("BT26-043");
    expect(s.perm("second").topCard.cardId).toBe("BT26-043");
    expect(s.state.memory).toBe(0);
  });

  it("inherits leave prevention for DATA SQUAD and pays an actual face-down Tamer card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-049", as: "host", under: [{ card: CARD_ID, as: "lilamonSource" }] },
            { card: "BT26-091", as: "tamer", under: [{ card: "AD1-001", as: "bottomCost", faceUp: false }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(0);
    await settle();
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("bottomCost").instanceId);
    expect(s.perm("tamer").stack).toHaveLength(0);
  });

  it("does not prevent leaving when the face-down Tamer-card cost fails to move", async () => {
    const cardSource = source();
    const bottom = { instanceId: "bottom", cardId: "BOTTOM", faceUp: false };
    const host = { permanentId: "lilamon-permanent", controllerSeat: 0 as Seat, topCard: { cardId: "ROSEMON" } };
    const tamer = { permanentId: "tamer", controllerSeat: 0 as Seat, topCard: { cardId: "TAMER" }, stack: [bottom] };
    let replacement: ReplacementInstallPrevent | undefined;
    const trashDigivolutionCards = vi.fn(async () => []);
    const ctx = {
      source: cardSource,
      game: {
        player: () => ({ battleArea: [host, tamer] }),
        permanentById: (id: string) => (id === "tamer" ? tamer : host),
        definitionOf: (card: { cardId: string }) =>
          card.cardId === "TAMER"
            ? ({ kinds: [CardKind.Tamer], nameEn: "Tamer", types: [] } as unknown as CardDefinition)
            : ({ kinds: [CardKind.Digimon], nameEn: "Rosemon", types: [] } as unknown as CardDefinition),
      } as unknown as GameAccess,
      ask: { optional: vi.fn(async () => true) },
      fx: {
        subscribeReplacement: (install: ReplacementInstallPrevent) => {
          replacement = install;
        },
        trashDigivolutionCards,
      } as unknown as Primitives,
    } as unknown as EffectContext;
    const effect = module
      .effectsForTiming(EffectTiming.None, cardSource)
      .find(({ effectKey }) => effectKey.endsWith("inherited-prevent-leave"))!;
    await effect.resolve(ctx);

    expect(await replacement!.preventCheck(ctx, host.permanentId)).toBe(false);
    expect(trashDigivolutionCards).toHaveBeenCalledWith("tamer", ["bottom"], { byEffectSeat: 0 });
  });
});
