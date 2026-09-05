import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX9-020.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("EX9-020", () => {
  it("has Blast Digivolve, Alliance, and Blocker and bottom-decks an opposing level 5 or lower Digimon on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords?.[0]).toMatchObject({
      keyword: "BlastDigivolve",
    });
    expect(
      compiled.effects?.filter((entry) => entry.trigger === "Static").flatMap((entry) => entry.keywords ?? []),
    ).toEqual(
      expect.arrayContaining([
        { keyword: "Alliance", raw: "＜Alliance＞" },
        { keyword: "Blocker", raw: "＜Blocker＞" },
      ]),
    );
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Return",
      to: "deckBottom",
      target: { filter: { levelComparison: { op: "lte", value: 5 } } },
    });
  });
  it("DNA digivolves into Omnimon Alter-S when it would leave play and prevents attack target changes", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "otherThanBattle",
      actions: [{ kind: "DnaDigivolve", optional: true }],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({
      kind: "Restrict",
      restriction: "attackTargetChange",
      duration: "permanent",
    });
  });

  it("bottom-decks an opposing level 5 or lower Digimon on play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-020", as: "source" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }], deck: ["BT1-001"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    const targetId = s.perm("target").topCard.instanceId;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.some((card) => card.instanceId === targetId)).toBe(true);
  });

  it("Blast Digivolves from hand during an opponent attack without paying memory", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT10-064", as: "attacker" }] },
        1: { battleArea: [{ card: "EX9-019", as: "host" }], hand: [{ card: "EX9-020", as: "ace" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((e) => e.kind === "counterWindowOpened"));
    const opened = s.events.find((e) => e.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("Counter window missing");
    const counter = opened.eligibleCounters.find((e) => e.instanceId === s.inst("ace").instanceId);
    expect(counter).toBeDefined();
    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: counter!.instanceId,
        effectKey: counter!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "EX9-020");
    expect(s.state.memory).toBe(0);
  });

  it.each([
    ["EX9-019", true],
    ["EX9-013", false],
  ] as const)("returns opposing level 5 but excludes level 6 (%s)", async (target, shouldReturn) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-020", as: "source" }] },
        1: { battleArea: [{ card: target, as: "target" }], deck: ["BT1-001"] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(shouldReturn ? 0 : 1);
  });

  it("does not offer DNA replacement for a battle leave, but DNA digivolves for another leave", async () => {
    const battle = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-020", as: "cres" },
            { card: "EX9-013", as: "blitz" },
          ],
          hand: ["EX9-021"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await battle.ready();

    expect(await advance(battle.engine).verb.deletePermanent([battle.perm("cres").permanentId], "byBattle")).toBe(1);
    expect(battle.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX9-013"]);
    expect(battle.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("EX9-021");

    const nonBattle = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-020", as: "cres" },
            { card: "EX9-013", as: "blitz" },
          ],
          hand: ["EX9-021"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await nonBattle.ready();

    expect(await advance(nonBattle.engine).verb.deletePermanent([nonBattle.perm("cres").permanentId], "byEffect")).toBe(
      0,
    );
    expect(nonBattle.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX9-021"]);
  });

  it("uses Alliance in a real attack and restores the attacker after battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX9-020", dp: 12000, as: "attacker" },
          { card: "BT1-009", dp: 4000, as: "ally" },
        ],
        security: ["BT1-001", "BT1-001"],
      },
      1: { security: ["BT1-001", "BT1-001"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("ally").permanentId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.perm("attacker").currentDP).toBe(12000);
  });

  it("uses Blocker to intercept an opponent attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", dp: 5000, as: "attacker" }], security: ["BT1-001"] },
      1: { battleArea: [{ card: "EX9-020", dp: 12000, as: "blocker" }], security: ["BT1-001"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("blocks target redirection only for a real evolved host with the inherited effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-020", as: "cres" }], hand: [{ card: "BT5-086", as: "omnimon" }] },
      1: {
        battleArea: [
          { card: "BT1-009", dp: 5000, as: "attacker" },
          { card: "EX9-013", dp: 15000, as: "blocker" },
        ],
        security: ["BT1-001"],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("cres").permanentId,
        instanceId: s.inst("omnimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea[0]!.topCard.cardId === "BT5-086");
    const host = s.state.players[0]!.battleArea[0]!;
    expect(host.stack.map(({ cardId }) => cardId)).toContain("EX9-020");
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: host.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: false, reason: "wrong-phase" });
    await settle();
    expect(host.topCard.cardId).toBe("BT5-086");
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("allows target redirection when the same card is played without its inherited effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-086", as: "attacker" }] },
      1: { battleArea: [{ card: "EX9-013", dp: 12000, as: "blocker" }], security: ["BT1-001"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
