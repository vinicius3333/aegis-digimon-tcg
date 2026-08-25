import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT25_039 } from "./BT25-039.js";
import "../index.js";

describe("BT25-039 Sirenmon", () => {
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
