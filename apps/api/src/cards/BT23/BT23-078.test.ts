import { getCardDefinition, type Action, type ServerEvent } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-078.js";

/**
 * Gorou Matayoshi, Red Tamer, play cost 3, [CS].
 *
 * [Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.
 * [Your Turn] When your Digimon are played or digivolve, if any of them have [Avian], [Bird],
 * [Beast], [Animal] or [Sovereign] in any of their traits (other than [Sea Animal]) or the [CS]
 * trait, by returning this Tamer to the hand, 1 of your Digimon gets +3000 DP for the turn.
 * Then, 1 of your Digimon may attack.
 * [Security] Play this card without paying the cost.
 */
const START_MAIN = compiled.effects.find((effect) => effect.trigger === "StartOfYourMainPhase");
const YOUR_TURN = compiled.effects.find((effect) => effect.trigger === "YourTurn");
const SECURITY = compiled.effects.find((effect) => effect.trigger === "Security");

/** Count the one-memory gains a turn produced; the turn-start reset is a larger jump. */
function singleMemoryGains(events: ServerEvent[]): number {
  return events.filter((event) => event.kind === "memoryChanged" && event.to - event.from === 1).length;
}

describe("BT23-078 Gorou Matayoshi", () => {
  it("matches every catalog field, the 2025-10-17 name erratum and the full compiled clause set", () => {
    expect(getCardDefinition("BT23-078")).toMatchObject({
      cardId: "BT23-078",
      set: "BT23",
      nameEn: "Gorou Matayoshi",
      colors: ["Red"],
      kinds: ["Tamer"],
      playCost: 3,
      dp: 0,
      evoCosts: [],
      forms: ["-"],
      attributes: ["-"],
      types: ["CS"],
      effectText:
        "[Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.\n[Your Turn] When your Digimon are played or digivolve, if any of them have [Avian], [Bird], [Beast], [Animal] or [Sovereign]\u00a0in any of their traits (other than [Sea Animal]) or the [CS]\u00a0trait, by returning this Tamer to the hand, 1 of your Digimon gets +3000 DP for the turn. Then, 1 of your Digimon may attack.",
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toHaveLength(3);
  });

  it("compiles the trait gate with CR 2-3-2-4 substring reach and an exact [CS] branch", () => {
    const watchers = (YOUR_TURN?.actions ?? []) as (Action & { event?: string })[];
    expect(watchers.map((action) => action.event)).toEqual(["whenPlayed", "whenOneOfYoursDigivolves"]);
    for (const watcher of watchers) {
      expect(watcher).toMatchObject({
        kind: "SubTrigger",
        sourceFilter: {
          controller: "mine",
          kind: ["Digimon"],
          or: [
            {
              nameOrTrait: [{ tokens: ["Avian", "Bird", "Beast", "Animal", "Sovereign"], match: "traitContains" }],
              excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "trait" }],
            },
            { nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
          ],
        },
        actions: [
          {
            kind: "ModifyDP",
            amount: 3000,
            duration: "forTheTurn",
            optional: true,
            abortOnDecline: true,
            cost: { kind: "return", target: { filter: { isSelfRef: true }, isSelf: true, count: 1 } },
            // "1 of your Digimon" is the battle area, never the breeding area (CR 3-4-5-8).
            target: { filter: { controller: "mine", zone: "battleArea", kind: ["Digimon"] }, count: 1 },
          },
          {
            kind: "Attack",
            optional: true,
            withoutSuspending: false,
            target: { filter: { controller: "mine", zone: "battleArea", kind: ["Digimon"] }, count: 1 },
          },
        ],
      });
    }
    expect(START_MAIN).toMatchObject({
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: { kind: "opponentHas", filter: { controllerDefault: "opponent", kind: ["Digimon"] } },
        },
      ],
    });
    expect(SECURITY).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { filter: { isSelfRef: true }, isSelf: true } }],
    });
  });

  it("gains 1 memory at the start of its controller's Main phase when the opponent has a Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-078", as: "gorou" }],
        hand: [{ card: "BT1-009", as: "spare" }],
        deck: ["BT1-010", "BT1-011"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "enemy" }] },
    });
    await s.ready();
    s.state.memory = 0;
    const before = s.events.length;

    await advance(s.engine).runTurn(0);

    expect(singleMemoryGains(s.events.slice(before))).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("gains nothing at the start of Main while the opponent has no Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-078", as: "gorou" }],
        hand: [{ card: "BT1-009", as: "spare" }],
        deck: ["BT1-010", "BT1-011"],
      },
      1: { battleArea: [{ card: "BT23-078", as: "enemyTamer" }] },
    });
    await s.ready();
    s.state.memory = 0;
    const before = s.events.length;

    await advance(s.engine).runTurn(0);

    expect(singleMemoryGains(s.events.slice(before))).toBe(0);
  });

  it("stays silent at the start of the opponent's Main phase", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-078", as: "gorou" }],
        hand: [{ card: "BT1-013", as: "ownSpare" }],
        deck: ["BT1-014", "BT1-015"],
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "enemy" }],
        hand: [{ card: "BT1-010", as: "spare" }],
        deck: ["BT1-011", "BT1-012"],
      },
    });
    // Reach seat 1's Main through the real turn loop: seat 0 takes its turn and passes.
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    const before = s.events.length;

    await advance(s.engine).waitForMainPhase(1);

    expect(s.state.turnSeat).toBe(1);
    expect(singleMemoryGains(s.events.slice(before))).toBe(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT23-078")).toBe(true);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("returns itself to hand, gives +3000 DP and lets a Digimon attack when a [Bird] Digimon is played", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-078", as: "gorou" },
            { card: "BT1-009", as: "ally" },
          ],
          hand: [{ card: "BT1-012", as: "biyomon" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { security: [{ card: "BT1-011" }, { card: "BT1-011" }, { card: "BT1-011" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    prefer.push(s.perm("ally").topCard!.instanceId);
    await s.ready();
    s.state.memory = 10;
    const gorouId = s.inst("gorou").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("biyomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.players[0]!.hand.some((card) => card.instanceId === gorouId) && !observe(s.engine).isAttacking(),
    );
    await s.ready();

    // Play cost 3 for Biyomon; the Tamer's return costs no memory.
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(gorouId);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT23-078")).toBe(false);
    expect(s.perm("ally").currentDP).toBe(6000);
    expect(s.perm("ally").isSuspended).toBe(true);
    // The attack went through to the player: one security card was checked away.
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("Q5353: declining the return keeps the Tamer and blocks both the DP boost and the attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-078", as: "gorou" },
            { card: "BT1-009", as: "ally" },
          ],
          hand: [{ card: "BT1-012", as: "biyomon" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { security: [{ card: "BT1-011" }, { card: "BT1-011" }, { card: "BT1-011" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    const biyomonId = s.inst("biyomon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: biyomonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === biyomonId));
    await s.ready();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT23-078")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT23-078")).toBe(false);
    expect(s.perm("ally").currentDP).toBe(3000);
    expect(s.state.players[0]!.battleArea.every((permanent) => permanent.isSuspended === false)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("reads [Giant Bird] as [Bird] per CR 2-3-2-4", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-078", as: "gorou" },
            { card: "BT1-009", as: "ally" },
          ],
          hand: [{ card: "BT1-014", as: "kokatorimon" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { security: [{ card: "BT1-011" }, { card: "BT1-011" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    prefer.push(s.perm("ally").topCard!.instanceId);
    await s.ready();
    s.state.memory = 10;
    const gorouId = s.inst("gorou").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kokatorimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.players[0]!.hand.some((card) => card.instanceId === gorouId) && !observe(s.engine).isAttacking(),
    );
    await s.ready();

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(gorouId);
    expect(s.perm("ally").currentDP).toBe(6000);
  });

  it("ignores a [Sea Animal] Digimon, the trait the card explicitly carves out of [Animal]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-078", as: "gorou" },
            { card: "BT1-009", as: "ally" },
          ],
          hand: [{ card: "BT1-033", as: "dolphmon" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { security: [{ card: "BT1-011" }, { card: "BT1-011" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    const dolphmonId = s.inst("dolphmon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: dolphmonId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === dolphmonId),
    );
    await s.ready();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT23-078")).toBe(true);
    expect(s.perm("ally").currentDP).toBe(3000);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("still fires on a [Sea Animal] Digimon that also has the [CS] trait", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-078", as: "gorou" }],
          hand: [{ card: "BT23-023", as: "whamon" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { security: [{ card: "BT1-011" }, { card: "BT1-011" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    await s.ready();
    s.state.memory = 12;
    const gorouId = s.inst("gorou").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("whamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.players[0]!.hand.some((card) => card.instanceId === gorouId) && !observe(s.engine).isAttacking(),
    );
    await s.ready();

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(gorouId);
    expect(s.perm("whamon").currentDP).toBe(12000);
  });

  it("also fires when one of your Digimon digivolves into a [Beast] Digimon", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-078", as: "gorou" },
            { card: "BT1-049", as: "labramon" },
          ],
          hand: [{ card: "BT12-036", as: "mikemon" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { security: [{ card: "BT1-011" }, { card: "BT1-011" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    prefer.push(s.perm("labramon").topCard!.instanceId);
    await s.ready();
    s.state.memory = 10;
    const gorouId = s.inst("gorou").instanceId;
    const mikemonId = s.inst("mikemon").instanceId;
    const hostPermanentId = s.perm("labramon").permanentId;

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: hostPermanentId, instanceId: mikemonId })).toEqual(
      { ok: true },
    );
    await settle(
      () => s.state.players[0]!.hand.some((card) => card.instanceId === gorouId) && !observe(s.engine).isAttacking(),
    );
    await s.ready();

    const evolved = s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === hostPermanentId)!;
    expect(evolved.topCard?.instanceId).toBe(mikemonId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(gorouId);
    // 8 memory after the cost-2 digivolve, then +3000 on the 4000 DP Mikemon.
    expect(s.state.memory).toBe(8);
    expect(evolved.currentDP).toBe(7000);
  });

  it("does not react while it is not its controller's turn and the played Digimon is not theirs", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "turnPlayerAlly" }],
          hand: [{ card: "BT1-012", as: "biyomon" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT23-078", as: "gorou" },
            { card: "BT1-009", as: "gorouAlly" },
          ],
          security: [{ card: "BT1-011" }, { card: "BT1-011" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    const biyomonId = s.inst("biyomon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: biyomonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === biyomonId));
    await s.ready();

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT23-078")).toBe(true);
    expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT23-078")).toBe(false);
    expect(s.perm("gorouAlly").currentDP).toBe(3000);
    expect(s.state.players[1]!.battleArea.every((permanent) => permanent.isSuspended === false)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("[Security] plays itself into the battle area without paying its 3 cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: { security: [{ card: "BT23-078", as: "gorou" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    const gorouId = s.inst("gorou").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === gorouId));
    await s.ready();

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === gorouId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === gorouId)).toBe(false);
    // The security play pays nothing: only the attacker's own turn memory stands.
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
