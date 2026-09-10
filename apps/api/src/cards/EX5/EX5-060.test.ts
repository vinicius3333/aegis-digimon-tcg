import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-060.js";
import "../index.js";

describe("EX5-060 Dragomon", () => {
  it("matches the catalog and has full IR coverage", () => {
    expect(getCardDefinition("EX5-060")).toMatchObject({
      cardId: "EX5-060",
      nameEn: "Dragomon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Aquabeast"],
      evoCosts: [{ color: "Purple", level: 4, memoryCost: 3 }],
      effectText:
        "[On Play] [When Digivolving] Your opponent plays 1 level 4 or lower Digimon card from their trash suspended without paying the cost. [On Play] effects on Digimon played by this effect don't activate.[All Turns] [Once Per Turn] When an effect plays an opponent's Digimon, you may play 1 purple Digimon card with a level less than or equal to it from your trash without paying the cost.",
      inheritedEffectText:
        "＜Piercing＞ (When this Digimon attacks and deletes an opponent's Digimon and survives the battle, it performs any security checks it normally would).",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("maps both mandatory main triggers and the optional inherited trigger exactly", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({
        kind: "PlayWithoutCost",
        suspended: true,
        from: ["trash"],
        payCost: false,
        suppressOnPlayEffects: true,
        target: { filter: { controller: "opponent", kind: ["Digimon"], levels: [3, 4] }, count: 1 },
      });
    }
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "opponent", kind: ["Digimon"], byEffect: true },
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["trash"],
              payCost: false,
              optional: true,
              target: {
                filter: { controller: "mine", kind: ["Digimon"], colors: ["Purple"], levelLteTriggerSource: true },
                count: 1,
              },
            },
          ],
        },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toEqual([
      { keyword: "Piercing", raw: "＜Piercing＞" },
    ]);
  });

  it("must play an opponent's eligible level-3/4 trash Digimon suspended and suppress its On Play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX5-060", as: "source" }] },
        1: {
          trash: [{ card: "EX5-056", as: "candidate" }],
          hand: [{ card: "BT1-009", as: "held" }],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === s.inst("candidate").instanceId),
    );
    const candidate = s.state.players[1]!.battleArea.find(
      (p) => p.topCard.instanceId === s.inst("candidate").instanceId,
    );
    expect(candidate?.isSuspended).toBe(true);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual([s.inst("held").instanceId]);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("candidate").instanceId)).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("rejects an illegal level-5 trash target while accepting the inclusive level-4 boundary", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX5-060", as: "source" }] },
        1: {
          trash: [
            { card: "EX5-058", as: "levelFour" },
            { card: "EX5-060", as: "levelFive" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === s.inst("levelFour").instanceId),
    );
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === s.inst("levelFive").instanceId)).toBe(
      false,
    );
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("levelFive").instanceId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("takes the legal purple level-4 evolution route, fires When Digivolving, and rejects an off-color source", async () => {
    const legal = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-080", as: "host" }], hand: [{ card: "EX5-060", as: "evolution" }] },
        1: { trash: [{ card: "EX5-056", as: "candidate" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
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
    await settle(() => legal.perm("host").topCard.cardId === "EX5-060");
    expect(legal.perm("host").stack.map((card) => card.cardId)).toEqual(["BT4-080"]);
    expect(legal.state.memory).toBe(3);
    expect(
      legal.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === legal.inst("candidate").instanceId),
    ).toBe(true);

    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host" }], hand: [{ card: "EX5-060", as: "evolution" }] },
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

  it("optionally revives only a purple Digimon no higher than the triggered opponent", async () => {
    const accepted = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["EX5-060"] }],
          trash: [
            { card: "EX5-058", as: "revive" },
            { card: "EX5-060", as: "tooHigh" },
          ],
        },
        1: { hand: [{ card: "EX5-060", as: "effect" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await accepted.ready();
    accepted.state.turnSeat = 1;
    accepted.state.memory = 10;
    expect(
      accepted.engine.applyIntent(1, { type: "playCard", instanceId: accepted.inst("effect").instanceId }),
    ).toEqual({ ok: true });
    await settle(() =>
      accepted.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === accepted.inst("revive").instanceId),
    );
    expect(
      accepted.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === accepted.inst("tooHigh").instanceId),
    ).toBe(false);
    expect(observe(accepted.engine).hasPierce(accepted.perm("host"))).toBe(true);
    expect(accepted.state.pendingDecision).toBeUndefined();

    const declined = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["EX5-060"] }],
          trash: [
            { card: "EX5-058", as: "playedByEffect" },
            { card: "EX5-056", as: "reviveCandidate" },
          ],
        },
        1: { hand: [{ card: "EX5-060", as: "effect" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await declined.ready();
    declined.state.turnSeat = 1;
    declined.state.memory = 10;
    expect(
      declined.engine.applyIntent(1, { type: "playCard", instanceId: declined.inst("effect").instanceId }),
    ).toEqual({ ok: true });
    await settle(() =>
      declined.state.players[0]!.battleArea.some(
        (p) => p.topCard.instanceId === declined.inst("playedByEffect").instanceId,
      ),
    );
    expect(
      declined.state.players[0]!.trash.some((card) => card.instanceId === declined.inst("reviveCandidate").instanceId),
    ).toBe(true);
    expect(declined.state.pendingDecision).toBeUndefined();
  });

  it("inherits Piercing through a public battle that deletes and checks security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "host", dp: 8000, under: ["EX5-060"] }] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 1000, suspended: true }], security: ["BT1-011"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("target").permanentId));
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-010")).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("can play an opponent's Digimon despite the opponent's effect-play restriction", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "redSource" }],
        hand: [
          { card: "BT8-097", as: "restriction" },
          { card: "EX5-060", as: "source" },
        ],
      },
      1: { trash: [{ card: "EX5-056", as: "candidate" }] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("restriction").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === s.inst("candidate").instanceId),
    );
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === s.inst("candidate").instanceId)).toBe(
      true,
    );
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not let an opponent's Dragomon effect play my trash Digimon while restricted", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "redSource" }],
        hand: [{ card: "BT8-097", as: "restriction" }],
        trash: [{ card: "EX5-056", as: "mine" }],
      },
      1: { hand: [{ card: "EX5-060", as: "source" }] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("restriction").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("mine").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("mine").instanceId)).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("keeps the inherited event reference and source zone explicit for Q3658/Q3659", () => {
    const inherited = compiled.effects?.find((entry) => entry.trigger === "AllTurns");
    const watcher = inherited?.actions?.[0];
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controller: "opponent", kind: ["Digimon"], byEffect: true },
    });
    if (watcher?.kind !== "SubTrigger") throw new Error("EX5-060 All Turns watcher must be a SubTrigger");
    expect(watcher.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      target: { filter: { levelLteTriggerSource: true } },
    });
  });
});
