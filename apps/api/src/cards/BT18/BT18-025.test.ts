import { EffectDuration, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT18-025.js";
import "./BT18-022.js";
import "./BT18-089.js";
import "../BT5/BT5-091.js";

async function digivolveIntoKorikakumon(s: EngineSetup, baseAlias: string): Promise<void> {
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm(baseAlias).permanentId,
      instanceId: s.inst("korikakumon").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm(baseAlias).topCard.cardId === "BT18-025" && s.state.pendingDecision === undefined);
  await drainMicrotasks(50);
}

function attackPlayer(s: EngineSetup, attackerAlias: string) {
  return s.engine.applyIntent(0, {
    type: "attack",
    attackerPermanentId: s.perm(attackerAlias).permanentId,
    target: { kind: "player" },
  });
}

describe("BT18-025 Korikakumon", () => {
  it("restricts suspension only for an opposing Digimon without digivolution cards", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "Jamming" }] },
      { trigger: "OnPlay", actions: [{ kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd" }] },
      {
        trigger: "WhenDigivolving",
        actions: [{ kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd" }],
      },
      { trigger: "Rule", actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Ice-Snow"] }] },
      { trigger: "Static", isInherited: true, keywords: [{ keyword: "Jamming" }] },
    ]);
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-025", as: "korikakumon" }] },
        1: {
          battleArea: [
            { card: "BT1-030", as: "empty" },
            { card: "BT1-030", as: "stacked", under: ["BT18-021"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    const emptyId = s.perm("empty").permanentId;
    const stackedId = s.perm("stacked").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("korikakumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(emptyId, "suspend"));
    expect(observe(s.engine).isRestricted(emptyId, "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(stackedId, "suspend")).toBe(false);
  });

  it.each([
    ["Tommy Himi", "BT18-089", 3, 2],
    ["Kumamon", "BT18-022", 1, 4],
  ])("digivolves from %s for the named cost and preserves the source", async (_name, baseCard, _cost, memoryLeft) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: "BT18-025", as: "korikakumon" }],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("korikakumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT18-025");

    expect(s.state.memory).toBe(memoryLeft);
    expect(s.perm("base").stack.at(-1)?.cardId).toBe(baseCard);
  });

  it("naturally restricts an opposing empty-stack Digimon after evolving from Kumamon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-022", as: "kumamon" }],
          hand: [{ card: "BT18-025", as: "korikakumon" }],
        },
        1: { battleArea: [{ card: "BT1-030", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    const targetId = s.perm("target").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("kumamon").permanentId,
        instanceId: s.inst("korikakumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(targetId, "suspend"));

    expect(observe(s.engine).isRestricted(targetId, "suspend")).toBe(true);
  });

  it("grants Ice-Snow and both main and inherited Jamming", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT18-025", as: "self" },
          { card: "BT1-030", as: "host", under: ["BT18-025"] },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasEffectiveTrait(s.perm("self"), "Ice-Snow")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("self"), "Jamming")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
  });
});

describe("BT18-025 Korikakumon — KB Q&A rulings", () => {
  it("digivolves from Tommy Himi as a Tamer: no Digimon-digivolve watcher fires and a Digimon digivolve lock does not stop it (Q2943)", async () => {
    const fromTamer = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-089", as: "tommy" },
            { card: "BT5-091", as: "takumi" },
          ],
          hand: [{ card: "BT18-025", as: "korikakumon" }],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    fromTamer.state.memory = 5;
    await fromTamer.ready();
    await digivolveIntoKorikakumon(fromTamer, "tommy");
    expect(fromTamer.perm("takumi").isSuspended).toBe(false);

    const fromDigimon = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-022", as: "kumamon" },
            { card: "BT5-091", as: "takumi" },
          ],
          hand: [{ card: "BT18-025", as: "korikakumon" }],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    fromDigimon.state.memory = 5;
    await fromDigimon.ready();
    await digivolveIntoKorikakumon(fromDigimon, "kumamon");
    await settle(() => fromDigimon.perm("takumi").isSuspended);
    expect(fromDigimon.perm("takumi").isSuspended).toBe(true);

    const locked = setupEngine({
      0: {
        battleArea: [
          { card: "BT18-089", as: "tommy" },
          { card: "BT18-022", as: "kumamon" },
        ],
        hand: [{ card: "BT18-025", as: "korikakumon" }],
        deck: ["BT1-009"],
      },
    });
    locked.state.memory = 5;
    await locked.ready();
    advance(locked.engine).ledgers.continuous.addUnsuspendedDigivolveProhibition(
      0,
      1,
      EffectDuration.UntilOpponentTurnEnd,
    );
    await advance(locked.engine).recompute();

    expect(
      locked.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: locked.perm("kumamon").permanentId,
        instanceId: locked.inst("korikakumon").instanceId,
      }).ok,
    ).toBe(false);
    expect(locked.perm("kumamon").topCard.cardId).toBe("BT18-022");
    expect(locked.state.memory).toBe(5);

    await digivolveIntoKorikakumon(locked, "tommy");
    expect(locked.state.memory).toBe(2);
  });

  it("performs the digivolution bonus draw when digivolving from Tommy Himi (Q2944)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-089", as: "tommy" }],
        hand: [{ card: "BT18-025", as: "korikakumon" }],
        deck: [{ card: "BT1-009", as: "drawn" }, "BT1-030"],
      },
    });
    s.state.memory = 5;
    await s.ready();

    await digivolveIntoKorikakumon(s, "tommy");

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("can't attack the turn it digivolves from a Tommy Himi played that same turn (Q2945)", async () => {
    const fresh = setupEngine(
      {
        0: {
          hand: [
            { card: "BT18-089", as: "tommy" },
            { card: "BT18-025", as: "korikakumon" },
          ],
          deck: ["BT1-009"],
        },
        1: { security: ["BT1-009"] },
      },
      { autoDeclineOptional: true },
    );
    fresh.state.memory = 10;
    await fresh.ready();
    expect(fresh.engine.applyIntent(0, { type: "playCard", instanceId: fresh.inst("tommy").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        fresh.state.players[0]!.battleArea.some(
          ({ topCard }) => topCard?.instanceId === fresh.inst("tommy").instanceId,
        ) && fresh.state.pendingDecision === undefined,
    );
    await digivolveIntoKorikakumon(fresh, "tommy");

    expect(attackPlayer(fresh, "tommy").ok).toBe(false);
    expect(fresh.perm("tommy").isSuspended).toBe(false);
    expect(fresh.state.players[1]!.security).toHaveLength(1);

    const established = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-089", as: "tommy" }],
          hand: [{ card: "BT18-025", as: "korikakumon" }],
          deck: ["BT1-009"],
        },
        1: { security: ["BT1-009"] },
      },
      { autoDeclineOptional: true },
    );
    established.state.memory = 5;
    await established.ready();
    await digivolveIntoKorikakumon(established, "tommy");

    expect(attackPlayer(established, "tommy")).toEqual({ ok: true });
    await advance(established.engine).finishAttack();
  });

  it("keeps Tommy Himi as a digivolution card that is trashed with Korikakumon (Q6599)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-089", as: "tommy" }],
        hand: [{ card: "BT18-025", as: "korikakumon" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 5;
    await s.ready();
    const tommyInstanceId = s.perm("tommy").topCard.instanceId;

    await digivolveIntoKorikakumon(s, "tommy");
    expect(s.perm("tommy").stack.map(({ instanceId }) => instanceId)).toEqual([tommyInstanceId]);

    expect(await advance(s.engine).verb.deletePermanent([s.perm("tommy").permanentId])).toBe(1);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([tommyInstanceId, s.inst("korikakumon").instanceId]),
    );
  });

  it("does not gain the [Security] effect of a Tommy Himi in its digivolution cards (Q6600)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-025", as: "korikakumon", under: [{ card: "BT18-089", as: "stackedTommy" }] }],
          security: [{ card: "BT18-089", as: "securityTommy" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.SecuritySkill, s.perm("korikakumon"));
    await drainMicrotasks(50);
    expect(s.perm("korikakumon").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("stackedTommy").instanceId,
    ]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTommy"));
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.instanceId)).toContain(
      s.inst("securityTommy").instanceId,
    );
  });

  it("gains the inherited [When Attacking] effect of a Tommy Himi in its digivolution cards (Q6601)", async () => {
    const attackWith = async (under: string[]) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT18-025", as: "korikakumon", under }],
            deck: [{ card: "BT1-030", as: "drawn" }],
          },
          1: {
            battleArea: [{ card: "BT1-030", as: "prey", under: ["BT18-021"] }],
            security: ["BT1-009"],
          },
        },
        { autoSelectCards: true, autoDeclineOptional: true },
      );
      await s.ready();
      expect(attackPlayer(s, "korikakumon")).toEqual({ ok: true });
      await advance(s.engine).finishAttack();
      await drainMicrotasks(50);
      return s;
    };

    const withTommy = await attackWith(["BT18-089"]);
    expect(withTommy.perm("prey").stack).toHaveLength(0);
    expect(withTommy.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      withTommy.inst("drawn").instanceId,
    ]);

    const withoutTommy = await attackWith(["BT18-021"]);
    expect(withoutTommy.perm("prey").stack.map(({ cardId }) => cardId)).toEqual(["BT18-021"]);
    expect(withoutTommy.state.players[0]!.hand).toHaveLength(0);
  });
});
