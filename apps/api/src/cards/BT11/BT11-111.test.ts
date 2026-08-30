import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT11-111.js";
import "./BT11-111.js";
describe("BT11-111 Galacticmon", () => {
  it("models all printed effects, including the Vemmon leave-play replacement", () => {
    expect(getCardDefinition("BT11-111")!.effectText).toContain("8 or more [Vemmon]");
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Snatchmon"], cost: 9, isAlternate: true }]);
    expect(compiled.effects).toHaveLength(3);
    expect(compiled.effects[0]?.actions[0]).toMatchObject({
      kind: "PlaceUnder",
      underFilter: { isSelfRef: true },
      position: "bottom",
      optional: true,
    });
    expect(compiled.effects[0]?.actions[1]).toMatchObject({
      kind: "Delete",
      condition: { kind: "selfDigivolutionStackCountAtLeast", count: 8 },
    });
    expect(compiled.effects[0]?.actions[1]).not.toHaveProperty("optional");
    expect(compiled.effects[1]?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          cost: {
            kind: "return",
            target: { filter: { zone: "digivolutionCards", hostFilter: { isSelfRef: true } }, from: ["digivolutionCards"] },
            to: "deckBottom",
          },
        },
      ],
    });
  });

  it("trashes the opponent's top security at start of main", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-111", as: "galactic" }] },
      1: { security: ["BT1-001", "BT1-002"] },
    });
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("galactic"));
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });

  it("places four trash Vemmon under the evolved Galacticmon at stack bottom and deletes at eight", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-066", as: "base", under: ["BT11-061", "BT11-061", "BT11-061", "BT11-061"] },
            { card: "BT1-009", as: "neighbor", under: ["BT11-061"] },
          ],
          hand: [{ card: "BT11-111", as: "galactic" }],
          trash: [
            { card: "BT11-061", as: "trashVemmon1" },
            { card: "BT11-061", as: "trashVemmon2" },
            { card: "BT11-061", as: "trashVemmon3" },
            { card: "BT11-061", as: "trashVemmon4" },
            { card: "BT11-061", as: "trashVemmon5" },
          ],
          deck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponentTarget" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    // If the host filter regresses to a broad own-Digimon selector, this preference makes
    // the unrelated neighbor the selected host and fails the stack assertions below.
    preferred.push(s.perm("neighbor").permanentId);
    const opponentTargetId = s.perm("opponentTarget").topCard.instanceId;
    const trashVemmonIds = ["trashVemmon1", "trashVemmon2", "trashVemmon3", "trashVemmon4"]
      .map((alias) => s.inst(alias).instanceId)
      .sort();
    const cappedTrashVemmonId = s.inst("trashVemmon5").instanceId;
    s.state.memory = 7;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("galactic").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("base").topCard?.cardId === "BT11-111" && s.state.players[1]!.battleArea.length === 0,
    );

    const galacticmon = s.perm("base");
    expect(galacticmon.stack.filter(({ cardId }) => cardId === "BT11-061")).toHaveLength(8);
    expect(galacticmon.stack.slice(0, 4).map(({ instanceId }) => instanceId).sort()).toEqual(trashVemmonIds);
    expect(s.perm("neighbor").stack.map(({ cardId }) => cardId)).toEqual(["BT11-061"]);
    expect(s.state.players[0]!.trash.filter(({ cardId }) => cardId === "BT11-061")).toHaveLength(1);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(cappedTrashVemmonId);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(opponentTargetId);
  });

  it("deletes after declining optional placement when the evolved stack already has eight Vemmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-066", as: "base", under: Array.from({ length: 8 }, () => "BT11-061") }],
          hand: [{ card: "BT11-111", as: "galactic" }],
          trash: [
            { card: "BT11-061", as: "declinedVemmon1" },
            { card: "BT11-061", as: "declinedVemmon2" },
            { card: "BT11-061", as: "declinedVemmon3" },
            { card: "BT11-061", as: "declinedVemmon4" },
          ],
          deck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponentTarget" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const opponentTargetId = s.perm("opponentTarget").topCard.instanceId;
    const declinedVemmonIds = ["declinedVemmon1", "declinedVemmon2", "declinedVemmon3", "declinedVemmon4"].map(
      (alias) => s.inst(alias).instanceId,
    );
    s.state.memory = 7;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("galactic").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(true);
    expect(s.perm("base").stack.filter(({ cardId }) => cardId === "BT11-061")).toHaveLength(8);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining(declinedVemmonIds),
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(opponentTargetId);
  });

  it("returns exactly four Galacticmon-stack Vemmon to deck bottom and prevents its departure", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT11-111",
              as: "galactic",
              under: ["BT11-061", "BT11-061", "BT11-061", "BT11-061", { card: "BT11-066", as: "nonVemmon" }],
            },
            { card: "BT1-009", as: "neighbor", under: [{ card: "BT11-061", as: "neighborVemmon" }] },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const galacticmonId = s.perm("galactic").permanentId;
    const returnedVemmonIds = s.perm("galactic").stack
      .filter(({ cardId }) => cardId === "BT11-061")
      .map(({ instanceId }) => instanceId)
      .sort();
    const neighborVemmonId = s.inst("neighborVemmon").instanceId;
    const driver = advance(s.engine);
    driver.verb.enterEffectResolution(1, ["Digimon"]);
    try {
      expect(await driver.verb.deletePermanent([galacticmonId], "byEffect")).toBe(0);
    } finally {
      driver.verb.leaveEffectResolution();
    }

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(galacticmonId);
    expect(s.perm("galactic").stack.filter(({ cardId }) => cardId === "BT11-061")).toHaveLength(0);
    expect(s.perm("galactic").stack.map(({ cardId }) => cardId)).toEqual(["BT11-066"]);
    expect(s.perm("neighbor").stack.map(({ cardId }) => cardId)).toEqual(["BT11-061"]);
    expect(s.state.players[0]!.deck.slice(-4).map(({ instanceId }) => instanceId).sort()).toEqual(returnedVemmonIds);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).not.toContain(neighborVemmonId);
  });
});
