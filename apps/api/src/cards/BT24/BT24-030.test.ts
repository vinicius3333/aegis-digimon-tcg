import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT24-030.js";
import "../index.js";

describe("BT24-030 Neptunemon", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("BT24-030")).toMatchObject({
      cardId: "BT24-030",
      nameEn: "Neptunemon",
      colors: ["Blue", "Black"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Shaman", "Olympos XII", "Iliad", "TS", "Aquatic"],
      evoCosts: [
        { color: "Blue", level: 5, memoryCost: 4 },
        { color: "Black", level: 5, memoryCost: 4 },
      ],
    });
  });

  it("reduces its play cost when the opponent has at least two Digimon", () => {
    const replacement = compiled.effects.find((effect) => effect.trigger === "Static")?.actions?.[0] as any;
    const reduction = replacement.actions[0];

    expect(reduction.event).toBe("wouldBePlayed");
    expect(reduction.mode).toBe("reduceCost");
    expect(reduction.amount).toBe(5);
    expect(reduction.condition).toMatchObject({
      kind: "opponentHas",
      count: 2,
      filter: { kind: ["Digimon"] },
    });
  });

  it("returns all opponent Digimon tied for fewest digivolution cards", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "Return",
        to: "deckBottom",
        target: { count: "all", filter: { superlative: "lowestDigivolutionCards" } },
      });
    }
  });

  it("protects every qualifying Digimon in one opponent-effect leave event (Q5610)", () => {
    const replacement = compiled.effects
      .filter((effect) => effect.trigger === "AllTurns")
      .flatMap((effect) => effect.actions)
      .find((action: any) => action.kind === "Replacement" && action.event === "wouldLeavePlay") as any;
    expect(replacement).toMatchObject({
      target: { count: 10000, upTo: true },
      affectsAll: true,
      leaveCause: "byOpponentEffect",
      cost: { kind: "suspend", target: { isSelf: true } },
    });
  });

  it("reduces its actual play cost by 5 only while the opponent has 2 Digimon", async () => {
    const reduced = setupEngine({
      0: { hand: [{ card: "BT24-030", as: "neptunemon" }] },
      1: { battleArea: ["BT1-009", "BT1-010"] },
    });
    reduced.state.memory = 12;
    await reduced.ready();
    expect(
      reduced.engine.applyIntent(0, {
        type: "playCard",
        instanceId: reduced.inst("neptunemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      reduced.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-030"),
    );
    expect(reduced.state.memory).toBe(5);

    const full = setupEngine({
      0: { hand: [{ card: "BT24-030", as: "neptunemon" }] },
      1: { battleArea: ["BT1-009"] },
    });
    full.state.memory = 12;
    await full.ready();
    expect(
      full.engine.applyIntent(0, {
        type: "playCard",
        instanceId: full.inst("neptunemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => full.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-030"));
    expect(full.state.memory).toBe(0);
  });

  it("publicly protects qualifying Digimon from an opponent effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-030", as: "neptunemon", dp: 1000 },
            { card: "BT24-028", as: "ts", dp: 1000 },
          ],
        },
        1: { battleArea: [{ card: "BT24-085", as: "redSource" }], hand: [{ card: "BT6-095", as: "option" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const neptunemonId = s.perm("neptunemon").permanentId;
    const tsId = s.perm("ts").permanentId;
    const optionId = s.inst("option").instanceId;
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === optionId));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual(
      expect.arrayContaining([neptunemonId, tsId]),
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(optionId);
  });

  it("publicly does not protect a qualifying Digimon from battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-030", as: "neptunemon" },
            { card: "BT24-028", as: "target", dp: 1000, suspended: true },
          ],
        },
        1: { battleArea: [{ card: "BT1-015", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    const targetInstanceId = s.inst("target").instanceId;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: targetId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(targetId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(targetInstanceId);
    expect(s.perm("neptunemon").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("bottom-decks every opponent Digimon tied for the fewest sources", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-030", as: "neptunemon" }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "fewestA" },
          { card: "BT1-010", as: "fewestB" },
          { card: "BT1-011", as: "more", under: ["BT1-013"] },
        ],
      },
    });
    const morePermanentId = s.perm("more").permanentId;

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("neptunemon"));

    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT1-009", "BT1-010"]));
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([morePermanentId]);
  });

  it("may unsuspend once when it suspends", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT24-030", as: "neptunemon", suspended: true }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenSuspended", { suspendedPermanentId: s.perm("neptunemon").permanentId });
    await settle(() => !s.perm("neptunemon").isSuspended);
    s.perm("neptunemon").isSuspended = true;
    await advance(s.engine).fireSubTrigger("whenSuspended", { suspendedPermanentId: s.perm("neptunemon").permanentId });

    expect(s.perm("neptunemon").isSuspended).toBe(true);
  });

  it("does not protect from an owner-effect removal when no opponent provenance is present", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-030", as: "neptunemon" },
            { card: "BT24-020", as: "first" },
            { card: "BT24-027", as: "second" },
            { card: "BT11-085", as: "aquatic" },
            { card: "BT1-009", as: "nonTs" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent(
      [s.perm("first").permanentId, s.perm("second").permanentId, s.perm("aquatic").permanentId],
      "byEffect",
    );

    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(
      expect.arrayContaining(["BT24-030", "BT1-009"]),
    );
  });

  it.each([
    ["Aqua in trait", "BT10-023", 0],
    ["Sea Animal trait", "BT7-027", 1],
    ["TS trait", "BT24-028", 2],
  ])("digivolves from a level 5 card with %s for cost 3", async (_label, baseCard, alternateRequirementIndex) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: "BT24-030", as: "neptunemon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("neptunemon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("neptunemon").instanceId);

    expect(s.state.memory).toBe(2);
  });
});
