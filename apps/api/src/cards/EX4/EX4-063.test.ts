import { describe, expect, it } from "vitest";
import { EffectTiming, Zone } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle, type SetupEngineOptions } from "../../engine/testkit/harness.js";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-063.js";
import "../BT19/BT19-049.js";
import "../BT26/BT26-020.js";
import "../BT8/BT8-081.js";

describe("EX4-063 Henry Wong & Shu-Chong Wong", () => {
  it("plays Terriermon or Lopmon with the one-or-fewer Digimon gate and restricts it", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions;
    expect(actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      condition: { kind: "permanentCount", op: "lte", value: 1, filter: { kind: ["Digimon"] } },
      target: { filter: { nameOrTrait: [{ match: "nameExact", tokens: ["Terriermon", "Lopmon"] }] } },
    });
    expect(actions?.[1]).toMatchObject({
      kind: "Restrict",
      target: { filter: { boundRef: "playedByStartEffect" } },
      restriction: "digivolve",
    });
    expect(actions?.[2]).toMatchObject({ kind: "DelayedDelete", timing: "endOfOpponentTurn" });
  });
  it("uses digivolution-card name matching for the erratared cost reduction", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0]).toMatchObject({
      kind: "Replacement",
      sourceFilter: { digivolutionStackNameOrTrait: [{ match: "nameExact", tokens: ["Terriermon", "Lopmon"] }] },
      actions: [{ kind: "Replacement", mode: "reduceCost", amount: 1 }],
    });
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-063");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });

  it("does not play a longer Terriermon name as an exact target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-063", as: "subject" }],
          hand: [{ card: "BT16-038", as: "longTerriermonName" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnStartMainPhase, s.perm("subject"));
    await settle();
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("longTerriermonName").instanceId);
  });

  it("plays and binds Terriermon at the real Start of Main, then deletes that instance at the opponent turn end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-063", as: "subject" }],
          hand: [{ card: "ST17-02", as: "terrier" }],
          deck: Array.from({ length: 8 }, () => "BT1-011"),
          security: ["BT1-009", "BT1-010", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponent" }],
          deck: Array.from({ length: 8 }, () => "BT1-011"),
          security: ["BT1-009", "BT1-010", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === s.inst("terrier").instanceId)!;
    const playedPermanentId = played.permanentId;
    expect(played).toBeDefined();
    expect(observe(s.engine).isRestricted(played, "digivolve")).toBe(true);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("terrier").instanceId);

    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;

    s.state.turnSeat = 1;
    s.state.memory = 10;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === playedPermanentId)).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === playedPermanentId)).toBe(false);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("terrier").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("subject").permanentId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("opponent").permanentId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("plays Terriermon at the real Start of Main Phase with exactly one Digimon already in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-063", as: "subject" },
            { card: "BT1-010", as: "existing" },
          ],
          hand: [{ card: "ST17-02", as: "terrier" }],
          deck: ["BT1-011", "BT1-012"],
          security: ["BT1-009"],
        },
        1: { deck: ["BT1-011", "BT1-012"], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const played = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === s.inst("terrier").instanceId,
    );
    expect(played).toBeDefined();
    expect(s.state.players[0]!.battleArea).toHaveLength(3);
    expect(observe(s.engine).isRestricted(played!, "digivolve")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("terrier").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not play Terriermon at the real Start of Main Phase with two Digimon already in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-063", as: "subject" },
            { card: "BT1-010", as: "existing" },
            { card: "BT1-010", as: "existing2" },
          ],
          hand: [{ card: "ST17-02", as: "terrier" }],
          deck: ["BT1-011", "BT1-012"],
          security: ["BT1-009"],
        },
        1: { deck: ["BT1-011", "BT1-012"], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(3);
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("terrier").instanceId,
      ),
    ).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("terrier").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not play from hand when the one-Digimon gate is exceeded", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-063", as: "subject" },
            { card: "BT1-010", as: "existing" },
            { card: "BT1-010", as: "existing2" },
          ],
          hand: [{ card: "ST17-02", as: "terrier" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnStartMainPhase, s.perm("subject"));
    await settle();
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("terrier").instanceId);
  });

  it("reduces a legal evolution with Terriermon in sources and suspends this Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-063", as: "subject" },
            { card: "BT1-064", as: "carrier", under: ["ST17-02"] },
          ],
          hand: [{ card: "BT17-046", as: "gargomon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("carrier").permanentId,
        instanceId: s.inst("gargomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("carrier").topCard?.cardId === "BT17-046");
    expect(s.state.memory).toBe(0);
    expect(s.perm("subject").isSuspended).toBe(true);
  });
  ex4CardBehaviorTests("EX4-063");
});

describe("EX4-063 Henry Wong & Shu-Chong Wong — KB Q&A rulings", () => {
  const filler = () => Array.from({ length: 10 }, () => "BT1-011");

  function henryBoard(opponentBattleArea: { card: string; as: string }[] = [], opts: SetupEngineOptions = {}) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-063", as: "subject" }],
          hand: [{ card: "ST17-02", as: "terrier" }],
          deck: filler(),
          security: ["BT1-009", "BT1-010", "BT1-012"],
        },
        1: { battleArea: opponentBattleArea, deck: filler(), security: ["BT1-009", "BT1-010", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, ...opts },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    return s;
  }

  async function runTurn(s: ReturnType<typeof setupEngine>, seat: 0 | 1, duringMain?: () => Promise<void>) {
    s.state.turnSeat = seat;
    s.state.memory = 10;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(seat);
    await duringMain?.();
    advance(s.engine).endMainPhaseIfOpen(seat);
    await turn;
  }

  it("cannot play itself as [Henry Wong] with Gargomon's When Digivolving (Q3104)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-064", as: "base" }],
          hand: [
            { card: "BT19-049", as: "gargomon" },
            { card: "EX4-063", as: "pair" },
          ],
          deck: filler(),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gargomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-049" && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("pair").instanceId);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).not.toContain("EX4-063");
  });

  it("deletes only at the end of the opponent's first turn; a prevented deletion is not retried and the ban stays (Q5724)", async () => {
    let evadePrompts = 0;
    const s: ReturnType<typeof setupEngine> = henryBoard([], {
      onEvent(event) {
        if (event.kind !== "evadePrompt") return;
        evadePrompts += 1;
        queueMicrotask(() => {
          s.engine.applyIntent(0, { type: "respondEvade", permanentId: event.permanentId, accept: true });
        });
      },
    });
    await s.ready();

    let playedPermanentId = "";
    await runTurn(s, 0, async () => {
      const played = s.state.players[0]!.battleArea.find(
        ({ topCard }) => topCard.instanceId === s.inst("terrier").instanceId,
      )!;
      playedPermanentId = played.permanentId;
      const evadeSource = s.give(0, Zone.Hand, "BT26-020");
      await advance(s.engine).verb.placeUnder(playedPermanentId, [evadeSource.instanceId]);
    });
    const played = () => s.state.players[0]!.battleArea.find(({ permanentId }) => permanentId === playedPermanentId);

    await runTurn(s, 1);
    expect(played()).toBeDefined();
    expect(played()!.isSuspended).toBe(true);
    expect(evadePrompts).toBe(1);

    await runTurn(s, 0);
    await runTurn(s, 1);
    expect(played()).toBeDefined();
    expect(observe(s.engine).isRestricted(played()!, "digivolve")).toBe(true);
    expect(evadePrompts).toBe(1);
  });

  it("lets the turn player order its end-of-turn effect and the delayed deletion (Q5725)", async () => {
    async function endOpponentTurn(preferred: string) {
      const s = henryBoard([{ card: "BT8-081", as: "rasenmon" }], { preferTriggerKeys: [preferred] });
      await s.ready();
      await runTurn(s, 0);
      await runTurn(s, 1);

      const order = s.decisions.find(({ req }) => req.kind === "orderTriggers");
      expect(order?.seat).toBe(1);
      expect(order?.req.options?.triggerCardIds).toEqual(expect.arrayContaining(["BT8-081", "ST17-02"]));
      expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("terrier").instanceId);
      expect(s.state.players[1]!.security).toHaveLength(2);
      return s.events
        .filter((event) => event.kind === "effectResolved")
        .map((event) => (event as { sourceCardId?: string }).sourceCardId)
        .filter((cardId) => cardId === "BT8-081" || cardId === "ST17-02");
    }

    expect(await endOpponentTurn("ST17-02")).toEqual(["ST17-02", "BT8-081"]);
    expect(await endOpponentTurn("BT8-081")).toEqual(["BT8-081", "ST17-02"]);
  });
});
