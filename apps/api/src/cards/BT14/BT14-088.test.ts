import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-088.js";
import { settle, setupEngine, type EngineSetup, type SetupEngineOptions } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-088", () => {
  it("adds a level 3 Digimon and a non-white Tamer from the top five", () => {
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 5,
          rest: "deckBottom",
          add: [
            { filter: { levels: [3] }, count: 1, to: "hand" },
            {
              filter: { kind: ["Tamer"], excludeColors: ["White"] },
              count: 1,
              to: "hand",
            },
          ],
          optional: true,
        },
      ],
    });
  });

  it("naturally reveals a level 3 Digimon and non-white Tamer from the top five", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT14-088", as: "gennai" }],
          deck: ["BT14-007", "BT14-088", "BT14-087", "AD1-001", "AD1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gennai").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT14-007"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT14-007")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT14-087")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT14-088")).toBe(false);
  });

  it("moves a DP-bearing breeding Digimon after an opponent level-5-or-higher attack and pays by suspending Gennai", () => {
    expect(compiled.effects[1]).toMatchObject({
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          triggerFilter: { kind: ["Digimon"], levelComparison: { op: "gte", value: 5 } },
          actions: [{ kind: "MovePermanent", direction: "toBattle", cost: { kind: "suspend" }, optional: true }],
        },
      ],
    });
  });

  it("naturally moves a breeding Digimon after an opposing level-5 attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-088", as: "gennai" }],
          breeding: { card: "BT14-007", as: "breedingAgumon" },
        },
        1: { battleArea: [{ card: "BT14-015", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT14-007"));
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT14-007")).toBe(true);
    expect(s.perm("gennai").isSuspended).toBe(true);
  });

  it("does not move a breeding Digimon with 0 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-088", as: "gennai" }],
          breeding: { card: "BT18-086", as: "larva" },
          security: ["BT1-085"],
        },
        1: { battleArea: [{ card: "BT14-015", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(s.state.players[0]!.breeding?.topCard.cardId).toBe("BT18-086");
    expect(s.perm("gennai").isSuspended).toBe(false);
  });

  it("plays itself from security through a natural security check", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-071", as: "attacker" }] },
        1: { security: [{ card: "BT14-088", as: "securityGennai" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT14-088"));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT14-088")).toBe(true);
  });

  it("plays itself for free from security", () => {
    expect(compiled.effects[2]).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
  });
});

describe("BT14-088 Gennai — KB Q&A rulings", () => {
  const handCardIds = (s: EngineSetup): string[] => s.state.players[0]!.hand.map((card) => card.cardId).sort();

  async function playGennaiRevealing(deck: string[], opts: SetupEngineOptions): Promise<EngineSetup> {
    const s = setupEngine({ 0: { hand: [{ card: "BT14-088", as: "gennai" }], deck } }, opts);
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gennai").instanceId })).toEqual({
      ok: true,
    });
    return s;
  }

  it("adds the one qualifying card when only a level 3 Digimon or only a non-white Tamer is revealed (Q2461)", async () => {
    const onlyDigimon = await playGennaiRevealing(["BT14-007", "BT14-088", "BT14-012", "BT14-074", "BT14-062"], {
      autoAcceptOptional: true,
      autoSelectCards: true,
    });
    await settle(() => onlyDigimon.state.players[0]!.deck.length === 4);
    expect(handCardIds(onlyDigimon)).toEqual(["BT14-007"]);
    expect(onlyDigimon.state.players[0]!.deck.map((card) => card.cardId)).toContain("BT14-088");

    const onlyTamer = await playGennaiRevealing(["BT14-087", "BT14-088", "BT14-012", "BT14-074", "BT14-062"], {
      autoAcceptOptional: true,
      autoSelectCards: true,
    });
    await settle(() => onlyTamer.state.players[0]!.deck.length === 4);
    expect(handCardIds(onlyTamer)).toEqual(["BT14-087"]);
  });

  it("must add both the level 3 Digimon and the non-white Tamer when both are revealed (Q2462)", async () => {
    const s = await playGennaiRevealing(["BT14-007", "BT14-087", "BT14-012", "BT14-074", "BT14-062"], {
      autoAcceptOptional: true,
    });

    for (const expectedCardId of ["BT14-007", "BT14-087"]) {
      await settle(() => s.state.pendingDecision?.kind === "selectCards");
      const request = s.decisions.at(-1)!.req;
      expect(request.kind).toBe("selectCards");
      expect(request.options?.min).toBe(1);
      const candidates = request.options?.candidateInstanceIds ?? [];
      expect(
        candidates.map((instanceId) => s.state.players[0]!.deck.find((card) => card.instanceId === instanceId)?.cardId),
      ).toEqual([expectedCardId]);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: request.decisionId,
          response: { kind: "selectCards", instanceIds: [] },
        }).ok,
      ).toBe(false);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: request.decisionId,
          response: { kind: "selectCards", instanceIds: candidates },
        }),
      ).toEqual({ ok: true });
    }

    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(handCardIds(s)).toEqual(["BT14-007", "BT14-087"]);
  });

  async function attackWithMegadramonIntoBreeding(breedingCard: string): Promise<EngineSetup> {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-088", as: "gennai" }],
          breeding: { card: breedingCard, as: "breeding" },
          security: ["BT1-085"],
        },
        1: { battleArea: [{ card: "BT14-015", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);
    return s;
  }

  // Engine gap: MovePermanent toBattle rejects every level-less breeding card, so the DP-bearing Lv.- Mother D-Reaper never moves.
  it.fails("moves a DP-bearing Mother D-Reaper but not a level 2 Digimon or King Drasil_7D6 from breeding (Q2463)", async () => {
    for (const noDpCard of ["BT14-001", "BT13-007"]) {
      const s = await attackWithMegadramonIntoBreeding(noDpCard);
      expect(s.state.players[0]!.breeding?.topCard.cardId).toBe(noDpCard);
      expect(s.perm("gennai").isSuspended).toBe(false);
    }

    const motherDReaper = await attackWithMegadramonIntoBreeding("EX2-007");
    expect(motherDReaper.state.players[0]!.breeding).toBeUndefined();
    expect(motherDReaper.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toContain(
      "EX2-007",
    );
    expect(motherDReaper.perm("gennai").isSuspended).toBe(true);
  });

  it("lets the moved Digimon <Blast Digivolve> in the following counter timing (Q2464)", async () => {
    const counterWindows: string[][] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-088", as: "gennai" }],
          breeding: { card: "BT19-009", as: "growlmon" },
          hand: [{ card: "BT19-011", as: "warGrowlmon" }],
          deck: ["BT1-012", "BT1-013"],
          security: ["BT1-085", "BT1-085"],
        },
        1: { battleArea: [{ card: "BT14-015", as: "attacker" }] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        onEvent: (event) => {
          if (event.kind === "counterWindowOpened") {
            counterWindows.push(event.eligibleCounters.map((counter) => counter.effectKey));
          }
        },
      },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const blastKey = `blast-digivolve:${s.perm("growlmon").permanentId}`;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => counterWindows.length > 0);

    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.perm("gennai").isSuspended).toBe(true);
    expect(counterWindows[0]).toContain(blastKey);
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: s.inst("warGrowlmon").instanceId,
        effectKey: blastKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("growlmon").topCard?.cardId === "BT19-011");

    expect(s.perm("growlmon").topCard?.cardId).toBe("BT19-011");
    expect(s.perm("growlmon").stack.map((card) => card.cardId)).toEqual(["BT19-009"]);
  });
});
