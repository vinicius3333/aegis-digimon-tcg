import { EffectTiming, getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT25_039 } from "./BT25-039.js";
import "../index.js";

describe("BT25-039 Sirenmon", () => {
  it("keeps the TS evolution route alternate to the normal Yellow/Green routes", () => {
    expect(getCardDefinition("BT25-039")).toMatchObject({
      evoCosts: [
        { color: "Yellow", level: 4, memoryCost: 4 },
        { color: "Green", level: 4, memoryCost: 4 },
      ],
    });
    expect(BT25_039.digivolutionRequirement).toEqual([{ level: 4, traits: ["TS"], cost: 3, isAlternate: true }]);
  });

  it("can digivolve from a TS level-4 base for the alternate cost of 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT25-033", as: "base" }],
        hand: [{ card: "BT25-039", as: "sirenmon" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("sirenmon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT25-039");

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.at(-1)?.cardId).toBe("BT25-033");
  });

  it("places this security card under the Ceresmon played by its security effect", () => {
    const effect = BT25_039.effects?.find((entry) => entry.trigger === "EndOfYourTurn");
    const [play, place] = effect?.actions ?? [];
    expect(effect?.isSecurity).toBe(true);
    expect(play).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: true,
      reduceCostBy: 7,
      optional: true,
      target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Ceresmon"], match: "name" }] } },
    });
    expect(place).toMatchObject({
      kind: "PlaceUnder",
      position: "bottom",
      underFilter: { lastPlayed: true, controller: "mine", kind: ["Digimon"] },
      condition: { kind: "ifThisEffectActed" },
      optional: true,
    });
  });

  it("plays Ceresmon for 5 memory and places this face-up security card underneath it", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT25-039", as: "sirenmon", faceUp: true }],
          hand: [{ card: "BT25-059", as: "ceresmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    await advance(s.engine).fireForInstance(EffectTiming.OnEndTurn, s.inst("sirenmon"));

    expect(s.state.memory).toBe(0);
    const ceresmon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT25-059");
    expect(ceresmon).toBeDefined();
    expect(ceresmon!.stack.map((card) => card.cardId)).toContain("BT25-039");
    expect(ceresmon!.stack.find((card) => card.cardId === "BT25-039")?.faceUp).toBe(true);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("sirenmon").instanceId)).toBe(false);
  });

  it("places itself face up at the bottom of security on deletion", () => {
    const effect = BT25_039.effects?.find((entry) => entry.trigger === "OnDeletion");
    expect(effect?.actions?.[0]).toMatchObject({
      kind: "SecurityManipulation",
      op: "placeAsSecurity",
      controller: "mine",
      toTop: false,
      faceUp: true,
    });
    expect((effect?.actions?.[0] as { source?: unknown }).source).toBeUndefined();
  });

  it("deletes itself once to prevent all simultaneous matching departures", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-039", as: "sirenmon" },
            { card: "BT25-033", as: "shaman" },
            { card: "BT25-034", as: "iliad" },
            { card: "BT1-009", as: "other" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();

    expect(
      await advance(s.engine).verb.deletePermanent(
        [s.perm("shaman").permanentId, s.perm("iliad").permanentId, s.perm("other").permanentId],
        "byBattle",
      ),
    ).toBe(1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT25-033")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT25-034")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009")).toBe(false);
    expect(s.state.players[0]!.security.at(-1)?.cardId).toBe("BT25-039");
    expect(s.state.players[0]!.security.at(-1)?.faceUp).toBe(true);
  });

  it("does not replace a departure caused by the controller's own effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-039", as: "sirenmon" },
            { card: "BT25-033", as: "shaman" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();

    const shamanId = s.perm("shaman").permanentId;
    const sirenmonId = s.perm("sirenmon").permanentId;
    expect(await advance(s.engine).verb.deletePermanent([shamanId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === shamanId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === sirenmonId)).toBe(true);
  });

  it("protects all matching other Shaman/Iliad permanents from non-own effects", () => {
    const effect = BT25_039.effects?.find((entry) => entry.trigger === "AllTurns");
    const replacement = effect?.actions?.[0] as { affectsAll?: boolean; sourceFilter?: unknown; cost?: unknown };
    expect(replacement.affectsAll).toBe(true);
    expect(replacement.sourceFilter).toMatchObject({
      controller: "mine",
      excludeSelf: true,
      kind: ["Digimon", "Tamer"],
      nameOrTrait: [{ tokens: ["Shaman", "Iliad"], match: "trait" }],
    });
    expect(replacement.cost).toMatchObject({ kind: "deleteOwn" });
  });

  it("inherits the optional once-per-turn redirect to a suspended Digimon", () => {
    expect(BT25_039.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "OpponentsTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "RedirectAttack",
              optional: true,
              target: { filter: { controller: "mine", suspended: true, kind: ["Digimon"] }, count: 1 },
            },
          ],
        },
      ],
    });
  });

  it("redirects an opponent attack to a suspended Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-059", as: "host", under: [{ card: "BT25-039", as: "sirenmon" }] },
            { card: "BT1-009", as: "redirect", suspended: true, dp: 12_000 },
          ],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker", dp: 7_000 }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("attacker").instanceId) &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("redirect").permanentId),
    ).toBe(true);
  });

  it("redirects only the first of two opponent attacks in the same turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "host", under: [{ card: "BT25-039", as: "sirenmon" }] },
            { card: "BT1-009", as: "firstRedirect", suspended: true, dp: 12_000 },
            { card: "BT1-009", as: "secondRedirect", suspended: true, dp: 12_000 },
          ],
          security: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstAttacker", dp: 7_000 },
            { card: "BT1-009", as: "secondAttacker", dp: 7_000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("firstAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("firstAttacker").instanceId) &&
        s.events.some((event) => event.kind === "combatResolved") &&
        s.state.phase === Phase.Main &&
        !observe(s.engine).isAttacking(),
      5_000,
    );
    expect(s.state.players[0]!.security).toHaveLength(2);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.permanentId === s.perm("secondRedirect").permanentId,
      ),
    ).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("may decline the redirect without changing the original player target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-059", as: "host", under: [{ card: "BT25-039" }] },
            { card: "BT1-009", as: "redirect", suspended: true, dp: 12_000 },
          ],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 7_000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);

    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("attacker").permanentId),
    ).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("redirect").permanentId),
    ).toBe(true);
  });
});
