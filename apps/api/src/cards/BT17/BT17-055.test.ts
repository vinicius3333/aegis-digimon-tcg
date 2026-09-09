import { getCardDefinition, Zone } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-055.js";
import "./index.js";

describe("BT17-055 Infermon", () => {
  it("matches the catalog and the complete IR contract", () => {
    expect(getCardDefinition("BT17-055")).toMatchObject({
      cardId: "BT17-055",
      nameEn: "Infermon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Black", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Unknown"],
      types: ["Unidentified"],
      effectText:
        "[When Digivolving] ＜De-Digivolve1＞ 1 of your opponent's Digimon (Trash the top card. You can't trash past level 3 cards). Then, 1 of your opponent's Digimon with a play cost 8 or less can't attack players until the end of their turn.",
      inheritedEffectText:
        "[All Turns] [Once Per Turn] When you play another Digimon with [Diaboromon]\u00a0in its name, ＜De-Digivolve1＞ 1 of your opponent's Digimon (Trash the top card. You can't trash past level 3 cards).",
    });

    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);

    // Clause 1: [When Digivolving] De-Digivolve 1 (ANY opponent Digimon, no cost filter,
    // floored at level 3); THEN restrict 1 opponent Digimon with play cost <= 8 from
    // attacking players until the end of their turn.
    expect(compiled.effects[0]).toEqual({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "DeDigivolve",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: 1,
          stopAtLevel: 3,
        },
        {
          kind: "Restrict",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 8 },
            count: 1,
          },
          restriction: "attackPlayers",
          duration: "untilOpponentTurnEnd",
        },
      ],
    });

    // Inherited: "with [Diaboromon] IN ITS NAME" is a SUBSTRING reference, so `match: "name"`
    // is correct here (unlike a bracketed exact `[Name]` reference, which needs `nameExact`).
    const inherited = compiled.effects[1]!;
    expect(inherited.trigger).toBe("AllTurns");
    expect(inherited.isInherited).toBe(true);
    expect(inherited.frequency).toBe("OncePerTurn");
    expect(inherited.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: {
        controller: "mine",
        excludeSelf: true,
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Diaboromon"], match: "name" }],
      },
      actions: [
        {
          kind: "DeDigivolve",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: 1,
          stopAtLevel: 3,
        },
      ],
    });
  });

  it("de-digivolves one opponent and keeps the cost-8 restriction after the target grows past cost 8 (KB Q2809)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-054", as: "base" }],
          hand: [{ card: "BT17-055", as: "infermon" }],
        },
        1: {
          battleArea: [{ card: "BT4-035", under: ["BT17-025"], as: "restricted" }],
          hand: [{ card: "BT4-035", as: "upgraded" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    const removedTopId = s.perm("restricted").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("infermon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === removedTopId));

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === removedTopId)).toBe(true);
    expect(s.perm("restricted").topCard?.cardId).toBe("BT17-025");
    expect(s.perm("restricted").stack).toHaveLength(0);
    expect(s.perm("base").topCard?.cardId).toBe("BT17-055");
    expect(observe(s.engine).isRestricted(s.perm("restricted"), "attackPlayers")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();

    // KB Q2809: the target digivolves on its own turn into a play-cost-12 Digimon. The
    // restriction was locked to the permanent when it resolved, so it still can't attack players.
    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("restricted").permanentId,
        instanceId: s.inst("upgraded").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("restricted").topCard?.cardId === "BT4-035");

    expect(getCardDefinition("BT4-035")?.playCost).toBe(12);
    expect(observe(s.engine).isRestricted(s.perm("restricted"), "attackPlayers")).toBe(true);
  });

  it("blocks only player attacks by the chosen cost-8-or-lower Digimon, leaving its cost-12 peer free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-054", as: "base" }],
          hand: [{ card: "BT17-055", as: "infermon" }],
          security: [{ card: "BT1-009" }, { card: "BT1-010" }],
        },
        1: {
          // `small` is the only opponent Digimon at play cost <= 8, so the Restrict target is
          // deterministic; `big` stays at play cost 12 even after a De-Digivolve trashes its top.
          battleArea: [
            { card: "BT17-025", under: ["BT17-053"], as: "small" },
            { card: "BT4-035", under: ["BT4-035"], as: "big", dp: 20_000 },
          ],
          hand: [{ card: "BT1-102", as: "spare" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("infermon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("small"), "attackPlayers"));

    expect(observe(s.engine).isRestricted(s.perm("small"), "attackPlayers")).toBe(true);
    // Peer comparison: the cost-12 Digimon is outside "play cost 8 or less" and is unrestricted.
    expect(observe(s.engine).isRestricted(s.perm("big"), "attackPlayers")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();

    s.state.turnSeat = 1;
    s.state.memory = 3;
    // An attack on a Digimon needs a SUSPENDED defender.
    s.perm("base").isSuspended = true;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("small").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(s.state.players[0]!.security).toHaveLength(2);

    // "can't attack players" leaves a Digimon-directed attack legal.
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("small").permanentId,
        target: { kind: "permanent", permanentId: s.perm("base").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("small").isSuspended);

    // The unrestricted peer may still attack the player.
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("big").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("cannot trash past a level 3 card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-054", as: "base" }],
          hand: [{ card: "BT17-055", as: "infermon" }],
        },
        1: { battleArea: [{ card: "BT17-053", as: "lvThree", dp: 20_000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("infermon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("lvThree"), "attackPlayers"));

    // ＜De-Digivolve1＞ cannot trash past level 3: the lone level-3 top card stays put.
    expect(s.perm("lvThree").topCard?.cardId).toBe("BT17-053");
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    // The second clause still resolves on the same (play cost 3) Digimon.
    expect(observe(s.engine).isRestricted(s.perm("lvThree"), "attackPlayers")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("inherits de-digivolution once per turn when another Diaboromon-named Digimon is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-057", under: ["BT17-055"], as: "host" }],
          hand: [
            { card: "BT17-059", as: "firstDiaboromon" },
            { card: "BT17-059", as: "secondDiaboromon" },
            { card: "BT1-102", as: "spare" },
          ],
        },
        1: {
          battleArea: [{ card: "BT4-035", under: ["BT17-053", "BT17-025"], as: "target" }],
        },
      },
      { autoSelectCards: true },
    );
    const firstRemovedId = s.perm("target").topCard!.instanceId;
    s.state.memory = 30;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("firstDiaboromon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === firstRemovedId));

    expect(s.perm("target").topCard?.cardId).toBe("BT17-025");
    const secondTopId = s.perm("target").topCard!.instanceId;

    // Same turn: [Once Per Turn] refuses the second Diaboromon's play.
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("secondDiaboromon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 3);
    expect(s.perm("target").topCard?.instanceId).toBe(secondTopId);
    expect(s.state.players[1]!.trash).toHaveLength(1);

    // The next own turn resets the gate: playing another Diaboromon de-digivolves again.
    const revived = s.give(0, Zone.Hand, { card: "BT17-059", as: "thirdDiaboromon" });
    const mainPhase = s.state.phase;
    s.state.memory = 3;
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 30;
    s.state.phase = mainPhase;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: revived.instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.length === 2);
    expect(s.perm("target").topCard?.cardId).toBe("BT17-053");
  });
});
