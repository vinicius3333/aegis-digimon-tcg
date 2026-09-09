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
      payCost: false,
      cost: { kind: "payMemory", memory: 2 },
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
    expect(compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")?.actions[1]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      target: { filter: { controller: "opponent", kind: ["Tamer"] }, upTo: true, chooser: "opponent" },
      condition: { kind: "ifThisEffectActed", raw: "you did" },
    });
    expect(compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")?.actions[1]).not.toHaveProperty(
      "controller",
    );
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
    expect(
      s.state.players[1]?.battleArea.some((p) => p.topCard?.instanceId === s.inst("opponentTamer").instanceId),
    ).toBe(true);
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
        1: { battleArea: [{ card: "BT17-064", dp: 1000, as: "attacker" }] },
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
    expect(s.perm("openHost").isSuspended).toBe(false);
    expect(s.perm("suspendedDecoy").isSuspended).toBe(true);
  });

  it("rejects a digivolve from a base that is not [Morphomon]", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "wrongBase" }],
        hand: [{ card: "BT17-074", as: "eosmon" }],
      },
    });
    s.state.turnSeat = 0;
    s.state.memory = 5;

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("wrongBase").permanentId,
      instanceId: s.inst("eosmon").instanceId,
    });

    expect(result.ok).toBe(false);
    expect(s.perm("wrongBase").topCard.cardId).toBe("BT1-009");
  });

  it("gives the opponent no Tamer play when the controller declines the play", async () => {
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
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 5;
    const tamerId = s.inst("tamer").instanceId;
    const opponentTamerId = s.inst("opponentTamer").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("morphomon").permanentId,
        instanceId: s.inst("eosmon").instanceId,
      }).ok,
    ).toBe(true);
    await settle(() => s.perm("morphomon").topCard.cardId === "BT17-074");

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === tamerId)).toBe(true);
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === opponentTamerId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(3);
  });

  it("redirects only one opponent attack per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-075", under: ["BT17-074"], dp: 20_000, as: "openHost" }],
          security: [{ card: "BT1-009" }, { card: "BT1-012" }],
        },
        1: {
          battleArea: [
            { card: "BT17-064", dp: 1000, as: "firstAttacker" },
            { card: "BT17-064", dp: 1000, as: "secondAttacker" },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("firstAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("firstAttacker").instanceId),
    );

    expect(s.events.filter((event) => event.kind === "attackDeclared").at(-1)).toMatchObject({
      target: { kind: "permanent", permanentId: s.perm("openHost").permanentId },
    });
    expect(s.state.players[0]!.security).toHaveLength(2);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);

    expect(s.events.filter((event) => event.kind === "attackDeclared").at(-1)).toMatchObject({
      target: { kind: "player" },
    });
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});
