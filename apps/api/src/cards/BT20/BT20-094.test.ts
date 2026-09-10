import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-094.js";
import "./index.js";
import "./BT20-011.js";
import "./BT20-074.js";
import "../BT17/BT17-077.js";
import "../ST1/ST1-12.js";

describe("BT20-094 Emperor Dragon of Calamity", () => {
  it("matches the catalog and reduces the optional Free Digimon trash play by 5", () => {
    expect(getCardDefinition("BT20-094")).toMatchObject({
      cardId: "BT20-094",
      nameEn: "Emperor Dragon of Calamity",
      colors: ["Red", "Purple"],
      kinds: ["Option"],
      playCost: 3,
      types: ["Option"],
      effectText: expect.stringContaining("Imperialdramon: Dragon Mode"),
      securityEffectText: expect.stringContaining("level 3"),
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((entry) => entry.trigger === "Main" && !entry.keywords)).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: true,
          reduceCostBy: 5,
          optional: true,
          target: {
            filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Free"], match: "trait" }] },
            count: 1,
          },
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
    expect(compiled.effects.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levels: [3],
              nameOrTrait: [{ tokens: ["Free"], match: "trait" }],
            },
            count: 1,
          },
        },
        { kind: "AddToHandSelf" },
      ],
    });
  });

  it("reactively plays Dragon Mode from an exact Fighter Mode stack", () => {
    const reactive = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(reactive).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: { controller: "opponent" },
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["digivolutionCards"],
              payCost: false,
              optional: true,
              target: {
                filter: {
                  nameOrTrait: [{ tokens: ["Imperialdramon: Dragon Mode"], match: "nameExact" }],
                  zone: "digivolutionCards",
                  hostFilter: {
                    controller: "mine",
                    kind: ["Digimon"],
                    nameOrTrait: [{ tokens: ["Imperialdramon: Fighter Mode"], match: "nameExact" }],
                  },
                },
              },
            },
          ],
        },
      ],
    });
  });

  it("reacts only when the opponent's security stack loses a card", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      actions: [{ kind: "SubTrigger", event: "whenSecurityRemoved", sourceFilter: { controller: "opponent" } }],
    });
  });

  it("naturally plays a Free Digimon from trash with the 5-cost reduction and places itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "redSource" },
            { card: "BT10-071", as: "purpleSource" },
          ],
          hand: [{ card: "BT20-094", as: "option" }],
          trash: [{ card: "BT20-011", as: "freeDigimon" }],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-094"));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(
      expect.arrayContaining(["BT20-011", "BT20-094"]),
    );
    expect(s.state.memory).toBe(0);
  });

  it.each(["accept", "refuse", "sameTurn", "ownSecurity"] as const)(
    "resolves the reactive Delay window with a legal Fighter Mode source: %s",
    async (route) => {
      const options = { autoAcceptOptional: false, autoDeclineOptional: true, autoSelectCards: true };
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT20-020", under: ["BT20-076"], as: "fighter" }],
            hand: [{ card: "BT20-094", as: "option" }, "BT1-010"],
            security: ["BT1-010", "BT1-010"],
            deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010"],
          },
          1: {
            battleArea: [{ card: "BT1-027", dp: 5000, as: "opponent" }],
            security: ["BT1-010", "BT1-010"],
            deck: ["BT1-010", "BT1-010", "BT1-010"],
          },
        },
        options,
      );
      const optionId = s.inst("option").instanceId;
      const dragonId = s.perm("fighter").stack[0]!.instanceId;
      s.state.memory = 10;
      await s.ready();
      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === optionId));
      expect(s.state.memory).toBe(7);
      let activeSeat: 0 | 1 = 0;
      if (route !== "sameTurn") {
        advance(s.engine).endMainPhaseIfOpen(0);
        await advance(s.engine).waitForMainPhase(1);
        activeSeat = 1;
        if (route !== "ownSecurity") {
          advance(s.engine).endMainPhaseIfOpen(1);
          await advance(s.engine).waitForMainPhase(0);
          activeSeat = 0;
        }
      }
      options.autoAcceptOptional = route !== "refuse";
      options.autoDeclineOptional = route === "refuse";
      const memoryBefore = s.state.memory;
      expect(
        s.engine.applyIntent(activeSeat, {
          type: "attack",
          attackerPermanentId: s.perm(activeSeat === 0 ? "fighter" : "opponent").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      // These attacks are player-directed and unblocked, so they resolve through a security
      // check rather than `combatResolved` (that event only fires for a resolved
      // Digimon-vs-Digimon battle; see combat/controller.ts's `completedCombat`).
      await settle(
        () => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking(),
      );
      const accepted = route === "accept";
      expect(s.state.players[activeSeat === 0 ? 1 : 0]!.security).toHaveLength(1);
      expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === dragonId)).toBe(accepted);
      expect(s.perm("fighter").stack.some((card) => card.instanceId === dragonId)).toBe(!accepted);
      expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === optionId)).toBe(!accepted);
      expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(accepted);
      expect(s.state.memory).toBe(memoryBefore);
      expect(s.engine.applyIntent(activeSeat, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    },
  );

  it.each(["hand", "trash"] as const)(
    "plays a level-3 Free Digimon from %s in Security and adds itself to hand",
    async (zone) => {
      const s = setupEngine(
        {
          0: {
            security: [{ card: "BT20-094", as: "option" }],
            [zone]: [{ card: "BT20-009", as: "free" }],
            deck: ["BT1-010", "BT1-010"],
          },
          1: { battleArea: [{ card: "BT1-027", as: "attacker" }], deck: ["BT1-010", "BT1-010"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      const optionId = s.inst("option").instanceId;
      const freeId = s.inst("free").instanceId;
      await s.ready();
      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      advance(s.engine).endMainPhaseIfOpen(0);
      await advance(s.engine).waitForMainPhase(1);
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === optionId));
      expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === freeId)).toBe(true);
      expect(s.state.players[0]!.hand.some((card) => card.instanceId === optionId)).toBe(true);
      expect(s.state.memory).toBe(3);
      expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    },
  );

  it("keeps a non-Free level-3 Digimon in hand while still returning the Security Option to hand", async () => {
    const rejected = setupEngine(
      {
        0: {
          security: [{ card: "BT20-094", as: "option" }],
          hand: [{ card: "BT1-009", as: "nonFree" }],
          deck: ["BT1-010", "BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-027", as: "attacker" }], deck: ["BT1-010", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const rejectedOptionId = rejected.inst("option").instanceId;
    await rejected.ready();
    const rejectedLoop = rejected.engine.startTurnLoop();
    await advance(rejected.engine).waitForMainPhase(0);
    advance(rejected.engine).endMainPhaseIfOpen(0);
    await advance(rejected.engine).waitForMainPhase(1);
    expect(
      rejected.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: rejected.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => rejected.state.players[0]!.hand.some((card) => card.instanceId === rejectedOptionId));
    expect(rejected.state.players[0]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(rejected.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-094")).toBe(
      false,
    );
    expect(rejected.state.players[0]!.hand.some((card) => card.instanceId === rejectedOptionId)).toBe(true);
    expect(rejected.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await rejectedLoop;
  });

  it("resolves a Security effect and this card's security-removal Delay from one public check (Q4437)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-094", as: "option" },
            { card: "BT20-020", under: ["BT20-076"], as: "fighter" },
            { card: "BT1-009", as: "attacker" },
          ],
          deck: ["BT1-010", "BT1-010"],
        },
        1: { security: [{ card: "ST1-12", as: "securityTai" }], deck: ["BT1-010", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.some((event) => event.kind === "securityChecked") &&
        s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST1-12") &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-076"),
    );
    expect(s.events).toContainEqual(expect.objectContaining({ kind: "securityChecked", resolution: "effect" }));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST1-12")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-076")).toBe(true);
  });
});

it("pays the remaining reduced cost when the Free Digimon costs more than 5", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT20-074" }],
        hand: [{ card: "BT20-094", as: "option" }],
        trash: [{ card: "BT17-077", as: "paladin" }],
        deck: ["BT1-010"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 7;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT17-077"));
  expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-094")).toBe(true);
  expect(s.state.memory).toBe(0);
});
