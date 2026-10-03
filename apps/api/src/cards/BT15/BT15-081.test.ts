import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle, type CardSpec, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-081.js";
import { X_ANTIBODY_NAME_PROBES, xAntibodyNameGateVerdicts } from "../../engine/testkit/xAntibodyNameGate.js";

describe("BT15-081", () => {
  it("matches the catalog identity and keeps the direct module full and residual-free", () => {
    expect(getCardDefinition("BT15-081")).toMatchObject({
      nameEn: "Leviamon (X Antibody)",
      colors: ["Purple"],
      level: 6,
      playCost: 14,
      dp: 14000,
      evoCosts: [{ color: "Purple", level: 5, memoryCost: 6 }],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("has Security Attack +2 and may digivolve into itself from trash when an opponent plays by effect", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "SecurityAttack", amount: 2 }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      isFromTrash: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { byEffect: true },
          actions: [{ kind: "Digivolve", into: { isSelfRef: true }, payCost: false, optional: true }],
        },
      ],
    });
  });
  it("deletes opposing Tamer and level 3/5/7 Digimon when the board-count condition is met", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        { kind: "Delete", condition: { kind: "boardCountCompare" } },
        { kind: "Delete", target: { filter: { levels: [3] } } },
        { kind: "Delete", target: { filter: { levels: [5] } } },
        { kind: "Delete", target: { filter: { levels: [7] } } },
      ],
    }));

  it("naturally reacts to an opponent's effect-played Digimon and evolves Leviamon from the trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-063", as: "leviamon" }],
          trash: [{ card: "BT15-081", as: "fromTrash" }],
          deck: ["BT1-009", "BT1-009"],
        },
        1: {
          security: [{ card: "BT15-088", as: "wings" }, "BT1-009"],
          trash: [{ card: "BT15-007", as: "playedByEffect" }],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("leviamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("leviamon").topCard.cardId === "BT15-081");

    expect(s.perm("leviamon").topCard.cardId).toBe("BT15-081");
    expect(s.perm("leviamon").stack.map((card) => card.cardId)).toContain("EX5-063");
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT15-007")).toBe(false);
  });

  it("does not react when the opponent effect-plays a Digimon into breeding", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-063", as: "leviamon" }],
          trash: [{ card: "BT15-081", as: "fromTrash" }],
        },
        1: {
          battleArea: [
            { card: "BT15-055", as: "victim" },
            { card: "BT15-062", as: "gigadramon" },
          ],
          hand: [{ card: "BT15-066", as: "machinedramon" }],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("victim").permanentId);
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).runTurn(1);
    await settle(() => s.state.players[1]!.breeding?.topCard?.cardId === "BT15-066");

    expect(s.state.players[1]!.breeding?.topCard?.cardId).toBe("BT15-066");
    expect(s.perm("leviamon").topCard.cardId).toBe("EX5-063");
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("fromTrash").instanceId);
  });
});

describe("BT15-081 [X Antibody] reference", () => {
  it("matches the X Antibody card name and its Rule aliases, not X Antibody-trait Digimon", () => {
    expect(xAntibodyNameGateVerdicts("BT15-081")).toEqual(X_ANTIBODY_NAME_PROBES);
  });
});

describe("BT15-081 Leviamon (X Antibody) — KB Q&A rulings", () => {
  const FILLER = ["BT1-009", "BT1-009", "BT1-009", "BT1-009"];
  const AUTO = { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true } as const;

  const securityChecks = (s: EngineSetup): number =>
    s.events.filter((event) => event.kind === "securityChecked" && event.seat === 1).length;

  const boardCardIds = (s: EngineSetup, seat: 0 | 1): (string | undefined)[] =>
    s.state.players[seat]!.battleArea.map((permanent) => permanent.topCard?.cardId);

  async function attackWithLeviamon(
    opponent: { security: CardSpec[]; trash?: CardSpec[] },
    xAntibodyInTrash: boolean,
  ): Promise<EngineSetup> {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-063", as: "leviamon" }],
          trash: xAntibodyInTrash ? [{ card: "BT15-081", as: "fromTrash" }] : [],
          deck: [...FILLER],
        },
        1: { security: opponent.security, trash: opponent.trash ?? [], deck: [...FILLER] },
      },
      AUTO,
    );
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("leviamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    return s;
  }

  const leviamonXActivationIndex = (s: EngineSetup): number =>
    s.events.findIndex(
      (event) => event.kind === "effectTriggered" && event.seat === 0 && event.sourceCardId === "BT15-081",
    );

  async function opponentPlaysStarmonsByOption(): Promise<EngineSetup> {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-063", as: "leviamon" }],
          trash: [{ card: "BT15-081", as: "fromTrash" }],
          deck: [...FILLER],
        },
        1: {
          battleArea: [{ card: "BT1-045", as: "yellowRookie" }],
          hand: [
            { card: "BT5-098", as: "option" },
            { card: "BT5-035", as: "starmons" },
          ],
          deck: [...FILLER],
        },
      },
      AUTO,
    );
    s.state.turnSeat = 1;
    s.state.memory = -5;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "cardPlayed" && event.cardId === "BT5-035"));
    await drainMicrotasks();
    return s;
  }

  it("does not trigger when an effect plays a Digimon into the opponent's breeding area (Q2575)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-063", as: "leviamon" }],
          trash: [{ card: "BT15-081", as: "fromTrash" }],
        },
        1: {
          battleArea: [
            { card: "BT15-055", as: "victim" },
            { card: "BT15-062", as: "gigadramon" },
          ],
          hand: [{ card: "BT15-066", as: "machinedramon" }],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("victim").permanentId);
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).runTurn(1);
    await settle(() => s.state.players[1]!.breeding?.topCard?.cardId === "BT15-066");

    expect(s.events).toContainEqual(expect.objectContaining({ kind: "cardPlayed", seat: 1, cardId: "BT15-066" }));
    expect(s.state.players[1]!.breeding?.topCard?.cardId).toBe("BT15-066");
    expect(s.perm("leviamon").topCard.cardId).toBe("EX5-063");
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("fromTrash").instanceId);
    expect(leviamonXActivationIndex(s)).toBe(-1);

    const playedToBattleArea = await opponentPlaysStarmonsByOption();
    expect(leviamonXActivationIndex(playedToBattleArea)).toBeGreaterThanOrEqual(0);
    expect(playedToBattleArea.perm("leviamon").topCard.cardId).toBe("BT15-081");
  });

  it("triggers when one of my own effects plays an opponent's Digimon (Q2576)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT15-078", as: "waruSeadramon" },
            { card: "EX5-063", as: "leviamon" },
          ],
          trash: [{ card: "BT15-081", as: "fromTrash" }],
          deck: [...FILLER],
        },
        1: {
          security: ["BT1-009", "BT1-009"],
          trash: [{ card: "BT1-009", as: "revived" }],
          deck: [...FILLER],
        },
      },
      AUTO,
    );
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("waruSeadramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("leviamon").topCard.cardId === "BT15-081");

    expect(s.events).toContainEqual(expect.objectContaining({ kind: "cardPlayed", seat: 1, cardId: "BT1-009" }));
    expect(s.perm("leviamon").topCard.cardId).toBe("BT15-081");
    expect(s.perm("leviamon").stack.map(({ cardId }) => cardId)).toContain("EX5-063");
    expect(s.perm("waruSeadramon").topCard.cardId).toBe("BT15-078");
  });

  it("resolves simultaneously with the played Digimon's [On Play], so the turn player goes first (Q2577)", async () => {
    const opponent = { security: ["BT15-088", "BT1-009"], trash: [{ card: "BT11-007", as: "biyomon" }] };
    const biyomonOnPlayIndex = (s: EngineSetup): number =>
      s.events.findIndex(
        (event) => event.kind === "effectTriggered" && event.sourceCardId === "BT11-007" && event.timing === "OnPlay",
      );

    const turnPlayerFirst = await attackWithLeviamon(opponent, true);
    await settle(() => securityChecks(turnPlayerFirst) >= 2);
    await drainMicrotasks();
    const biyomonPlayed = turnPlayerFirst.events.findIndex(
      (event) => event.kind === "cardPlayed" && event.seat === 1 && event.cardId === "BT11-007",
    );
    const leviamonTriggered = turnPlayerFirst.events.findIndex(
      (event) =>
        event.kind === "effectTriggered" &&
        event.seat === 0 &&
        event.sourceCardId === "BT15-081" &&
        event.printedTiming === "AllTurns",
    );
    expect(biyomonPlayed).toBeGreaterThanOrEqual(0);
    expect(leviamonTriggered).toBeGreaterThan(biyomonPlayed);
    expect(turnPlayerFirst.perm("leviamon").topCard.cardId).toBe("BT15-081");
    // Leviamon's [When Digivolving] deletes the level 3 Biyomon before its triggered [On Play] can activate.
    expect(biyomonOnPlayIndex(turnPlayerFirst)).toBe(-1);
    expect(turnPlayerFirst.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT11-007");

    const withoutLeviamonX = await attackWithLeviamon(opponent, false);
    await settle(() => securityChecks(withoutLeviamonX) >= 2);
    await drainMicrotasks();
    expect(biyomonOnPlayIndex(withoutLeviamonX)).toBeGreaterThanOrEqual(0);

    // On the opponent's turn they are the turn player, so their [On Play] activates before my trash trigger.
    const opponentTurn = await opponentPlaysStarmonsByOption();
    const starmonsOnPlayIndex = opponentTurn.events.findIndex(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === "BT5-035" && event.timing === "OnPlay",
    );
    expect(starmonsOnPlayIndex).toBeGreaterThanOrEqual(0);
    expect(leviamonXActivationIndex(opponentTurn)).toBeGreaterThan(starmonsOnPlayIndex);
    expect(opponentTurn.perm("leviamon").topCard.cardId).toBe("BT15-081");
  });

  it("can digivolve the attacking [Leviamon] when a [Security] effect plays a Digimon (Q2578)", async () => {
    const s = await attackWithLeviamon(
      { security: ["BT15-088", "BT1-009"], trash: [{ card: "BT15-007", as: "biyomon" }] },
      true,
    );
    const attackerId = s.perm("leviamon").permanentId;
    await settle(() => s.perm("leviamon").topCard.cardId === "BT15-081");
    await drainMicrotasks();

    expect(s.events).toContainEqual(expect.objectContaining({ kind: "cardPlayed", seat: 1, cardId: "BT15-007" }));
    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "attackDeclared", attackerPermanentId: attackerId, attackerCardId: "EX5-063" }),
    );
    expect(s.perm("leviamon").permanentId).toBe(attackerId);
    expect(s.perm("leviamon").topCard.cardId).toBe("BT15-081");
    expect(s.perm("leviamon").stack.map(({ cardId }) => cardId)).toContain("EX5-063");
    expect(s.perm("leviamon").isSuspended).toBe(true);
  });

  it("recounts checks after digivolving mid-attack: Security Attack +1 into +2 leaves 1 check after the 2nd (Q2579)", async () => {
    const security: CardSpec[] = ["BT1-009", "BT15-088", "BT1-009", "BT1-009", "BT1-009"];
    const opponentTrash: CardSpec[] = [{ card: "BT15-007", as: "biyomon" }];

    const digivolved = await attackWithLeviamon({ security, trash: opponentTrash }, true);
    await settle(() => securityChecks(digivolved) >= 3);
    await drainMicrotasks();
    expect(digivolved.perm("leviamon").topCard.cardId).toBe("BT15-081");
    expect(securityChecks(digivolved)).toBe(3);
    expect(digivolved.state.players[1]!.security).toHaveLength(2);

    const stayedLeviamon = await attackWithLeviamon({ security, trash: opponentTrash }, false);
    await settle(() => securityChecks(stayedLeviamon) >= 2);
    await drainMicrotasks();
    expect(stayedLeviamon.perm("leviamon").topCard.cardId).toBe("EX5-063");
    expect(securityChecks(stayedLeviamon)).toBe(2);
    expect(stayedLeviamon.state.players[1]!.security).toHaveLength(3);
  });

  it("still deletes the level 3, 5 and 7 Digimon when the Tamer-deletion condition fails (Q4707)", async () => {
    async function digivolveWithOwnBoardSize(extraDigimon: number): Promise<EngineSetup> {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT2-075", as: "base" }, ...Array.from({ length: extraDigimon }, () => "BT1-009")],
            hand: [{ card: "BT15-081", as: "leviamonX" }],
            deck: [...FILLER],
          },
          1: {
            battleArea: [
              { card: "BT1-009", as: "rookie" },
              { card: "BT15-062", as: "ultimate" },
              { card: "BT1-084", as: "omnimon" },
              { card: "BT2-090", as: "tamer" },
            ],
            deck: [...FILLER],
          },
        },
        AUTO,
      );
      s.state.turnSeat = 0;
      s.state.memory = 10;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("leviamonX").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => !boardCardIds(s, 1).includes("BT1-084"));
      await drainMicrotasks();
      expect(s.perm("base").topCard.cardId).toBe("BT15-081");
      return s;
    }

    const outnumbered = await digivolveWithOwnBoardSize(4);
    expect(boardCardIds(outnumbered, 1)).toEqual(["BT2-090"]);

    const matched = await digivolveWithOwnBoardSize(3);
    expect(boardCardIds(matched, 1)).toEqual([]);
  });
  it("lets Biting Crush's <Delay> play [Leviamon] first, then its own trash trigger digivolves it (Q4735)", async () => {
    async function resolveOpponentRevival(leviamonInTrash: boolean) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "EX5-069", as: "bitingCrush" }],
            trash: [...(leviamonInTrash ? ["EX5-063"] : []), { card: "BT15-081", as: "leviamonX" }],
            deck: Array.from({ length: 12 }, () => "BT1-010"),
            security: 3,
          },
          1: {
            battleArea: [{ card: "BT2-069", as: "purpleSource" }],
            hand: [{ card: "BT2-108", as: "revival" }],
            trash: [{ card: "BT2-067", as: "demidevimon" }],
            deck: Array.from({ length: 12 }, () => "BT1-011"),
            security: 3,
          },
        },
        { ...AUTO, declineDigiXros: true },
      );
      s.state.memory = 8;
      await s.ready();
      const loop = s.engine.startTurnLoop();
      const drive = advance(s.engine);
      await drive.waitForMainPhase(0);
      drive.endMainPhaseIfOpen(0);
      await drive.waitForMainPhase(1);
      s.state.memory = -8;

      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("revival").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.events.some((event) => event.kind === "cardPlayed" && event.cardId === "BT2-067"));
      await settle();
      await drainMicrotasks();

      const eventIndex = (predicate: (event: EngineSetup["events"][number]) => boolean): number =>
        s.events.findIndex(predicate);
      const result = {
        ownBoard: s.state.players[0]!.battleArea.map((permanent) => ({
          topCardId: permanent.topCard?.cardId,
          stackCardIds: permanent.stack.map(({ cardId }) => cardId),
        })),
        leviamonXInTrash: s.state.players[0]!.trash.some((card) => card.cardId === "BT15-081"),
        bitingCrushTrashed: s.state.players[0]!.trash.some((card) => card.cardId === "EX5-069"),
        delayPlayedLeviamon: eventIndex(
          (event) => event.kind === "cardPlayed" && event.seat === 0 && event.cardId === "EX5-063",
        ),
        leviamonXDigivolved: eventIndex(
          (event) => event.kind === "digivolved" && event.seat === 0 && event.cardId === "BT15-081",
        ),
        playedDigimonDeleted: eventIndex(
          (event) =>
            event.kind === "cardsMoved" &&
            event.to === "trash" &&
            event.instanceIds.includes(s.inst("demidevimon").instanceId),
        ),
      };
      s.engine.applyIntent(1, { type: "surrender" });
      await loop;
      return result;
    }

    const withLeviamon = await resolveOpponentRevival(true);
    expect(withLeviamon.bitingCrushTrashed).toBe(true);
    expect(withLeviamon.delayPlayedLeviamon).toBeGreaterThanOrEqual(0);
    expect(withLeviamon.leviamonXDigivolved).toBeGreaterThan(withLeviamon.delayPlayedLeviamon);
    expect(withLeviamon.ownBoard).toEqual([
      { topCardId: "BT15-081", stackCardIds: expect.arrayContaining(["EX5-063"]) },
    ]);
    // EX5-063's derived [On Play] deleted the played DemiDevimon first; the pending trash watcher
    // never refers to that Digimon, so it still activates.
    expect(withLeviamon.playedDigimonDeleted).toBeLessThan(withLeviamon.leviamonXDigivolved);
    expect(withLeviamon.leviamonXInTrash).toBe(false);

    // Without a [Leviamon] for <Delay> to play, the same trigger finds nothing to digivolve.
    const withoutLeviamon = await resolveOpponentRevival(false);
    expect(withoutLeviamon.bitingCrushTrashed).toBe(true);
    expect(withoutLeviamon.ownBoard).toEqual([]);
    expect(withoutLeviamon.leviamonXDigivolved).toBe(-1);
    expect(withoutLeviamon.leviamonXInTrash).toBe(true);
  });
});
