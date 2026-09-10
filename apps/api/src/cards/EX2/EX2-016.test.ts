import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX2-016.js";
import "../index.js";

const inertDeck = ["BT1-009", "BT1-010", "BT1-011"];
const inertSecurity = ["BT1-012"];

describe("EX2-016 Gorillamon", () => {
  it("matches the catalog and compiles the optional source-play clause", () => {
    expect(getCardDefinition("EX2-016")).toMatchObject({
      cardId: "EX2-016",
      nameEn: "Gorillamon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 6,
      dp: 5000,
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Beastkin"],
      effectText:
        "[On Play] You may play 1 level 3 Digimon card from 1 of your blue Digimon's digivolution cards without paying its memory cost.",
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "OnPlay",
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["digivolutionCards"],
              payCost: false,
              optional: true,
              target: {
                count: 1,
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  levels: [3],
                  hostFilter: { controllerDefault: "mine", kind: ["Digimon"], colors: ["Blue"] },
                },
              },
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("plays exactly one level-3 card from a blue carrier's stack without paying its cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-014", as: "blueCarrier", under: [{ card: "EX2-013", as: "source" }] }],
          hand: [{ card: "EX2-016", as: "gorillamon" }],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gorillamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.battleArea.length === 3);
    expect(s.state.memory).toBe(4);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("source").instanceId),
    ).toBe(true);
    expect(s.perm("blueCarrier").stack).toHaveLength(0);
  });

  it("selects a level-3 source from the blue carrier and ignores a non-blue carrier", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-031", as: "blackCarrier", under: [{ card: "EX2-013", as: "blackSource" }] },
            { card: "EX2-014", as: "blueCarrier", under: [{ card: "EX2-013", as: "blueSource" }] },
          ],
          hand: [{ card: "EX2-016", as: "gorillamon" }],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gorillamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.battleArea.length === 3);
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("blueSource").instanceId,
      ),
    ).toBe(true);
    expect(s.perm("blackCarrier").stack.map((card) => card.instanceId)).toContain(s.inst("blackSource").instanceId);
  });

  it("does not play a level-4 card from a blue carrier", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-014", as: "carrier", under: [{ card: "EX2-015", as: "level4Source" }] }],
          hand: [{ card: "EX2-016", as: "gorillamon" }],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gorillamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.battleArea.length === 2);
    expect(s.perm("carrier").stack.map((card) => card.instanceId)).toContain(s.inst("level4Source").instanceId);
  });

  it("honors the optional refusal and leaves the source in its stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-014", as: "carrier", under: [{ card: "EX2-013", as: "source" }] }],
          hand: [{ card: "EX2-016", as: "gorillamon" }],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gorillamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.battleArea.length === 2);
    expect(s.perm("carrier").stack.map((card) => card.instanceId)).toContain(s.inst("source").instanceId);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("supports a legal blue level-3 evolution with paid cost, stack identity, and draw", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-013", as: "source" }],
          hand: [{ card: "EX2-016", as: "evolution" }],
          deck: ["BT1-010"],
          security: inertSecurity,
        },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "EX2-016");
    expect(s.perm("source").stack.map((card) => card.cardId)).toEqual(["EX2-013"]);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-010");
  });

  it("rejects evolution from a non-blue level-3 source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-019", as: "yellowSource" }],
        hand: [{ card: "EX2-016", as: "evolution" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("yellowSource").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toMatchObject({ ok: false });
  });
});
