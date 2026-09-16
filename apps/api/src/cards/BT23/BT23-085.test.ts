import { EffectDuration, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-085.js";

const HUDIE = "BT23-048";
const CS_ONLY = "BT23-006";
const CS_OPTION = "BT23-096";
const PLAIN_OPTION = "BT2-103";
const DUAL_COLOR_CS_OPTION = "BT22-099";
const DP_REDUCER = "BT23-028";
const NEUTRAL = "ST1-02";

const SECURITY = ["BT1-009", "BT1-010", "BT1-011"];
const DECK = ["BT1-012", "BT1-013", "BT1-014"];

describe("BT23-085 Ryuji Mishima", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-085")).toMatchObject({
      cardId: "BT23-085",
      nameEn: "Ryuji Mishima",
      colors: ["Black"],
      kinds: ["Tamer"],
      playCost: 4,
      dp: 0,
      types: ["Hudie", "CS"],
      rarity: "SR",
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(getCardDefinition("BT23-085")!.effectText!.replace(/\s+/g, " ").trim()).toBe(
      "[Start of Your Main Phase] If you have a [CS] trait Digimon, gain 1 memory. " +
        "[On Play] Until your opponent's turn ends, their effects can't reduce the DP of 1 of your [Hudie] trait " +
        "Digimon, and it gains ＜Reboot＞ and ＜Blocker＞ " +
        "[All Turns] When any of your [Hudie] trait Digimon suspend, by suspending this Tamer, you may use 1 " +
        "single-color [CS] trait Option card from your hand without paying the cost.",
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("carries the four printed clauses as IR", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase")).toMatchObject({
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "youHave",
            filter: { controllerDefault: "mine", kind: ["Digimon"], zone: "battleArea" },
          },
        },
      ],
    });

    const onPlay = compiled.effects.find((entry) => entry.trigger === "OnPlay")!;
    expect(onPlay.actions[0]).toMatchObject({
      kind: "Restrict",
      restriction: "dpImmune",
      byOpponentEffectsOnly: true,
      duration: "untilOpponentTurnEnd",
      target: { count: 1, filter: { controller: "mine", kind: ["Digimon"], zone: "battleArea" } },
    });
    expect(onPlay.actions.slice(1)).toMatchObject([
      { kind: "GainKeyword", keyword: { keyword: "Reboot" }, duration: "untilOpponentTurnEnd" },
      { kind: "GainKeyword", keyword: { keyword: "Blocker" }, duration: "untilOpponentTurnEnd" },
    ]);
    expect(
      onPlay.actions.slice(1).every((action) => (action as { target: { sameTarget?: boolean } }).target.sameTarget),
    ).toBe(true);

    const watcher = compiled.effects.find((entry) => entry.trigger === "AllTurns")!.actions[0] as never;
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      sourceFilter: { controller: "mine", kind: ["Digimon"], zone: "battleArea" },
      cost: { kind: "suspend", target: { isSelf: true, filter: { isSelfRef: true } } },
      actions: [
        {
          kind: "UseOptionWithoutCost",
          payCost: false,
          optional: true,
          from: ["hand"],
          filter: { controller: "mine", kind: ["Option"], singleColor: true },
        },
      ],
    });

    expect(compiled.effects.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
    });
  });

  it.each([
    ["a battle-area [CS] Digimon", CS_ONLY, 1],
    ["no [CS] Digimon at all", "BT1-009", 0],
  ])("gains start-of-main memory only with %s", async (_label, companion, expected) => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT23-085", as: "ryuji" },
          { card: companion, as: "companion" },
        ],
        hand: [{ card: NEUTRAL, as: "neutral" }],
        security: SECURITY,
        deck: DECK,
      },
      1: { hand: [NEUTRAL], security: SECURITY, deck: DECK },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.memory).toBe(expected);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT23-085")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("ignores a [CS] Digimon that is only in the breeding area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-085", as: "ryuji" }],
          breeding: { card: CS_ONLY, as: "breedingCs" },
          hand: [{ card: NEUTRAL, as: "neutral" }],
          security: SECURITY,
          deck: DECK,
        },
        1: { hand: [NEUTRAL], security: SECURITY, deck: DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === "Breeding");
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe(CS_ONLY);
    expect(s.state.players[0]!.battleArea.map((perm) => perm.topCard?.cardId)).toEqual(["BT23-085"]);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("stays silent at the start of the opponent's main phase", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT23-085", as: "ryuji" },
          { card: CS_ONLY, as: "cs" },
        ],
        hand: [{ card: NEUTRAL, as: "neutral" }],
        security: SECURITY,
        deck: DECK,
      },
      1: { hand: [NEUTRAL], security: SECURITY, deck: DECK },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(1);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("grants DP-reduction immunity, ＜Reboot＞ and ＜Blocker＞ to exactly one chosen [Hudie] Digimon", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: HUDIE, as: "chosen" },
            { card: HUDIE, as: "other" },
          ],
          hand: [
            { card: "BT23-085", as: "ryuji" },
            { card: NEUTRAL, as: "neutral" },
          ],
          security: SECURITY,
          deck: DECK,
        },
        1: { hand: [NEUTRAL], security: SECURITY, deck: DECK },
      },
      { autoSelectCards: true, preferInstanceIds: prefer },
    );
    prefer.push(s.perm("chosen").topCard!.instanceId);
    s.state.memory = 6;
    await s.ready();
    const ryujiId = s.inst("ryuji").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: ryujiId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("chosen"), "Blocker"));

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === ryujiId)).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("chosen"), "dpImmune")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("chosen"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("chosen"), "Blocker")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("other"), "dpImmune")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "Blocker")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("blocks the opponent's -3000 DP effect on the protected Digimon but not on its neighbour", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: HUDIE, as: "chosen", dp: 5000 },
            { card: HUDIE, as: "other", dp: 5000 },
          ],
          hand: [
            { card: "BT23-085", as: "ryuji" },
            { card: NEUTRAL, as: "neutral" },
          ],
          security: SECURITY,
          deck: DECK,
        },
        1: {
          hand: [
            { card: DP_REDUCER, as: "reducer" },
            { card: NEUTRAL, as: "opponentNeutral" },
          ],
          security: SECURITY,
          deck: DECK,
        },
      },
      { autoSelectCards: true, preferInstanceIds: prefer },
    );
    prefer.push(s.perm("chosen").topCard!.instanceId);

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ryuji").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("chosen"), "dpImmune"));
    const protectedDp = s.perm("chosen").currentDP;
    const neighbourDp = s.perm("other").currentDP;
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    prefer.length = 0;
    prefer.push(s.perm("chosen").topCard!.instanceId);
    s.state.memory = 8;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("reducer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === DP_REDUCER));

    expect(s.perm("chosen").currentDP).toBe(protectedDp);
    expect(observe(s.engine).isRestricted(s.perm("chosen"), "dpImmune")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;

    const control = setupEngine(
      {
        0: { battleArea: [{ card: HUDIE, as: "other", dp: 5000 }], hand: [NEUTRAL], security: SECURITY, deck: DECK },
        1: { hand: [{ card: DP_REDUCER, as: "reducer" }, NEUTRAL], security: SECURITY, deck: DECK },
      },
      { autoSelectCards: true },
    );
    const controlLoop = control.engine.startTurnLoop();
    await advance(control.engine).waitForMainPhase(0);
    expect(control.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(control.engine).waitForMainPhase(1);
    control.state.memory = 8;
    expect(control.engine.applyIntent(1, { type: "playCard", instanceId: control.inst("reducer").instanceId })).toEqual(
      {
        ok: true,
      },
    );
    await settle(() => control.perm("other").currentDP < neighbourDp);

    expect(control.perm("other").currentDP).toBe(Math.max(0, neighbourDp - 3000));
    expect(control.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await controlLoop;
  });

  it("does not stop the controller's own effect from reducing the protected Digimon's DP", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: HUDIE, as: "chosen", dp: 5000 }],
          hand: [
            { card: "BT23-085", as: "ryuji" },
            { card: NEUTRAL, as: "neutral" },
          ],
          security: SECURITY,
          deck: DECK,
        },
        1: { hand: [{ card: NEUTRAL, as: "opponentNeutral" }], security: SECURITY, deck: DECK },
      },
      { autoSelectCards: true, preferInstanceIds: prefer },
    );
    prefer.push(s.perm("chosen").topCard!.instanceId);
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ryuji").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("chosen"), "dpImmune"));
    expect(s.perm("chosen").currentDP).toBe(5000);

    await advance(s.engine).verb.modifyDP(s.perm("chosen").permanentId, -2000, EffectDuration.UntilOwnerTurnEnd);

    expect(s.perm("chosen").currentDP).toBe(3000);
  });

  it("lets the granted ＜Blocker＞ block a real attack", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: HUDIE, as: "chosen" }],
          hand: [
            { card: "BT23-085", as: "ryuji" },
            { card: NEUTRAL, as: "neutral" },
          ],
          security: SECURITY,
          deck: DECK,
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          hand: [{ card: NEUTRAL, as: "opponentNeutral" }],
          security: SECURITY,
          deck: DECK,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    prefer.push(s.perm("chosen").topCard!.instanceId);
    s.state.memory = 6;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ryuji").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("chosen"), "Blocker"));
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(observe(s.engine).hasKeyword(s.perm("chosen"), "Blocker")).toBe(true);
    const chosenCardId = s.perm("chosen").topCard!.instanceId;
    const securityBefore = s.state.players[0]!.security.length;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("chosen").permanentId })).toEqual(
      { ok: true },
    );
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.security).toHaveLength(securityBefore);
    expect(s.events.some((event) => event.kind === "blocked")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === chosenCardId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("expires the ＜Reboot＞/＜Blocker＞ grants once the opponent's turn ends", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: HUDIE, as: "chosen" }],
          hand: [
            { card: "BT23-085", as: "ryuji" },
            { card: NEUTRAL, as: "neutral" },
          ],
          security: SECURITY,
          deck: DECK,
        },
        1: { hand: [{ card: NEUTRAL, as: "opponentNeutral" }], security: SECURITY, deck: DECK },
      },
      { autoSelectCards: true, preferInstanceIds: prefer },
    );
    prefer.push(s.perm("chosen").topCard!.instanceId);
    s.state.memory = 6;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ryuji").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("chosen"), "Blocker"));
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).isRestricted(s.perm("chosen"), "dpImmune")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("chosen"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("chosen"), "Blocker")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).isRestricted(s.perm("chosen"), "dpImmune")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("chosen"), "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("chosen"), "Blocker")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("suspends Ryuji and uses a single-color [CS] Option for free when a [Hudie] Digimon attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-085", as: "ryuji" },
            { card: HUDIE, as: "hudie" },
          ],
          hand: [
            { card: CS_OPTION, as: "option" },
            { card: NEUTRAL, as: "neutral" },
          ],
          security: SECURITY,
          deck: DECK,
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "victim", under: ["BT1-009", "BT1-010"] }],
          hand: [{ card: NEUTRAL, as: "opponentNeutral" }],
          security: SECURITY,
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    const victimTopBefore = s.perm("victim").topCard!.instanceId;
    const victimStackBefore = s.perm("victim").stack.length;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hudie").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === optionId),
    );

    expect(s.perm("ryuji").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === optionId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === optionId)).toBe(true);
    expect(victimStackBefore).toBe(2);
    expect(s.perm("victim").topCard!.instanceId).not.toBe(victimTopBefore);
    expect(s.perm("victim").stack.length).toBeLessThan(victimStackBefore);
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("declining leaves Ryuji unsuspended and the Option in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-085", as: "ryuji" },
            { card: HUDIE, as: "hudie" },
          ],
          hand: [
            { card: CS_OPTION, as: "option" },
            { card: NEUTRAL, as: "neutral" },
          ],
          security: SECURITY,
          deck: DECK,
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "victim", under: ["BT1-009", "BT1-010"] }],
          hand: [{ card: NEUTRAL, as: "opponentNeutral" }],
          security: SECURITY,
          deck: DECK,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hudie").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("ryuji").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === optionId)).toBe(false);
    expect(s.perm("victim").stack).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("ignores the suspension of a Digimon without the [Hudie] trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-085", as: "ryuji" },
            { card: CS_ONLY, as: "csOnly" },
          ],
          hand: [
            { card: CS_OPTION, as: "option" },
            { card: NEUTRAL, as: "neutral" },
          ],
          security: SECURITY,
          deck: DECK,
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "victim", under: ["BT1-009", "BT1-010"] }],
          hand: [{ card: NEUTRAL, as: "opponentNeutral" }],
          security: SECURITY,
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("csOnly").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("ryuji").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.perm("victim").stack).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("cannot activate while Ryuji is already suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-085", as: "ryuji", suspended: true },
            { card: HUDIE, as: "hudie" },
          ],
          hand: [
            { card: CS_OPTION, as: "option" },
            { card: NEUTRAL, as: "neutral" },
          ],
          security: SECURITY,
          deck: DECK,
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "victim", under: ["BT1-009", "BT1-010"] }],
          hand: [{ card: NEUTRAL, as: "opponentNeutral" }],
          security: SECURITY,
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.perm("ryuji").isSuspended = true;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hudie").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.perm("victim").stack).toHaveLength(2);
    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not use an Option without the [CS] trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-085", as: "ryuji" },
            { card: HUDIE, as: "hudie" },
          ],
          hand: [
            { card: PLAIN_OPTION, as: "option" },
            { card: NEUTRAL, as: "neutral" },
          ],
          security: SECURITY,
          deck: DECK,
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "victim", under: ["BT1-009", "BT1-010"] }],
          hand: [{ card: NEUTRAL, as: "opponentNeutral" }],
          security: SECURITY,
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hudie").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === optionId)).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not use a two-color [CS] Option: the clause says single-color", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-085", as: "ryuji" },
            { card: HUDIE, as: "hudie" },
          ],
          hand: [
            { card: DUAL_COLOR_CS_OPTION, as: "option" },
            { card: NEUTRAL, as: "neutral" },
          ],
          security: SECURITY,
          deck: DECK,
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "victim", under: ["BT1-009", "BT1-010"] }],
          hand: [{ card: NEUTRAL, as: "opponentNeutral" }],
          security: SECURITY,
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hudie").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === optionId)).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[All Turns]: fires when the [Hudie] Digimon suspends to block on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-085", as: "ryuji" },
            { card: "BT23-051", as: "hudie" },
          ],
          hand: [
            { card: CS_OPTION, as: "option" },
            { card: NEUTRAL, as: "neutral" },
          ],
          security: SECURITY,
          deck: DECK,
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "attacker", under: ["BT1-009", "BT1-010"] }],
          hand: [{ card: NEUTRAL, as: "opponentNeutral" }],
          security: SECURITY,
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("hudie").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.events.some((event) => event.kind === "blocked")).toBe(true);
    expect(s.perm("ryuji").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === optionId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === optionId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("finds exactly one eligible card in a four-way hand pool", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-085", as: "ryuji" },
            { card: HUDIE, as: "hudie" },
          ],
          hand: [
            { card: CS_OPTION, as: "eligible" },
            { card: DUAL_COLOR_CS_OPTION, as: "twoColor" },
            { card: PLAIN_OPTION, as: "noCsTrait" },
            { card: CS_ONLY, as: "csButNotAnOption" },
          ],
          security: SECURITY,
          deck: DECK,
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "victim", under: ["BT1-009", "BT1-010"] }],
          hand: [{ card: NEUTRAL, as: "opponentNeutral" }],
          security: SECURITY,
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const eligibleId = s.inst("eligible").instanceId;
    const twoColorId = s.inst("twoColor").instanceId;
    const noCsId = s.inst("noCsTrait").instanceId;
    const notAnOptionId = s.inst("csButNotAnOption").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hudie").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === eligibleId),
    );

    expect(s.state.players[0]!.hand.map((card) => card.instanceId).sort()).toEqual(
      [twoColorId, noCsId, notAnOptionId].sort(),
    );
    expect(s.perm("ryuji").isSuspended).toBe(true);
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("protects a Digimon that digivolved this turn through the public digivolve intent", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: HUDIE, as: "stack" }],
          hand: [
            { card: "BT23-020", as: "seadramon" },
            { card: "BT23-085", as: "ryuji" },
            { card: NEUTRAL, as: "neutral" },
          ],
          security: SECURITY,
          deck: DECK,
        },
        1: {
          hand: [
            { card: DP_REDUCER, as: "reducer" },
            { card: NEUTRAL, as: "opponentNeutral" },
          ],
          security: SECURITY,
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    const baseId = s.inst("stack").instanceId;
    const seadramonId = s.inst("seadramon").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 6;
    const permanentId = s.perm("stack").permanentId;

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId, instanceId: seadramonId })).toEqual({ ok: true });
    await settle(() => s.perm("stack").topCard?.instanceId === seadramonId && s.state.pendingDecision === undefined);
    expect(s.perm("stack").stack.map((card) => card.instanceId)).toEqual([baseId]);
    const evolvedDp = s.perm("stack").currentDP;

    prefer.push(seadramonId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ryuji").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("stack"), "dpImmune"));

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    prefer.length = 0;
    prefer.push(s.perm("stack").topCard!.instanceId);
    s.state.memory = 8;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("reducer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === DP_REDUCER));

    expect(s.perm("stack").topCard?.instanceId).toBe(seadramonId);
    expect(s.perm("stack").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.perm("stack").currentDP).toBe(evolvedDp);
    expect(observe(s.engine).isRestricted(s.perm("stack"), "dpImmune")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("plays itself from security without paying its 4 cost", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: NEUTRAL, as: "neutral" }],
          security: [{ card: "BT23-085", as: "securityRyuji" }, "BT1-009", "BT1-010"],
          deck: DECK,
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          hand: [{ card: NEUTRAL, as: "opponentNeutral" }],
          security: SECURITY,
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const ryujiId = s.inst("securityRyuji").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === ryujiId));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === ryujiId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === ryujiId)).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
