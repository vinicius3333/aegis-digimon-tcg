import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { MemoryGauge } from "../../engine/MemoryGauge.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-058.js";
import "../index.js";

describe("EX5-058 Octomon", () => {
  it("matches the catalog and registers every printed token clause", () => {
    expect(getCardDefinition("EX5-058")).toMatchObject({
      cardId: "EX5-058",
      nameEn: "Octomon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Mollusk"],
      evoCosts: [{ color: "Purple", level: 3, memoryCost: 2 }],
      effectText:
        "[On Play] [When Digivolving] If there are 4 or more total Digimon, play 1 [Fujitsumon] Token (Digimon/Purple/3000 DP/[All Turns] This Digimon doesn't unsuspend./[On Deletion] Trash 1 card in your hand.) suspended to your battle area. If there are 3 or fewer, play it suspended to your opponent's battle area.",
      inheritedEffectText: "[All Turns] [Once Per Turn] When an effect plays an opponent's Digimon, gain 1 memory.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(registeredCompiledCards.get("TOKEN-Fujitsumon-Token")).toMatchObject({
      effects: [
        { trigger: "Static", actions: [{ kind: "Restrict", restriction: "unsuspend", duration: "permanent" }] },
        {
          trigger: "OnDeletion",
          actions: [{ kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } }],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("encodes identical On Play and When Digivolving threshold branches", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "ConditionalBranch",
        condition: { kind: "totalDigimonCount", op: "gte", value: 4 },
        ifTrue: [
          {
            kind: "PlayToken",
            count: 1,
            payCost: false,
            suspended: true,
            tokens: [{ name: "Fujitsumon Token", kind: "Digimon", color: "Purple", dp: 3000 }],
          },
        ],
        ifFalse: [
          {
            kind: "PlayToken",
            count: 1,
            payCost: false,
            suspended: true,
            placedAs: "opponentDigimon",
            tokens: [{ name: "Fujitsumon Token", kind: "Digimon", color: "Purple", dp: 3000 }],
          },
        ],
      });
    }
  });

  it("plays one suspended token under the four-Digimon boundary", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX5-058", as: "source" }],
          battleArea: [{ card: "BT1-009" }, { card: "BT1-010" }, { card: "BT1-011" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "TOKEN-Fujitsumon-Token"));
    const token = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "TOKEN-Fujitsumon-Token");
    expect(token).toBeDefined();
    expect(token?.isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "TOKEN-Fujitsumon-Token")).toBe(false);
  });

  it("plays one suspended token to the opponent at three or fewer total Digimon", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX5-058", as: "source" }] } },
      { autoSelectCards: true, autoAcceptOptional: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "TOKEN-Fujitsumon-Token"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "TOKEN-Fujitsumon-Token")).toBe(false);
    const token = s.state.players[1]!.battleArea.find((p) => p.topCard.cardId === "TOKEN-Fujitsumon-Token");
    expect(token).toBeDefined();
    expect(token?.isSuspended).toBe(true);
  });

  it("takes the legal purple level-3 evolution route and rejects an off-color source", async () => {
    const legal = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-056", as: "host" }, { card: "BT1-009" }, { card: "BT1-010" }, { card: "BT1-011" }],
          hand: [{ card: "EX5-058", as: "evolution" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoChooseOption: true },
    );
    legal.state.memory = 6;
    await legal.ready();
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("host").permanentId,
        instanceId: legal.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("host").topCard.cardId === "EX5-058");
    expect(legal.perm("host").stack.map((card) => card.cardId)).toEqual(["EX5-056"]);
    expect(legal.state.memory).toBe(4);
    expect(legal.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "TOKEN-Fujitsumon-Token")).toBe(true);
    expect(legal.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "TOKEN-Fujitsumon-Token")).toBe(false);

    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host" }], hand: [{ card: "EX5-058", as: "evolution" }] },
    });
    illegal.state.memory = 5;
    await illegal.ready();
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("host").permanentId,
        instanceId: illegal.inst("evolution").instanceId,
      }).ok,
    ).toBe(false);
    expect(illegal.perm("host").topCard.cardId).toBe("BT1-009");
    expect(illegal.state.memory).toBe(5);
    expect(illegal.state.pendingDecision).toBeUndefined();
  });

  it("trashes one hand card when a suspended Fujitsumon is deleted", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "EX5-058", as: "source" },
          { card: "BT1-009", as: "discard" },
        ],
        battleArea: [{ card: "BT1-010" }, { card: "BT1-011" }, { card: "BT1-012" }],
      },
      1: { battleArea: [{ card: "BT1-014", as: "attacker", dp: 8000 }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "TOKEN-Fujitsumon-Token"));
    const token = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "TOKEN-Fujitsumon-Token");
    expect(token).toBeDefined();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: token!.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.permanentId === token!.permanentId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("discard").instanceId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("gains memory once for effect-played opponent Digimon and resets on the next own turn", async () => {
    expect(getCardDefinition("EX5-060")?.playCost).toBe(7);
    const options = { autoAcceptOptional: true, autoSelectCards: true };
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-079", as: "host", under: ["EX5-058"] }],
          hand: [
            { card: "EX5-060", as: "first" },
            { card: "EX5-060", as: "second" },
            { card: "EX5-060", as: "third" },
          ],
          deck: Array.from({ length: 12 }, () => "BT1-009"),
        },
        1: {
          trash: [
            { card: "BT1-009", as: "targetOne" },
            { card: "BT1-010", as: "targetTwo" },
            { card: "BT1-011", as: "targetThree" },
          ],
          deck: Array.from({ length: 12 }, () => "BT1-009"),
        },
      },
      options,
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT1-009"));
    expect(s.state.memory).toBe(4);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT1-010"));
    expect(new MemoryGauge(s.state).memoryFor(0)).toBe(-3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    const controllerMemoryBeforeThird = new MemoryGauge(s.state).memoryFor(0);
    expect(controllerMemoryBeforeThird).toBe(3);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("third").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT1-011"));
    expect(new MemoryGauge(s.state).memoryFor(0)).toBe(controllerMemoryBeforeThird - 6);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    void loop;
  });

  it("proves the inherited +1 memory against an identical no-watcher control", async () => {
    const withWatcher = setupEngine(
      {
        0: { battleArea: [{ card: "BT10-079", under: ["EX5-058"] }], hand: [{ card: "EX5-060", as: "source" }] },
        1: { trash: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const control = setupEngine(
      {
        0: { hand: [{ card: "EX5-060", as: "source" }] },
        1: { trash: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await withWatcher.ready();
    await control.ready();
    withWatcher.state.memory = 10;
    control.state.memory = 10;
    expect(
      withWatcher.engine.applyIntent(0, { type: "playCard", instanceId: withWatcher.inst("source").instanceId }),
    ).toEqual({ ok: true });
    expect(control.engine.applyIntent(0, { type: "playCard", instanceId: control.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => withWatcher.state.players[1]!.battleArea.length > 0);
    await settle(() => control.state.players[1]!.battleArea.length > 0);
    expect(withWatcher.state.memory).toBe(control.state.memory + 1);
    expect(control.state.memory).toBe(3);
  });

  it("plays the token through an opponent-play restriction, as required by Crimson Blaze rulings", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "redSource" }], hand: [{ card: "BT8-097", as: "blaze" }] },
      1: { hand: [{ card: "EX5-058", as: "source" }] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blaze").instanceId })).toEqual({ ok: true });
    await settle();
    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "TOKEN-Fujitsumon-Token"));
    const token = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "TOKEN-Fujitsumon-Token");
    expect(token?.isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("keeps the inherited watcher restricted to opponent Digimon in the battle area", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "opponent", zone: "battleArea", kind: ["Digimon"], byEffect: true },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    });
  });
});
