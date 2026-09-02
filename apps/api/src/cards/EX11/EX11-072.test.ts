import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { irNode } from "../../engine/testkit/irNode.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-072.js";

/**
 * Board with the emblem in hand and, by default, a green [Shoto Kazama] Tamer (EX11-062) to
 * suspend.
 *
 * `ownShoto: false` drops that Tamer. EX11-062 prints "[All Turns] When any Digimon suspend, by
 * suspending this Tamer, ..." — so suspending ANY of your Digimon while it is on the board makes
 * a real [Shoto Kazama] suspend, which legitimately arms this emblem. A negative case about a
 * non-Shoto subject therefore has to leave EX11-062 off the board, or it proves nothing about
 * this card's `sourceFilter`.
 */
function armedBoard(options: {
  battleArea: { card: string; as: string }[];
  hand: string[];
  memory?: number;
  ownShoto?: boolean;
  opponentBattleArea?: { card: string; as: string }[];
}) {
  const s = setupEngine(
    {
      0: {
        battleArea: [...(options.ownShoto === false ? [] : [{ card: "EX11-062", as: "shoto" }]), ...options.battleArea],
        hand: [
          { card: "EX11-072", as: "emblem" },
          ...options.hand.map((card, index) => ({ card, as: `hand${index}` })),
        ],
      },
      ...(options.opponentBattleArea === undefined ? {} : { 1: { battleArea: options.opponentBattleArea } }),
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.turnSeat = 0;
  s.state.memory = options.memory ?? 2;
  return s;
}

/** Place the emblem and age it past §16-17-3's "entered this turn" guard. */
async function placeAgedEmblem(s: ReturnType<typeof armedBoard>): Promise<void> {
  await advance(s.engine).verb.placeOptionAsPermanent(s.inst("emblem").instanceId);
  s.perm("emblem").enterFieldTurnCount = 4294967295;
  await s.ready();
}

describe("EX11-072 Unique Emblem: Guardian Vortex", () => {
  it("preserves the printed Option and complete compiled coverage", () => {
    expect(getCardDefinition("EX11-072")).toMatchObject({
      nameEn: "Unique Emblem: Guardian Vortex",
      colors: ["Green"],
      kinds: ["Option"],
      playCost: 3,
      types: ["Vortex Warriors", "LIBERATOR"],
      securityEffectText: "[Security] Activate this card's [Main] effects.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("publishes exactly one [Main] clause and carries ＜Delay＞ on the [Your Turn] trigger", () => {
    // The Delay payload must NOT be a second [Main] clause: `[Security] Activate this card's
    // [Main] effects` would otherwise reach it, and the [Main]-routed Delay model skips the
    // §16-17-1 trash cost entirely.
    expect(compiled.effects.filter((effect) => effect.trigger === "Main")).toHaveLength(1);
    const watcher = compiled.effects.find((effect) => effect.trigger === "YourTurn")!;
    expect(watcher.keywords).toMatchObject([{ keyword: "Delay" }]);
    expect(watcher.actions).toMatchObject([
      {
        kind: "SubTrigger",
        event: "whenSuspended",
        sourceFilter: { controller: "mine", nameOrTrait: [{ tokens: ["Shoto Kazama"] }] },
        actions: [{ kind: "Digivolve", payCost: true, reduceCost: 3 }],
      },
    ]);
    expect(compiled.effects.some((effect) => effect.actions.some((action) => irNode(action)?.requiresDelayArmed))).toBe(
      false,
    );
  });

  it("requires both [Bird Dragon] AND [LIBERATOR] on the digivolution destination (Q5944)", () => {
    const watcher = compiled.effects.find((effect) => effect.trigger === "YourTurn")!;
    const digivolve = irNode(irNode(watcher.actions[0])?.actions?.[0]);
    // Conjunction: `nameOrTrait` entries are a UNION in the matcher, so the second trait rides
    // on the separate `traits` predicate, which ANDs with it.
    expect(digivolve?.into).toMatchObject({
      kind: ["Digimon"],
      nameOrTrait: [{ tokens: ["Bird Dragon"], match: "trait" }],
      traits: ["LIBERATOR"],
    });
    // The base side is a genuine union: [Avian]/[Bird] substring OR the exact [Vortex Warriors].
    expect(digivolve?.target?.filter?.nameOrTrait).toMatchObject([
      { tokens: ["Avian", "Bird"], match: "traitContains" },
      { tokens: ["Vortex Warriors"], match: "trait" },
    ]);
  });

  it("security activates Main, plays a named card, and places the emblem in battle", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "EX11-072", as: "emblem", faceUp: true }],
          hand: [{ card: "EX11-026", as: "pteromon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("emblem"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(
      expect.arrayContaining(["EX11-026", "EX11-072"]),
    );
    assertNoLoudGap(s);
  });

  it("trashes the emblem as the ＜Delay＞ cost and digivolves a [Bird Dragon] base for free", async () => {
    const s = armedBoard({ battleArea: [{ card: "EX11-028", as: "bird" }], hand: ["EX11-032"] });
    await placeAgedEmblem(s);

    await advance(s.engine).verb.suspend([s.perm("shoto").permanentId], 0);
    await settle(() => s.perm("bird").topCard.cardId === "EX11-032");

    expect(s.perm("bird").topCard.cardId).toBe("EX11-032");
    // Printed digivolution cost 3, reduced by 3.
    expect(s.state.memory).toBe(2);
    // §16-17-1: trashing this card is the activation cost, so the emblem must leave the field.
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("EX11-072");
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-072")).toBe(false);
    assertNoLoudGap(s);
  });

  it("accepts a [Vortex Warriors] base with no [Avian]/[Bird] trait", async () => {
    const s = armedBoard({ battleArea: [{ card: "EX8-074", as: "vortex" }], hand: ["EX11-074"], memory: 5 });
    await placeAgedEmblem(s);

    await advance(s.engine).verb.suspend([s.perm("shoto").permanentId], 0);
    await settle(() => s.perm("vortex").topCard.cardId === "EX11-074");

    expect(s.perm("vortex").topCard.cardId).toBe("EX11-074");
    assertNoLoudGap(s);
  });

  it("rejects a destination carrying only [LIBERATOR] and keeps the emblem unpaid (Q5944)", async () => {
    // EX11-033 is a legal green Lv.5 evolution off EX11-028 and carries [LIBERATOR], but not
    // [Bird Dragon]. Under the old `match: "traitAll"` the matcher fell through to its
    // name ∪ trait ∪ text branch and accepted it on [LIBERATOR] alone.
    const s = armedBoard({ battleArea: [{ card: "EX11-028", as: "bird" }], hand: ["EX11-033"], memory: 5 });
    await placeAgedEmblem(s);

    await advance(s.engine).verb.suspend([s.perm("shoto").permanentId], 0);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("bird").topCard.cardId).toBe("EX11-028");
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-072")).toBe(true);
    assertNoLoudGap(s);
  });

  it("rejects a base with neither [Avian]/[Bird] nor [Vortex Warriors]", async () => {
    // EX11-029 is a green Lv.4 that could legally digivolve into EX11-032; only the printed
    // trait gate on the BASE stops it.
    const s = armedBoard({ battleArea: [{ card: "EX11-029", as: "beast" }], hand: ["EX11-032"], memory: 5 });
    await placeAgedEmblem(s);

    await advance(s.engine).verb.suspend([s.perm("shoto").permanentId], 0);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("beast").topCard.cardId).toBe("EX11-029");
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-072")).toBe(true);
    assertNoLoudGap(s);
  });

  it("can't be activated the turn the emblem enters the battle area (§16-17-3)", async () => {
    const s = armedBoard({ battleArea: [{ card: "EX11-028", as: "bird" }], hand: ["EX11-032"] });
    await advance(s.engine).verb.placeOptionAsPermanent(s.inst("emblem").instanceId);
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("shoto").permanentId], 0);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("bird").topCard.cardId).toBe("EX11-028");
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-072")).toBe(true);
    assertNoLoudGap(s);
  });

  it("ignores a suspended Digimon that is not named [Shoto Kazama]", async () => {
    // No EX11-062 on the board: its own "[All Turns] ... by suspending this Tamer" clause would
    // suspend a real [Shoto Kazama] in response to the Galemon suspending, which legitimately
    // arms this emblem and would make the negative vacuous.
    const s = armedBoard({
      battleArea: [{ card: "EX11-028", as: "bird" }],
      hand: ["EX11-032"],
      ownShoto: false,
    });
    await placeAgedEmblem(s);

    await advance(s.engine).verb.suspend([s.perm("bird").permanentId], 0);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("bird").isSuspended).toBe(true);
    expect(s.perm("bird").topCard.cardId).toBe("EX11-028");
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-072")).toBe(true);
    assertNoLoudGap(s);
  });

  it('ignores your opponent\'s [Shoto Kazama] suspending (`controller: "mine"`)', async () => {
    const s = armedBoard({
      battleArea: [{ card: "EX11-028", as: "bird" }],
      hand: ["EX11-032"],
      ownShoto: false,
      opponentBattleArea: [{ card: "EX11-062", as: "theirShoto" }],
    });
    await placeAgedEmblem(s);

    await advance(s.engine).verb.suspend([s.perm("theirShoto").permanentId], 1);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("theirShoto").isSuspended).toBe(true);
    expect(s.perm("bird").topCard.cardId).toBe("EX11-028");
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-072")).toBe(true);
    assertNoLoudGap(s);
  });
});
