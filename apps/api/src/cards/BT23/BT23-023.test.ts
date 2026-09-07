import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import "./BT23-015.js";
import { compiled } from "./BT23-023.js";

describe("BT23-023 Whamon", () => {
  it("once per turn replaces non-owner-effect removal with an optional stack play", () => {
    expect(getCardDefinition("BT23-023")).toMatchObject({
      cardId: "BT23-023",
      nameEn: "Whamon",
      colors: ["Blue"],
      level: 5,
      playCost: 9,
      dp: 9000,
      evoCosts: [{ color: "Blue", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Sea Animal", "CS"],
    });
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    const replacement = effect.actions[0];
    expect(effect.frequency).toBe("OncePerTurn");
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "otherThanYourEffect",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            source: "thisDigimon",
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Blue"],
              levelComparison: { op: "lte", value: 4 },
            },
            orFilters: [
              {
                controller: "mine",
                kind: ["Digimon"],
                levelComparison: { op: "lte", value: 4 },
                nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
              },
            ],
            count: 1,
          },
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      isInherited: true,
      actions: [expect.objectContaining({ kind: "Replacement", event: "wouldLeavePlay" })],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["CS"], cost: 3, isAlternate: true }]);
  });

  it("plays a blue level-4 source for free before Whamon leaves by an opponent effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-023", as: "whamon", under: ["BT1-009", { card: "BT23-018", as: "eligible" }] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const whamonId = s.perm("whamon").permanentId;
    expect(await advance(s.engine).verb.deletePermanent([whamonId], "byEffect")).toBe(1);
    expect(
      s.state.players[0]!.battleArea.some((card) => card.topCard?.instanceId === s.inst("eligible").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.battleArea.some((card) => card.permanentId === whamonId)).toBe(false);
  });

  it("publicly replaces opponent-effect deletion with its exact source card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-023", as: "whamon", dp: 7000, under: [{ card: "BT23-018", as: "source" }] }],
          deck: ["BT1-001", "BT1-002"],
        },
        1: { hand: [{ card: "BT23-015", as: "phoenix" }], deck: ["BT1-003", "BT1-004"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.engine.recomputeContinuousEffects();
    const whamonPermanentId = s.perm("whamon").permanentId;
    const sourceId = s.inst("source").instanceId;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("phoenix").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === sourceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === sourceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === whamonPermanentId)).toBe(false);
  });

  it("plays the exact Whamon source when Decoy protects its host from public Gaia Force", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT8-030",
              as: "surfimon",
              under: [
                { card: "BT23-016", as: "secondSource" },
                "BT23-039",
                { card: "BT23-021", as: "source" },
                "BT23-023",
              ],
            },
            { card: "BT6-059", as: "firstDecoy" },
            { card: "BT6-059", as: "secondDecoy" },
          ],
          hand: [{ card: "ST1-02", as: "neutralOwn" }],
          deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006", "BT1-007", "BT1-008"],
        },
        1: {
          hand: [
            { card: "ST1-16", as: "firstGaia" },
            { card: "ST1-16", as: "secondGaia" },
            { card: "ST1-16", as: "thirdGaia" },
            { card: "ST1-02", as: "neutralPlay" },
          ],
          battleArea: [{ card: "BT1-021", as: "redEnabler" }],
          deck: ["BT1-004", "BT1-005", "BT1-006", "BT1-007", "BT1-008", "BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    await s.engine.recomputeContinuousEffects();
    const hostId = s.perm("surfimon").permanentId;
    const sourceId = s.inst("source").instanceId;
    const secondSourceId = s.inst("secondSource").instanceId;
    preferInstanceIds.push(hostId, sourceId);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("firstGaia").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === sourceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === sourceId)).toBe(true);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("firstDecoy").instanceId);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("secondGaia").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.turnSeat === 0);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === secondSourceId)).toBe(false);
    expect(s.perm("surfimon").stack.map((card) => card.instanceId)).toContain(secondSourceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("secondDecoy").instanceId);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("thirdGaia").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === secondSourceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === secondSourceId)).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("publicly evolves for 3 and preserves the exact Whamon source beneath the new top card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-018", as: "base" }],
        hand: [{ card: "BT23-023", as: "whamon" }],
        deck: ["BT1-001", "BT1-002"],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const baseId = s.inst("base").instanceId;
    const whamonId = s.inst("whamon").instanceId;
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: whamonId }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.instanceId === whamonId);
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toContain(baseId);
    expect(s.perm("base").topCard?.instanceId).toBe(whamonId);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("uses inherited Whamon replacement when an opponent effect removes a legal stacked host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT23-035",
              as: "host",
              dp: 7000,
              under: [
                { card: "BT23-018", as: "source" },
                { card: "BT23-023", as: "inherited" },
              ],
            },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
        1: { hand: [{ card: "BT23-015", as: "phoenix" }], deck: ["BT1-003", "BT1-004"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.engine.recomputeContinuousEffects();
    const hostId = s.perm("host").permanentId;
    const sourceId = s.inst("source").instanceId;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("phoenix").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === sourceId)).toBe(true);
  });

  it("only searches Whamon's own digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-023", as: "whamon", under: [{ card: "BT1-009", as: "ineligible" }] },
            { card: "BT23-035", as: "neighbor", under: [{ card: "BT23-019", as: "wrongStack" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const whamonId = s.perm("whamon").permanentId;
    expect(await advance(s.engine).verb.deletePermanent([whamonId], "byEffect")).toBe(1);
    expect(
      s.state.players[0]!.battleArea.some((card) => card.topCard?.instanceId === s.inst("wrongStack").instanceId),
    ).toBe(false);
    expect(s.perm("neighbor").stack.some((card) => card.instanceId === s.inst("wrongStack").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((card) => card.permanentId === whamonId)).toBe(false);
  });

  it("inherits the same CS-or-blue reaction from a realistic stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-035", as: "carrier", under: [{ card: "BT23-017", as: "eligible" }, "BT23-020", "BT23-023"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const carrierId = s.perm("carrier").permanentId;
    expect(await advance(s.engine).verb.deletePermanent([carrierId], "byEffect")).toBe(1);
    expect(
      s.state.players[0]!.battleArea.some((card) => card.topCard?.instanceId === s.inst("eligible").instanceId),
    ).toBe(true);
  });

  it("does not react to its controller's own effect", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT23-023", as: "whamon", under: [{ card: "BT23-018", as: "eligible" }] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    expect(await advance(s.engine).verb.deletePermanent([s.perm("whamon").permanentId], "byEffect")).toBe(1);
    expect(
      s.state.players[0]!.battleArea.some((card) => card.topCard?.instanceId === s.inst("eligible").instanceId),
    ).toBe(false);
  });
});
