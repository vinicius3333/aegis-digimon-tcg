import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-030.js";
import "../BT5/BT5-091.js";
import "../BT13/BT13-007.js";
import "../BT17/BT17-079.js";
import "./BT18-045.js";
import "./BT18-048.js";
import "./BT18-090.js";
import { compiled } from "./BT18-047.js";

describe("BT18-047 Arbormon", () => {
  it("suspends the exact opposing target after paying with a green Digimon", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toMatchObject([
      { trigger: "OnPlay", actions: [{ kind: "Suspend" }] },
      { trigger: "WhenDigivolving", actions: [{ kind: "Suspend" }] },
      { trigger: "Rule", actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Vegetation"] }] },
      { trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "Suspend" }] },
    ]);
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-047", as: "arbormon" }], battleArea: [{ card: "BT18-045", as: "greenCost" }] },
        1: { battleArea: [{ card: "BT1-030", as: "opponentTarget" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferredInstanceIds },
    );
    preferredInstanceIds.push(s.perm("greenCost").topCard!.instanceId, s.perm("opponentTarget").topCard!.instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("arbormon").instanceId })).toEqual({
      ok: true,
    });
    await s.ready();
    await settle(() => s.perm("opponentTarget").isSuspended);

    expect(s.perm("greenCost").isSuspended).toBe(true);
    expect(s.perm("opponentTarget").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("can pay the mandatory suspension cost by suspending itself when no other green Digimon exists", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT18-047", as: "arbormon" }] },
      1: { battleArea: [{ card: "BT1-087", as: "opponentTamer" }] },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("arbormon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("arbormon").topCard?.cardId === "BT18-047");

    expect(s.perm("arbormon").isSuspended).toBe(true);
    expect(s.perm("opponentTamer").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("uses the zero-cost Petaldramon evolution and resolves the same paid effect", async () => {
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-050", as: "petaldramon" },
            { card: "BT18-045", as: "greenCost" },
          ],
          hand: [{ card: "BT18-047", as: "arbormon" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-087", as: "opponentTamer" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferredInstanceIds },
    );
    preferredInstanceIds.push(s.perm("greenCost").topCard!.instanceId, s.perm("opponentTamer").topCard!.instanceId);
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("petaldramon").permanentId,
        instanceId: s.inst("arbormon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("petaldramon").topCard?.cardId === "BT18-047");
    await settle(() => s.perm("opponentTamer").isSuspended);

    expect(s.state.memory).toBe(5);
    expect(s.perm("petaldramon").stack.at(-1)?.cardId).toBe("BT18-050");
    expect(s.perm("greenCost").isSuspended).toBe(true);
    expect(s.perm("opponentTamer").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("grants Vegetation to itself", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT18-047", as: "arbormon" }] } });
    await s.ready();

    expect(observe(s.engine).hasEffectiveTrait(s.perm("arbormon"), "Vegetation")).toBe(true);
    assertNoLoudGap(s);
  });

  it("suspends only one opposing Digimon on the inherited host's first attack each turn", async () => {
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-030", as: "host", under: ["BT18-047"] }] },
        1: {
          battleArea: [
            { card: "BT1-030", as: "firstTarget" },
            { card: "BT1-030", as: "secondTarget" },
          ],
          security: ["BT1-011", "BT1-011"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferredInstanceIds },
    );
    preferredInstanceIds.push(s.perm("firstTarget").topCard!.instanceId, s.perm("secondTarget").topCard!.instanceId);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("firstTarget").isSuspended);
    expect(s.perm("secondTarget").isSuspended).toBe(false);

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("secondTarget").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });
});

describe("BT18-047 Arbormon — KB Q&A rulings", () => {
  const digivolve = (s: ReturnType<typeof setupEngine>, baseAlias: string, cardAlias: string) =>
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm(baseAlias).permanentId,
      instanceId: s.inst(cardAlias).instanceId,
    });

  const attackPlayer = (s: ReturnType<typeof setupEngine>, attackerAlias: string) =>
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm(attackerAlias).permanentId,
      target: { kind: "player" },
    });

  it("a Tamer digivolves as a Tamer: Digimon-digivolve watchers stay silent and a Digimon digivolve lock does not stop it (Q2973)", async () => {
    const watched = setupEngine(
      {
        0: {
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          battleArea: [
            { card: "BT5-091", as: "takumi" },
            { card: "BT18-090", as: "zoe" },
            { card: "BT18-045", as: "pomumon" },
          ],
          hand: [
            { card: "BT18-048", as: "kazemon" },
            { card: "BT18-047", as: "arbormon" },
          ],
        },
        1: { deck: ["BT1-009", "BT1-010"], battleArea: [{ card: "BT1-030", as: "opponentDigimon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await watched.ready();
    watched.state.memory = 10;

    expect(digivolve(watched, "zoe", "kazemon")).toEqual({ ok: true });
    await settle(
      () =>
        watched.perm("zoe").topCard.instanceId === watched.inst("kazemon").instanceId &&
        watched.state.pendingDecision === undefined,
    );
    expect(watched.perm("takumi").isSuspended).toBe(false);

    expect(digivolve(watched, "pomumon", "arbormon")).toEqual({ ok: true });
    await settle(
      () =>
        watched.perm("pomumon").topCard.instanceId === watched.inst("arbormon").instanceId &&
        watched.state.pendingDecision === undefined,
    );
    expect(watched.perm("takumi").isSuspended).toBe(true);

    const locked = setupEngine({
      0: {
        deck: ["BT1-009", "BT1-010", "BT1-011"],
        breeding: { card: "BT13-007", as: "drasil" },
        battleArea: [
          { card: "BT18-090", as: "zoe" },
          { card: "BT18-045", as: "pomumon" },
        ],
        hand: [
          { card: "BT18-048", as: "kazemon" },
          { card: "BT18-047", as: "arbormon" },
        ],
      },
      1: { deck: ["BT1-009", "BT1-010"] },
    });
    await locked.ready();
    locked.state.memory = 10;

    expect(digivolve(locked, "pomumon", "arbormon")).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(locked.perm("pomumon").topCard.cardId).toBe("BT18-045");
    expect(digivolve(locked, "zoe", "kazemon")).toEqual({ ok: true });
    await settle(() => locked.perm("zoe").topCard.instanceId === locked.inst("kazemon").instanceId);
    expect(locked.perm("zoe").stack.map(({ instanceId }) => instanceId)).toContain(locked.inst("zoe").instanceId);
  });

  it("performs the digivolution bonus draw when a Tamer digivolves (Q2974)", async () => {
    const s = setupEngine(
      {
        0: {
          deck: [{ card: "BT1-009", as: "tamerRouteDraw" }, { card: "BT1-010", as: "digimonRouteDraw" }, "BT1-011"],
          battleArea: [
            { card: "BT18-090", as: "zoe" },
            { card: "BT18-045", as: "pomumon" },
          ],
          hand: [
            { card: "BT18-048", as: "kazemon" },
            { card: "BT18-047", as: "arbormon" },
          ],
        },
        1: { deck: ["BT1-009", "BT1-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    const handIds = () => s.state.players[0]!.hand.map(({ instanceId }) => instanceId);

    expect(digivolve(s, "zoe", "kazemon")).toEqual({ ok: true });
    await settle(
      () => s.perm("zoe").topCard.instanceId === s.inst("kazemon").instanceId && s.state.pendingDecision === undefined,
    );
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(handIds()).toContain(s.inst("tamerRouteDraw").instanceId);

    expect(digivolve(s, "pomumon", "arbormon")).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("pomumon").topCard.instanceId === s.inst("arbormon").instanceId && s.state.pendingDecision === undefined,
    );
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(handIds()).toContain(s.inst("digimonRouteDraw").instanceId);
  });

  it("cannot attack the turn it digivolves from a Tamer that was played this turn (Q2975)", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          battleArea: [{ card: "BT18-090", as: "establishedZoe" }],
          hand: [
            { card: "BT18-090", as: "freshZoe" },
            { card: "BT18-048", as: "freshKazemon" },
            { card: "BT18-048", as: "establishedKazemon" },
          ],
        },
        1: { deck: ["BT1-009", "BT1-010"], security: ["BT1-011", "BT1-012"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("freshZoe").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("freshZoe").instanceId),
    );
    expect(digivolve(s, "freshZoe", "freshKazemon")).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("freshZoe").topCard.instanceId === s.inst("freshKazemon").instanceId &&
        s.state.pendingDecision === undefined,
    );
    expect(s.perm("freshZoe").summoningSick).toBe(true);
    expect(attackPlayer(s, "freshZoe")).toMatchObject({ ok: false });
    expect(s.perm("freshZoe").isSuspended).toBe(false);

    expect(digivolve(s, "establishedZoe", "establishedKazemon")).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("establishedZoe").topCard.instanceId === s.inst("establishedKazemon").instanceId &&
        s.state.pendingDecision === undefined,
    );
    expect(s.perm("establishedZoe").summoningSick).toBe(false);
    expect(attackPlayer(s, "establishedZoe")).toEqual({ ok: true });
  });

  it("treats a Tamer under the Digimon as a digivolution card and trashes it when the Digimon leaves (Q6614)", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["BT1-009", "BT1-010"],
          battleArea: [
            {
              card: "BT18-047",
              as: "arbormon",
              under: [
                { card: "BT18-090", as: "zoe" },
                { card: "BT18-045", as: "pomumon" },
              ],
            },
          ],
        },
        1: {
          deck: ["BT1-009", "BT1-010"],
          battleArea: [{ card: "BT1-030", as: "wall", dp: 9000, suspended: true }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const zoeId = s.inst("zoe").instanceId;
    expect(s.perm("arbormon").topCard.cardId).toBe("BT18-047");
    expect(s.perm("arbormon").stack.map(({ instanceId }) => instanceId)).toContain(zoeId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("arbormon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.pendingDecision === undefined);

    const trashIds = s.state.players[0]!.trash.map(({ instanceId }) => instanceId);
    expect(trashIds).toContain(zoeId);
    expect(trashIds).toContain(s.inst("pomumon").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("does not gain the security effect of a Tamer in its digivolution cards (Q6615)", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["BT1-009", "BT1-010"],
          battleArea: [
            { card: "BT18-047", as: "arbormon", under: [{ card: "BT18-090", as: "stackedZoe" }, "BT18-045"] },
          ],
          security: [{ card: "BT18-090", as: "securityZoe" }],
        },
        1: { deck: ["BT1-009", "BT1-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const effectTriggeredFrom = (instanceId: string) =>
      s.events.some((event) => event.kind === "effectTriggered" && event.sourceInstanceId === instanceId);
    const inBattleArea = (instanceId: string) =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === instanceId);

    await advance(s.engine).fire(EffectTiming.SecuritySkill, s.perm("arbormon"));
    await settle();

    expect(effectTriggeredFrom(s.inst("stackedZoe").instanceId)).toBe(false);
    expect(s.perm("arbormon").stack.map(({ instanceId }) => instanceId)).toContain(s.inst("stackedZoe").instanceId);
    expect(inBattleArea(s.inst("stackedZoe").instanceId)).toBe(false);

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityZoe"));
    await settle(() => inBattleArea(s.inst("securityZoe").instanceId));

    expect(effectTriggeredFrom(s.inst("securityZoe").instanceId)).toBe(true);
  });

  it("gains the inherited effect of a Tamer in its digivolution cards (Q6616)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT18-047", as: "withTakuya", under: ["BT17-079"] },
          { card: "BT18-047", as: "withoutTakuya", under: ["BT18-045"] },
        ],
      },
    });
    await s.ready();

    expect(s.perm("withTakuya").currentDP).toBe(7000);
    expect(s.perm("withoutTakuya").currentDP).toBe(5000);
    assertNoLoudGap(s);
  });
});
