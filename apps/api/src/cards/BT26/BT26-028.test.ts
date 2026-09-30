import { afterEach, describe, expect, it } from "vitest";
import { appFusionCostFor, assemblyRequirementFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { unregisterCard } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import {
  drainMicrotasks,
  setupEngine,
  settle,
  settleAcrossTimers,
  type BoardSpec,
  type SeatSpec,
} from "../../engine/testkit/harness.js";
import { syntheticDefinitions } from "../../engine/testkit/syntheticDefinitions.js";
import { compiled } from "./BT26-028.js";
import "../index.js";

describe("BT26-028 Medicmon", () => {
  it("preserves App Fusion, Assembly, link windows, and linked-face behavior", () => {
    for (const [topName, linkedName] of [
      ["Aidmon", "Supplemon"],
      ["Aidmon", "Spamon"],
      ["Supplemon", "Aidmon"],
      ["Supplemon", "Spamon"],
      ["Spamon", "Aidmon"],
      ["Spamon", "Supplemon"],
    ] as const) {
      expect(appFusionCostFor("BT26-028", { topName, linkedNames: [linkedName] })).toBe(0);
    }
    expect(appFusionCostFor("BT26-028", { topName: "Aidmon", linkedNames: ["Aidmon"] })).toBeUndefined();
    expect(appFusionCostFor("BT26-028", { topName: "Aidmon", linkedNames: ["Roleplaymon"] })).toBeUndefined();
    expect(assemblyRequirementFor("BT26-028")).toEqual([
      {
        reduceCost: 2,
        materials: [{ kinds: ["Digimon"], traits: ["Life", "System", "Seven Code"], level: 3, count: 1 }],
      },
    ]);
    expect(compiled.appFusionRequirement).toEqual([{ names: ["Aidmon", "Supplemon", "Spamon"], cost: 0 }]);
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Static",
          keywords: expect.arrayContaining([
            { keyword: "Barrier", raw: "＜Barrier＞" },
            { keyword: "Detach", raw: "＜Detach ([Seven Code] trait)＞" },
          ]),
        }),
        expect.objectContaining({
          trigger: "OnPlay",
          actions: [
            expect.objectContaining({
              kind: "Link",
              from: ["digivolutionCards"],
              payCost: false,
              optional: true,
              target: expect.objectContaining({
                filter: expect.objectContaining({ hostFilter: { isSelfRef: true } }),
              }),
            }),
          ],
        }),
        expect.objectContaining({ trigger: "WhenDigivolving" }),
        expect.objectContaining({
          trigger: "Static",
          isLinked: true,
          actions: [
            {
              kind: "SubTrigger",
              event: "whenLinked",
              sourceFilter: { isSelfRef: true },
              actions: [
                expect.objectContaining({
                  kind: "SelectBind",
                  target: expect.objectContaining({ bindAs: "medicmonLinkedTarget" }),
                }),
                expect.objectContaining({
                  kind: "Restrict",
                  target: { filter: {}, count: 1, fromSelectionRef: "medicmonLinkedTarget" },
                  restriction: "cannotActivateWhenDigivolving",
                  duration: "untilOpponentTurnEnd",
                }),
                expect.objectContaining({
                  kind: "ModifyDP",
                  target: { filter: {}, count: 1, fromSelectionRef: "medicmonLinkedTarget" },
                  amount: -3000,
                  duration: "untilOpponentTurnEnd",
                }),
              ],
            },
          ],
        }),
      ]),
    );
  });

  it("assembles with exactly one level-3 Life/System/Seven Code card and rejects a near-miss", async () => {
    const legal = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-028", as: "medicmon" }],
          trash: [
            { card: "BT26-019", as: "sevenCode" },
            { card: "BT1-009", as: "unrelated" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    legal.state.memory = 3;

    expect(
      legal.engine.applyIntent(0, {
        type: "playCard",
        instanceId: legal.inst("medicmon").instanceId,
        assembly: { materialInstanceIds: [legal.inst("sevenCode").instanceId] },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => legal.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT26-028"));

    expect(legal.state.memory).toBe(0);
    expect(legal.perm("medicmon").linked.map(({ instanceId }) => instanceId)).toContain(
      legal.inst("sevenCode").instanceId,
    );
    expect(legal.perm("medicmon").stack).toHaveLength(0);
    expect(legal.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      legal.inst("unrelated").instanceId,
    );

    const illegal = setupEngine({
      0: {
        hand: [{ card: "BT26-028", as: "medicmon" }],
        trash: [{ card: "BT1-009", as: "unrelated" }],
      },
    });
    illegal.state.memory = 3;
    expect(
      illegal.engine.applyIntent(0, {
        type: "playCard",
        instanceId: illegal.inst("medicmon").instanceId,
        assembly: { materialInstanceIds: [illegal.inst("unrelated").instanceId] },
      } as never),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(illegal.state.memory).toBe(3);
  });

  it("links a legal level-3 Link source without activating Medicmon's own link face", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-028", as: "medicmon", under: ["BT26-084"] }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", dp: 7000 },
            { card: "BT1-010", as: "second", dp: 7000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("medicmon"));

    expect(s.perm("medicmon").linked.map((card) => card.cardId)).toEqual(["BT26-084"]);
    expect(s.perm("first").currentDP).toBe(7000);
    expect(s.perm("second").currentDP).toBe(7000);
    expect(observe(s.engine).isRestricted(s.perm("first"), "cannotActivateWhenDigivolving")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("second"), "cannotActivateWhenDigivolving")).toBe(false);
  });

  it("only links from Medicmon's own digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-028", as: "medicmon", under: ["BT1-009"] },
            { card: "BT21-009", as: "otherHost", under: ["BT26-084"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("medicmon"));

    expect(s.perm("medicmon").linked).toHaveLength(0);
    expect(s.perm("otherHost").stack.map((card) => card.cardId)).toEqual(["BT26-084"]);
  });

  it("may decline linking without moving the eligible source", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT26-028", as: "medicmon", under: ["BT26-084"] }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("medicmon"));

    expect(s.perm("medicmon").linked).toHaveLength(0);
    expect(s.perm("medicmon").stack.map((card) => card.cardId)).toEqual(["BT26-084"]);
  });

  it("does not link a level-3 digivolution card without the required trait or Link text", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT26-028", as: "medicmon", under: ["BT1-009"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("medicmon"));

    expect(s.perm("medicmon").linked).toHaveLength(0);
    expect(s.perm("medicmon").stack.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });

  it("when digivolving links a legal source from the evolved stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-025", as: "base", under: [{ card: "BT26-084", as: "linkSource" }] }],
          hand: [{ card: "BT26-028", as: "medicmon" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("medicmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").linked.length === 1);

    expect(s.perm("base").topCard.cardId).toBe("BT26-028");
    expect(s.perm("base").linked.map((card) => card.instanceId)).toContain(s.inst("linkSource").instanceId);
    expect(s.perm("target").currentDP).toBe(7000);
    expect(observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving")).toBe(false);
  });

  it("applies both link-face debuffs when Medicmon itself is linked", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-009", as: "host" }], hand: [{ card: "BT26-028", as: "medicmon" }] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 7000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("medicmon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 4000);

    expect(s.perm("target").currentDP).toBe(4000);
    expect(observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving")).toBe(true);

    advance(s.engine).ledgers.modifiers.sweep(s.state, "eachTurnEnd", 1);
    advance(s.engine).ledgers.continuous.sweep(s.state, "eachTurnEnd", 1);
    expect(s.perm("target").currentDP).toBe(7000);
    expect(observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving")).toBe(false);
  });

  it("suppresses only When Digivolving and preserves a shared once-per-turn effect for When Attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-009", as: "host" },
            { card: "BT1-009", as: "victim", dp: 1000 },
          ],
          hand: [{ card: "BT26-028", as: "medicmon" }],
        },
        1: {
          hand: [{ card: "BT26-016", as: "holy" }],
          battleArea: [
            { card: "BT24-061", as: "tsBase" },
            { card: "BT1-089", as: "tamer", under: [{ card: "BT1-012", faceUp: false }] },
          ],
          deck: [
            { card: "BT1-013", as: "evolutionDraw" },
            { card: "BT1-014", as: "recovery" },
          ],
          security: ["BT1-013"],
          trash: ["BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["Attack"] },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("medicmon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("tsBase"), "cannotActivateWhenDigivolving"));

    s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = -3;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("tsBase").permanentId,
        instanceId: s.inst("holy").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tsBase").topCard.cardId === "BT26-016");

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("victim").permanentId,
    );
    expect(s.state.players[1]!.trash).toHaveLength(3);
    expect(s.state.players[1]!.security).toHaveLength(1);

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("tsBase"));
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("victim").permanentId,
    );
    expect(s.state.players[1]!.trash).toHaveLength(3);

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("tsBase"));
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT21-009");
    expect(s.state.players[1]!.trash).toHaveLength(3);
    expect(s.state.players[1]!.security[0]).toMatchObject({ cardId: "BT1-013", faceUp: false });
  });

  it("publishes Barrier and Detach while Medicmon is the top card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT26-028", as: "medicmon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("medicmon"), "Barrier")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("medicmon"), "Detach")).toBe(true);
  });

  it("accepts Barrier in battle without consuming Medicmon's eligible link", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-028", as: "medicmon", suspended: true, linked: [{ card: "BT26-019", as: "link" }] },
          ],
          security: [{ card: "BT1-009", as: "barrierCost" }],
        },
        1: { battleArea: [{ card: "BT1-025", as: "attacker" }] },
      },
      { autoSelectCards: false },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const hostId = s.perm("medicmon").permanentId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: hostId, accept: true })).toEqual({
      ok: true,
    });
    await settleAcrossTimers(() => s.state.pendingDecision === undefined && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(hostId);
    expect(s.perm("medicmon").linked.map(({ instanceId }) => instanceId)).toEqual([s.inst("link").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("barrierCost").instanceId);
  });

  it("after refusing Barrier, Detach pays with Medicmon's eligible link", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-028", as: "medicmon", suspended: true, linked: [{ card: "BT26-019", as: "link" }] },
          ],
          security: [{ card: "BT1-009", as: "barrierCost" }],
        },
        1: { battleArea: [{ card: "BT1-025", as: "attacker" }] },
      },
      { autoSelectCards: false },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const hostId = s.perm("medicmon").permanentId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: hostId, accept: false })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const detach = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: detach.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("link").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(hostId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("link").instanceId);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("barrierCost").instanceId,
    ]);
  });
});

describe("BT26-028 Medicmon — KB Q&A rulings", () => {
  const noLinkSevenCode = "TEST-BT26-028-NO-LINK";
  const fusionPartners = {
    Aidmon: "TEST-BT26-028-AIDMON",
    Supplemon: "TEST-BT26-028-SUPPLEMON",
    Spamon: "TEST-BT26-028-SPAMON",
  };

  function defineSyntheticCards() {
    const mailmon = getCardDefinition("BT26-019")!;
    syntheticDefinitions.set(noLinkSevenCode, {
      ...mailmon,
      cardId: noLinkSevenCode,
      nameEn: "Seven Code Without Link",
      linkRequirement: undefined,
      linkEffect: undefined,
      linkDp: undefined,
    });
    for (const [name, cardId] of Object.entries(fusionPartners)) {
      syntheticDefinitions.set(cardId, { ...mailmon, cardId, nameEn: name });
    }
  }

  afterEach(() => {
    for (const id of syntheticDefinitions.keys()) unregisterCard(id);
    syntheticDefinitions.clear();
  });

  /**
   * Link Medicmon from hand onto an Appmon so its link face locks one opposing Digimon:
   * `subject` when `lockSubject` is true, otherwise the `decoy`. Hands the turn to the
   * opponent afterwards; the lock lasts until their turn ends.
   */
  async function linkMedicmonLocking(board: BoardSpec, lockSubject: boolean) {
    const preferred: string[] = [];
    const s = setupEngine(board, { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred });
    const locked = s.perm(lockSubject ? "subject" : "decoy");
    preferred.push(locked.permanentId, locked.topCard.instanceId);
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("medicmon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(locked, "cannotActivateWhenDigivolving"));
    await settle(() => s.state.pendingDecision === undefined);
    expect(observe(s.engine).isRestricted(s.perm("subject"), "cannotActivateWhenDigivolving")).toBe(lockSubject);
    s.state.turnSeat = 1;
    s.state.memory = 10;
    const preferSubject = () => preferred.splice(0, preferred.length, s.perm("subject").permanentId);
    return Object.assign(s, { preferSubject });
  }

  function ownBoard(extra: SeatSpec = {}): SeatSpec {
    return {
      battleArea: [{ card: "BT21-009", as: "host" }, ...(extra.battleArea ?? [])],
      hand: [{ card: "BT26-028", as: "medicmon" }],
      security: ["BT1-009", "BT1-010", "BT1-011"],
      ...Object.fromEntries(Object.entries(extra).filter(([key]) => key !== "battleArea")),
    };
  }

  it.each([
    { source: "BT26-019", linked: true },
    { source: noLinkSevenCode, linked: false },
  ])(
    "links a level 3 Seven Code card from its stack only when that card has <Link> (source=$source) (Q6987)",
    async ({ source, linked }) => {
      defineSyntheticCards();
      const s = setupEngine(
        { 0: { battleArea: [{ card: "BT26-028", as: "medicmon", under: [{ card: source, as: "source" }] }] } },
        { autoAcceptOptional: true, autoSelectCards: true },
      );

      await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("medicmon"));

      const sourceId = s.inst("source").instanceId;
      expect(s.perm("medicmon").linked.some(({ instanceId }) => instanceId === sourceId)).toBe(linked);
      expect(s.perm("medicmon").stack.some(({ instanceId }) => instanceId === sourceId)).toBe(!linked);
    },
  );

  it.each([true, false])(
    "stops a locked Digimon's [When Digivolving] effect from activating on digivolution (locked=%s) (Q6988)",
    async (lockSubject) => {
      const s = await linkMedicmonLocking(
        {
          0: ownBoard(),
          1: {
            battleArea: [
              { card: "BT20-030", as: "subject", dp: 8000 },
              { card: "BT1-009", as: "decoy", dp: 8000 },
            ],
            hand: [{ card: "BT20-031", as: "liamon" }],
          },
        },
        lockSubject,
      );
      const hostDP = s.perm("host").currentDP;

      expect(
        s.engine.applyIntent(1, {
          type: "digivolve",
          permanentId: s.perm("subject").permanentId,
          instanceId: s.inst("liamon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("subject").topCard.cardId === "BT20-031" && s.state.pendingDecision === undefined);
      await drainMicrotasks();

      expect(s.perm("host").currentDP).toBe(lockSubject ? hostDP : hostDP - 3000);
    },
  );

  it("still lets a locked Digimon activate its [When Digivolving] [When Attacking] effect when it attacks (Q6989)", async () => {
    const s = await linkMedicmonLocking(
      {
        0: ownBoard(),
        1: {
          battleArea: [
            { card: "EX12-037", as: "subject" },
            { card: "BT1-009", as: "decoy", dp: 8000 },
          ],
        },
      },
      true,
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("subject").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking(), 3000);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it.each([true, false])(
    "stops another effect from activating a locked Digimon's [When Digivolving] effect (locked=%s) (Q6990)",
    async (lockSubject) => {
      const s = await linkMedicmonLocking(
        {
          0: ownBoard(),
          1: {
            battleArea: [
              { card: "BT10-112", as: "subject", suspended: true },
              { card: "BT1-009", as: "decoy", dp: 8000 },
            ],
            hand: [
              { card: "BT10-110", as: "seikenMeppa" },
              { card: "BT10-068", as: "royalKnight" },
            ],
          },
        },
        lockSubject,
      );

      s.preferSubject();
      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("seikenMeppa").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT10-110"));
      await drainMicrotasks();

      const royalKnightId = s.inst("royalKnight").instanceId;
      expect(s.perm("subject").stack.some((card) => card.instanceId === royalKnightId)).toBe(!lockSubject);
      expect(s.perm("subject").isSuspended).toBe(false);
    },
  );

  it.each([true, false])(
    'does not let a locked Digimon pay the "by" cost of its [When Digivolving] effect (locked=%s) (Q6991)',
    async (lockSubject) => {
      const s = await linkMedicmonLocking(
        {
          0: ownBoard(),
          1: {
            battleArea: [
              { card: "BT1-080", as: "subject" },
              { card: "BT10-055", as: "decoy" },
            ],
            hand: [
              { card: "BT24-081", as: "titamon" },
              { card: "BT1-013", as: "discard" },
            ],
            deck: ["BT1-010", "BT1-011"],
          },
        },
        lockSubject,
      );

      expect(
        s.engine.applyIntent(1, {
          type: "digivolve",
          permanentId: s.perm("subject").permanentId,
          instanceId: s.inst("titamon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("subject").topCard.cardId === "BT24-081");
      await settle(() => s.state.pendingDecision === undefined);
      await drainMicrotasks();

      expect(s.state.players[1]!.hand.map((card) => card.instanceId).includes(s.inst("discard").instanceId)).toBe(
        lockSubject,
      );
      expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT21-009")).toBe(lockSubject);
    },
  );

  it.each([
    { lockSubject: true, afterDigivolving: 3, afterAttacking: 2 },
    { lockSubject: false, afterDigivolving: 2, afterAttacking: 2 },
  ])(
    "does not spend a [Once Per Turn] use on a blocked [When Digivolving] timing (locked=$lockSubject) (Q6992)",
    async ({ lockSubject, afterDigivolving, afterAttacking }) => {
      const s = await linkMedicmonLocking(
        {
          0: ownBoard({
            battleArea: [
              { card: "BT1-009", dp: 5000 },
              { card: "BT1-009", dp: 5000 },
            ],
          }),
          1: {
            battleArea: [
              { card: "BT10-055", as: "subject" },
              { card: "BT1-009", as: "decoy", dp: 8000 },
            ],
            hand: [{ card: "EX12-037", as: "omnimon" }],
            deck: ["BT1-010", "BT1-011", "BT1-012"],
          },
        },
        lockSubject,
      );
      const myDigimonCount = () => s.state.players[0]!.battleArea.length;
      expect(myDigimonCount()).toBe(3);

      expect(
        s.engine.applyIntent(1, {
          type: "digivolve",
          permanentId: s.perm("subject").permanentId,
          instanceId: s.inst("omnimon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("subject").topCard.cardId === "EX12-037");
      await settle(() => s.state.pendingDecision === undefined);
      await drainMicrotasks();
      expect(myDigimonCount()).toBe(afterDigivolving);

      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("subject").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking(), 3000);
      expect(myDigimonCount()).toBe(afterAttacking);
    },
  );

  it.each([
    ["Aidmon", "Supplemon"],
    ["Aidmon", "Spamon"],
    ["Supplemon", "Aidmon"],
    ["Supplemon", "Spamon"],
    ["Spamon", "Aidmon"],
    ["Spamon", "Supplemon"],
  ] as const)("App Fuses from a [%s] with a [%s] link card for 0 (Q6993)", async (topName, linkedName) => {
    defineSyntheticCards();
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: fusionPartners[topName],
              as: "host",
              linked: [{ card: fusionPartners[linkedName], as: "partner" }],
            },
          ],
          hand: [{ card: "BT26-028", as: "medicmon" }],
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "appFusion",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("medicmon").instanceId,
        linkedInstanceId: s.inst("partner").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT26-028");

    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual([
      fusionPartners[topName],
      fusionPartners[linkedName],
    ]);
    expect(s.state.memory).toBe(0);
  });

  it("rejects App Fusion from two cards with the same name (Q6993)", async () => {
    defineSyntheticCards();
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: fusionPartners.Aidmon, as: "host", linked: [{ card: fusionPartners.Aidmon, as: "partner" }] },
          ],
          hand: [{ card: "BT26-028", as: "medicmon" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    const result = s.engine.applyIntent(0, {
      type: "appFusion",
      permanentId: s.perm("host").permanentId,
      instanceId: s.inst("medicmon").instanceId,
      linkedInstanceId: s.inst("partner").instanceId,
    });

    expect(result.ok).toBe(false);
    expect(s.perm("host").topCard.cardId).toBe(fusionPartners.Aidmon);
  });
});
