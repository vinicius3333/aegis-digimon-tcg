import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX2-021.js";
import "./EX2-021.js";
import "./EX2-019.js";
import "./EX2-023.js";
import "./EX2-060.js";
import "./EX2-014.js";
import "../BT4/BT4-104.js";
import "../BT1/BT1-080.js";
import "../BT1/BT1-102.js";
import "../P/P-095.js";

const inertSecurity = ["BT1-009", "BT1-010"];

describe("EX2-021 Kyubimon", () => {
  it("matches the catalog and compiled IR for both printed clauses", () => {
    expect(getCardDefinition("EX2-021")).toMatchObject({
      cardId: "EX2-021",
      nameEn: "Kyubimon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 6,
      dp: 5000,
      evoCosts: [{ color: "Yellow", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Mysterious Beast"],
      effectText:
        "[When Digivolving] Reveal the top 3 cards of your deck. Add 1 Option card with [Plug-In] in its name among them to your hand. Place the remaining cards at the bottom of your deck in any order.",
      inheritedEffectText:
        "[Your Turn][Once Per Turn] When you use an Option card with a cost of 2 or more, 1 of your opponent's Digimon gets -2000 DP for the turn.",
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "WhenDigivolving",
          actions: [
            {
              kind: "RevealAdd",
              revealCount: 3,
              rest: "deckBottom",
              add: [
                {
                  count: 1,
                  to: "hand",
                  filter: {
                    controllerDefault: "mine",
                    kind: ["Option"],
                    nameOrTrait: [{ tokens: ["Plug-In"], match: "name" }],
                  },
                },
              ],
            },
          ],
        },
        {
          trigger: "YourTurn",
          isInherited: true,
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenOptionUsed",
              fireCondition: { kind: "triggerOptionCostAtLeast", value: 2 },
              actions: [
                {
                  kind: "ModifyDP",
                  amount: -2000,
                  duration: "forTheTurn",
                  target: {
                    filter: { controller: "opponent", kind: ["Digimon"] },
                    count: 1,
                  },
                },
              ],
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("adds a Plug-In Option from the top three when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-019", as: "base" }],
          hand: [{ card: "EX2-021", as: "evolution" }],
          deck: [{ card: "EX2-066", as: "plugin" }, "EX2-014", "EX2-015"],
          security: inertSecurity,
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.deck.map((card) => card.cardId).join(",") === "EX2-014,EX2-015",
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("plugin").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["EX2-014", "EX2-015"]);
  });

  it("modifies one opposing Digimon only for cost-2 Options and only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-019", as: "host", under: ["EX2-021"] }],
          hand: [
            { card: "BT4-104", as: "cheap" },
            { card: "BT1-102", as: "option1" },
            { card: "BT1-102", as: "option2" },
          ],
          security: inertSecurity,
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT1-080", as: "target" }],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: inertSecurity,
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.perm("target").currentDP).toBe(12000);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cheap").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT4-104"));
    expect(s.perm("target").currentDP).toBe(12000);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option1").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-102").length === 1);
    expect(s.perm("target").currentDP).toBe(10000);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option2").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-102").length === 2);
    expect(s.perm("target").currentDP).toBe(10000);

    const turnLoop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("target").currentDP).toBe(12000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });

  it("rejects evolution from a non-yellow source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-014", as: "blueSource" }],
        hand: [{ card: "EX2-021", as: "evolution" }],
        deck: ["BT1-011", "BT1-012"],
        security: inertSecurity,
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueSource").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toMatchObject({ ok: false });
  });

  it("triggers after an Option used without paying its cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-023", as: "taomon", under: ["EX2-021"] },
            { card: "EX2-060", as: "rika" },
          ],
          hand: [{ card: "P-095", as: "plugin" }],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: inertSecurity,
        },
        1: {
          battleArea: [{ card: "BT1-080", as: "target" }],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: inertSecurity,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("taomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("rika").isSuspended && s.state.players[0]!.trash.some((card) => card.cardId === "P-095"));
    expect(s.perm("rika").isSuspended).toBe(true);
    expect(s.state.memory).toBe(10);
    expect(s.perm("target").currentDP).toBe(4000);
  });
});
