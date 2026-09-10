import { describe, expect, it } from "vitest";
import { getCardDefinition, PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";
import { compiled } from "./EX8-050.js";

describe("EX8-050", () => {
  it("matches the committed catalog identity, printed clauses, and inherited Blocker/redirect", () => {
    expect(getCardDefinition("EX8-050")).toMatchObject({
      cardId: "EX8-050",
      nameEn: "Gogmamon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Black", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Rock"],
      effectText:
        "＜Blocker＞ \n[On Deletion] Reveal the top 3 cards of your deck. You may play 1 Digimon card with the [Mineral]/[Rock] trait and a play cost of 5 or less among them without paying the cost. Trash the rest.",
      inheritedEffectText:
        "[Opponent's Turn] [Once Per Turn] When one of your opponent's Digimon attacks, you may change the attack target to this Digimon.",
    });
    expect(getCardDefinition("EX8-050")?.securityEffectText).toBeUndefined();
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toContainEqual({
      keyword: "Blocker",
      raw: "＜Blocker＞",
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
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
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            },
          ],
        },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        {
          filter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            playCostLte: 5,
            nameOrTrait: [{ tokens: ["Mineral", "Rock"], match: "trait" }],
          },
          count: 1,
          to: "play",
          optional: true,
        },
      ],
      rest: "trash",
    });
  });
  it("reveals three cards on deletion, plays a matching Digimon, and trashes the rest", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-050", as: "source" }],
          deck: [
            { card: "EX8-049", as: "match" },
            { card: "EX8-048", as: "other" },
            { card: "AD1-001", as: "rest" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const source = player.battleArea[0]!;
    await advance(s.engine).verb.deletePermanent([source.permanentId]);
    await settle(() => player.battleArea.some((permanent) => permanent.topCard?.cardId === "EX8-049"));
    expect(player.battleArea.some((permanent) => permanent.topCard?.cardId === "EX8-049")).toBe(true);
    expect(player.trash.some((card) => card.cardId === "EX8-048")).toBe(true);
    expect(player.trash.some((card) => card.cardId === "AD1-001")).toBe(true);
    expect(player.deck).toHaveLength(0);
  });

  it("trashes all three revealed cards when no Mineral or Rock card is within the cost limit", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-050", as: "source" }],
          deck: [
            { card: "EX8-053", as: "overCost" },
            { card: "EX8-052", as: "other" },
            { card: "BT1-010", as: "rest" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const source = player.battleArea[0]!;
    await advance(s.engine).verb.deletePermanent([source.permanentId]);
    await settle(
      () => player.trash.filter((card) => ["EX8-053", "EX8-052", "BT1-010"].includes(card.cardId)).length === 3,
    );

    expect(player.battleArea).toHaveLength(0);
    expect(player.trash.some((card) => card.instanceId === s.inst("overCost").instanceId)).toBe(true);
    expect(player.trash.some((card) => card.instanceId === s.inst("other").instanceId)).toBe(true);
    expect(player.trash.some((card) => card.instanceId === s.inst("rest").instanceId)).toBe(true);
  });

  it("may decline the matching deletion play and trashes all revealed cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX8-050", as: "source", suspended: true }],
        deck: ["EX8-049", "EX8-048", "AD1-001"],
      },
      1: { battleArea: [{ card: "BT1-016", as: "attacker", dp: 20000 }] },
    });
    const player = s.state.players[0] as PlayerState;
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: player.battleArea[0]!.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decline = s.state.pendingDecision!;
    expect(JSON.parse(decline.payloadJson)).toMatchObject({ min: 0, max: 1 });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decline.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => player.deck.length === 0 && s.state.pendingDecision === undefined);
    expect(player.battleArea).toHaveLength(0);
    expect(player.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["EX8-050", "EX8-049", "EX8-048", "AD1-001"]),
    );
  });

  it("redirects an opponent's attack to the inherited host once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-081", as: "host", under: ["EX8-050"], dp: 10000 }],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-016", as: "attacker", dp: 1000 },
            { card: "BT1-016", as: "second", dp: 1000 },
          ],
        },
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
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(2);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("second").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);
    expect(s.perm("host").isSuspended).toBe(false);
  });

  it("can decline the optional inherited redirect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-081", as: "host", under: ["EX8-050"], dp: 10000 }],
          security: ["BT1-009", "BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-016", as: "attacker", dp: 1000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
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
    await settle(() => s.state.players[0]!.security.length === 1 && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.perm("host").isSuspended).toBe(false);
  });

  it("exposes its printed Blocker keyword live", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-050", as: "gogmamon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("gogmamon"), "Blocker")).toBe(true);
  });

  it("evolves legally from a Black level-4 peer for three and rejects an off-color source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-049", as: "base" }], hand: [{ card: "EX8-050", as: "gogmamon" }] },
    });
    await s.ready();
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gogmamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX8-050");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX8-049"]);
    expect(s.state.memory).toBe(0);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT10-079", as: "base" }], hand: [{ card: "EX8-050", as: "gogmamon" }] },
    });
    await invalid.ready();
    invalid.state.memory = 3;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("gogmamon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
