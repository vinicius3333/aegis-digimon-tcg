import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT19-035 ShootingStarmon", () => {
  it("has the Xros Heart evolution route and treats itself as Starmons only for DigiXros (Q3089)", async () => {
    expect(digivolutionRequirementsFor("BT19-035")).toContainEqual({
      level: 3,
      traits: ["Xros Heart"],
      cost: 2,
      isAlternate: true,
    });
    const s = setupEngine({ 0: { battleArea: [{ card: "BT19-035", as: "shooting" }] } });
    await s.ready();
    expect([...s.perm("shooting").digiXrosNames]).toEqual(["starmons"]);
    expect(getCardDefinition("BT19-035")?.nameEn).toBe("ShootingStarmon");
  });

  it("triggers on its own play and gives the same opponent -1 security attack and -3000 DP (Q3090)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-035", as: "shooting" },
            { card: "BT19-033", as: "second" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT19-020", as: "first" },
            { card: "BT19-021", as: "other" },
          ],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shooting").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("first").currentDP === 2000);
    expect(observe(s.engine).keywordAmount(s.perm("first"), "SecurityAttack")).toBe(-1);
    expect(s.perm("other").currentDP).toBe(5000);
    expect(observe(s.engine).keywordAmount(s.perm("other"), "SecurityAttack")).toBe(0);

    await advance(s.engine).recompute();
    // The resident watcher remains installed after recompute, but its shared
    // once-per-turn key is consumed by the self-play event.
    const watcher = advance(s.engine)
      .ledgers.subTriggers.subscriptionsFor("whenPlayed")
      .find((subscription) => subscription.sourcePermanentId === s.perm("shooting").permanentId);
    expect(watcher?.oncePerTurnKey).toBeDefined();
    expect(advance(s.engine).ledgers.tracker.count(watcher!.oncePerTurnKey!, "subtrigger")).toBe(1);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT19-033"));
    await settle();

    expect(s.perm("first").currentDP).toBe(2000);
    expect(observe(s.engine).keywordAmount(s.perm("first"), "SecurityAttack")).toBe(-1);
    expect(s.perm("other").currentDP).toBe(5000);
    expect(observe(s.engine).keywordAmount(s.perm("other"), "SecurityAttack")).toBe(0);
  });

  it("triggers its All Turns watcher for a later Xros Heart Digimon play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-035", as: "watcher" }], hand: [{ card: "BT19-033", as: "played" }] },
        1: { battleArea: [{ card: "BT19-020", as: "target" }] },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 2000);
    expect(s.perm("target").currentDP).toBe(2000);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
  });

  it.each(["hand", "trash"] as const)("On Deletion may place an eligible %s Digimon under a Tamer", async (zone) => {
    const card = { card: "BT19-020", as: "candidate" };
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-035", as: "shooting" },
            { card: "BT19-083", as: "tamer" },
          ],
          ...(zone === "hand" ? { hand: [card] } : { trash: [card] }),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("shooting").permanentId], "byEffect");
    expect(s.perm("tamer").stack.map((item) => item.cardId)).toEqual(["BT19-020"]);
    expect(s.state.players[0]![zone].some((item) => item.cardId === "BT19-020")).toBe(false);
  });

  it("inherited attack reduction requires an Xros Heart host and resolves once per turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-038", as: "host", under: ["BT19-035"] }] },
        1: { battleArea: [{ card: "BT19-020", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("target").currentDP).toBe(3000);
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("target").currentDP).toBe(3000);

    const negative = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-015", as: "host", under: ["BT19-035"] }] },
        1: { battleArea: [{ card: "BT19-020", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await advance(negative.engine).fireForPermanent(EffectTiming.OnUseAttack, negative.perm("host"));
    expect(negative.perm("target").currentDP).toBe(5000);
  });

  it("resolves the inherited attack reduction from a public attack intent", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT19-038", as: "host", under: ["BT19-035"] }] },
      1: { battleArea: [{ card: "BT19-020", as: "target" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);
    expect(s.perm("target").currentDP).toBe(3000);
  });
});
