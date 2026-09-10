import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-015.js";
import "../index.js";
import "../BT10/BT10-008.js";
import "../BT2/BT2-112.js";
import "../BT12/BT12-074.js";
import "../P/P-148.js";
import "../ST13/ST13-16.js";

describe("EX7-015 Otamamon", () => {
  it("matches the catalog, alternate evolution route, and compiled clause", () => {
    expect(getCardDefinition("EX7-015")).toMatchObject({
      cardId: "EX7-015",
      nameEn: "Otamamon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 3000,
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Amphibian", "NSp"],
      evoCosts: [
        { color: "Blue", level: 2, memoryCost: 0 },
        { color: "Green", level: 2, memoryCost: 0 },
      ],
      effectText: "[Digivolve]Lv.2 w/[NSp]\u00a0trait: Cost 0 \n\n[All Turns] Players can't reduce play costs.",
    });
    expect(digivolutionRequirementsFor("EX7-015")).toContainEqual({
      level: 2,
      traits: ["NSp"],
      cost: 0,
      isAlternate: true,
    });
    expect(compiled.effects).toEqual([
      {
        trigger: "AllTurns",
        actions: [
          {
            kind: "RestrictCostReduction",
            seat: "any",
            costType: "play",
            duration: "permanent",
          },
        ],
      },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("Q3837/Q3839: blocks a printed reduction for both players on real turns", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["EX7-015", { card: "BT1-084", as: "largeForOpponent" }],
        hand: [{ card: "BT2-112", as: "mine" }],
        deck: ["BT1-009", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
      },
      1: {
        battleArea: [{ card: "BT1-084", as: "largeForMine" }],
        hand: [{ card: "BT2-112", as: "opponent" }],
        deck: ["BT1-009", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
      },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 20;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mine").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("mine").instanceId),
    );
    expect(s.state.memory).toBe(7);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 20;
    const opponentMemoryBeforePlay = s.state.memory;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponent").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("opponent").instanceId),
    );
    expect(s.state.memory).toBe(opponentMemoryBeforePlay - 13);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q3838: permits a public effect that plays a Digimon without paying its cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["EX7-015", "ST13-12"],
          hand: [
            { card: "ST13-16", as: "alliance" },
            { card: "ST13-04", as: "legendArm" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("alliance").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "ST13-04"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "ST13-04")).toBe(true);
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.hand).toHaveLength(0);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q3840: blocks DigiXros play-cost reduction under the static restriction", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["EX7-015"],
        hand: [
          { card: "BT12-074", as: "gumdramon" },
          { card: "BT10-008", as: "material" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("gumdramon").instanceId,
        digiXros: { materialInstanceIds: [s.inst("material").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("gumdramon").instanceId),
    );

    // Expected rules result: 10 - the printed play cost 4 = 6; materials remain legal and
    // are still placed under the played Digimon even though their reduction is suppressed.
    expect(s.state.memory).toBe(6);
    expect(s.perm("gumdramon").stack.map((card) => card.instanceId)).toEqual([s.inst("material").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("evolves legally from an NSp Lv.2 for 0, draws the exact card, and preserves stack identity", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "P-148", as: "nspSource" },
        hand: [{ card: "EX7-015", as: "otamamon" }],
        deck: [
          { card: "BT1-009", as: "drawn" },
          { card: "BT1-011", as: "rest" },
        ],
      },
    });
    s.state.memory = 0;
    await s.ready();
    const sourceId = s.inst("nspSource").instanceId;
    const targetId = s.inst("otamamon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("nspSource").permanentId,
        instanceId: targetId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === targetId);

    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe("EX7-015");
    expect(s.state.players[0]!.breeding?.stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-011"]);
    expect(s.state.memory).toBe(0);
    expect(
      s.events.some((event) => event.kind === "digivolved" && "mechanic" in event && event.mechanic === "alternate"),
    ).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses a non-Lv.2, non-NSp source without drawing or changing memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "illegalSource" }],
        hand: [{ card: "EX7-015", as: "otamamon" }],
        deck: [
          { card: "BT1-009", as: "drawn" },
          { card: "BT1-011", as: "rest" },
        ],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("illegalSource").permanentId,
        instanceId: s.inst("otamamon").instanceId,
        useAlternateCost: true,
      }).ok,
    ).toBe(false);
    expect(s.perm("illegalSource").topCard?.cardId).toBe("BT1-009");
    expect(s.perm("illegalSource").stack).toHaveLength(0);
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("otamamon").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("drawn").instanceId,
      s.inst("rest").instanceId,
    ]);
  });
});
