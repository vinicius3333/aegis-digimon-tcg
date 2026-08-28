import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-074.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./index.js";

describe("BT17-074 Eosmon — when digivolving play", () => {
  it("plays one qualifying card for exactly 2 memory and allows the opponent's Tamer response", () => {
    const action = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0];
    expect(action).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: true,
      costOverride: 2,
      condition: { kind: "isYourTurn" },
      optional: true,
      target: {
        filter: {
          controller: "mine",
          zone: "hand",
          kind: ["Tamer"],
          colors: ["White"],
          playCostLte: 4,
        },
        orFilters: [
          {
            controller: "mine",
            zone: "hand",
            kind: ["Digimon"],
            levelComparison: { op: "lte", value: 5 },
          },
        ],
      },
    });
    expect(compiled.effects.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenOpponentAttacks",
      actions: [
        {
          kind: "RedirectAttack",
          optional: true,
          target: { filter: { controller: "mine", unsuspended: true }, count: 1 },
        },
      ],
    });
  });

  it("plays a white cost-4-or-less Tamer for 2 memory on your turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-044", as: "morphomon" }],
          hand: [
            { card: "BT17-074", as: "eosmon" },
            { card: "BT17-092", as: "tamer" },
          ],
        },
        1: { hand: [{ card: "BT17-083", as: "opponentTamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 5;
    const morphomonId = s.perm("morphomon").permanentId;
    const eosmonId = s.inst("eosmon").instanceId;
    const tamerId = s.inst("tamer").instanceId;

    expect(s.engine.applyIntent(0, { type: "digivolve", instanceId: eosmonId, permanentId: morphomonId }).ok).toBe(
      true,
    );
    await settle(() => !s.state.players[0]?.hand.some((card) => card.instanceId === tamerId), 800);

    expect(s.state.players[0]?.battleArea.some((p) => p.topCard?.instanceId === tamerId)).toBe(true);
    expect(s.state.players[1]?.battleArea.some((p) => p.topCard?.instanceId === s.inst("opponentTamer").instanceId)).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("plays a level-5-or-lower Eosmon from hand for 2 memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-044", as: "morphomon" }],
          hand: [
            { card: "BT17-074", as: "eosmon" },
            { card: "BT17-075", as: "eosmonUltimate" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("morphomon").permanentId,
        instanceId: s.inst("eosmon").instanceId,
      }).ok,
    ).toBe(true);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT17-075"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT17-075")).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("redirects an opponent attack only to an unsuspended Eosmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-074", suspended: true, as: "suspendedDecoy" },
            { card: "BT17-075", under: ["BT17-074"], as: "openHost" },
          ],
        },
        1: { battleArea: [{ card: "BT17-063", dp: 1000, as: "attacker" }] },
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
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("attacker").instanceId));

    const declared = s.events.filter((event) => event.kind === "attackDeclared").at(-1);
    expect(declared).toMatchObject({ target: { kind: "permanent", permanentId: s.perm("openHost").permanentId } });
    expect(s.perm("openHost").isSuspended).toBe(true);
    expect(s.perm("suspendedDecoy").isSuspended).toBe(true);
  });
});
