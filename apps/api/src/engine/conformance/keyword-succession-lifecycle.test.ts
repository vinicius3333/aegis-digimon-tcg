import { beforeEach, describe, expect, it } from "vitest";
import { cite } from "./_kb.js";
import { observe } from "../testkit/observe.js";
import { advance } from "../testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../testkit/harness.js";
import "../../cards/index.js";

const NEUTRAL = "BT1-009";

const consumers = [
  { card: "BT26-032", base: "BT25-059", cost: 2, copied: [], security: 1, deck: 5, trash: 0 },
  { card: "BT26-080", base: "BT25-077", cost: 2, copied: [], security: 1, deck: 5, trash: 0 },
  { card: "BT26-060", base: "BT26-016", cost: 5, copied: ["Piercing", "Engage"], security: 1, deck: 5, trash: 0 },
  { card: "BT26-103", base: "BT24-101", cost: 5, copied: [], security: 3, deck: 1, trash: 2 },
];

describe("Succession committed consumer evolution", () => {
  beforeEach(() => {
    cite(
      "comprehensive-0324",
      "16-47: persistent gain from the topmost specified digivolution card",
      "d09f994eb5ef5e46d70b28d7d019215d5dc5856d3ec1ffee10d6db6dfa3df717",
    );
    cite(
      "comprehensive-0172",
      "15-8-2: persistent effects follow their live conditions",
      "d4b49613685801d2adcd744aeb58471c0a393a33f9f697539d305a9d21e896c6",
    );
  });

  it.each(consumers)("$card publishes Succession after legal evolution over $base", async (consumer) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: consumer.base, as: "base" }],
          hand: [{ card: consumer.card, as: "evolution" }],
          deck: [NEUTRAL, NEUTRAL, NEUTRAL, "BT1-028", "BT1-028", "BT1-028"],
          security: [{ card: NEUTRAL, as: "security" }],
        },
        1: { deck: [NEUTRAL, NEUTRAL], security: [NEUTRAL] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const baseId = s.inst("base").instanceId;
    const evolutionId = s.inst("evolution").instanceId;
    const permanentId = s.perm("base").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId,
        instanceId: evolutionId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === evolutionId);
    await settle();
    const host = s.perm("base");
    expect(host.permanentId).toBe(permanentId);
    expect(host.controllerSeat).toBe(0);
    expect(host.topCard.instanceId).toBe(evolutionId);
    expect(host.stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(host.keywords).toContain("Succession");
    expect(host.keywords).not.toContain("UseReq");
    for (const keyword of consumer.copied) expect(host.keywords).toContain(keyword);
    expect(host.currentDP).toBe(consumer.card === "BT26-032" || consumer.card === "BT26-080" ? 13000 : 16000);
    expect(host.isSuspended).toBe(false);
    expect(s.state.memory).toBe(10 - consumer.cost);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(consumer.deck);
    expect(s.state.players[0]!.security).toHaveLength(consumer.security);
    expect(s.state.players[0]!.trash).toHaveLength(consumer.trash);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(consumer.card === "BT26-103" ? 0 : 1);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it.each([true, false])("public Chronomon attack resolves the gained effect, acceptance %s", async (accept) => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-060", as: "host", under: [{ card: "BT26-016", as: "source" }] }],
          deck: [NEUTRAL, NEUTRAL],
          security: [NEUTRAL],
        },
        1: {
          battleArea: [
            { card: NEUTRAL, as: "effectTarget" },
            { card: "BT6-063", as: "battleTarget", suspended: true },
          ],
          deck: [NEUTRAL, NEUTRAL],
          security: [
            { card: "BT1-054", as: "firstSecurity" },
            { card: "BT1-054", as: "secondSecurity" },
          ],
        },
      },
      {
        autoAcceptOptional: accept,
        autoDeclineOptional: !accept,
        autoSelectCards: true,
        autoChooseOption: true,
        preferInstanceIds: preferred,
      },
    );
    s.state.memory = 10;
    await s.ready();
    const effectId = s.inst("effectTarget").instanceId;
    const battleId = s.inst("battleTarget").instanceId;
    const securityIds = [s.inst("firstSecurity").instanceId, s.inst("secondSecurity").instanceId];
    const hostId = s.inst("host").instanceId;
    const sourceId = s.inst("source").instanceId;
    preferred.push(effectId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("battleTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle();
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([hostId]);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.perm("host").currentDP).toBe(16000);
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.perm("host").controllerSeat).toBe(0);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual(
      accept ? [] : [effectId],
    );
    expect([...s.state.players[1]!.trash].map((card) => card.instanceId).sort()).toEqual(
      (accept ? [effectId, battleId, ...securityIds] : [battleId, ...securityIds]).sort(),
    );
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.memory).toBe(10);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it.each(["copied", "printed", "absent", "refused", "blockedCopied", "blockedPrinted"] as const)(
    "public Digisorption payment with %s redirect",
    async (mode) => {
      cite(
        "comprehensive-0228",
        "16-10: optional suspension pays the immediate evolution discount",
        "4222de312acf7f62161e0c6a2c2655f30fcef0259ca405ed88fb7e7e8ca10375",
      );
      const options = {
        autoDeclineOptional: true,
        autoAcceptOptional: false,
        autoSelectCards: true,
        autoChooseOption: true,
      };
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: mode === "absent" ? NEUTRAL : "BT3-056", as: "redirector", suspended: true },
              { card: "BT1-077", as: "base", suspended: true },
            ],
            hand: [
              { card: "BT26-032", as: "succession" },
              { card: "BT3-056", as: "evolution" },
            ],
            deck: [NEUTRAL, "BT1-028", "BT1-028"],
            security: [NEUTRAL],
          },
          1: {
            battleArea: [{ card: mode.startsWith("blocked") ? "BT19-101" : NEUTRAL, as: "payment" }],
            deck: [NEUTRAL],
            security: ["BT1-028"],
          },
        },
        options,
      );
      s.state.memory = 10;
      await s.ready();
      const originalRedirectorId = s.inst("redirector").instanceId;
      const baseId = s.inst("base").instanceId;
      const evolutionId = s.inst("evolution").instanceId;
      const successionId = s.inst("succession").instanceId;
      const paymentId = s.inst("payment").instanceId;
      const copied = mode === "copied" || mode === "refused" || mode === "blockedCopied";
      const formationResult = copied
        ? s.engine.applyIntent(0, {
            type: "digivolve",
            permanentId: s.perm("redirector").permanentId,
            instanceId: successionId,
            useAlternateCost: true,
          })
        : undefined;
      expect(formationResult).toEqual(copied ? { ok: true } : undefined);
      if (copied) await settle(() => s.perm("redirector").topCard.instanceId === successionId);
      await settle();
      expect(s.state.memory).toBe(copied ? 8 : 10);
      expect(s.perm("redirector").stack.map((card) => card.instanceId)).toEqual(copied ? [originalRedirectorId] : []);
      options.autoDeclineOptional = mode === "refused";
      options.autoAcceptOptional = mode !== "refused";
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: evolutionId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.instanceId === evolutionId);
      await settle();
      const paidRedirect = mode === "copied" || mode === "printed";
      expect(s.state.memory).toBe((copied ? 8 : 10) - (paidRedirect ? 2 : 5));
      expect(s.perm("payment").isSuspended).toBe(paidRedirect);
      expect(s.perm("payment").topCard.instanceId).toBe(paymentId);
      expect(s.perm("payment").controllerSeat).toBe(1);
      expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
      expect(s.perm("base").currentDP).toBe(12000);
      expect(s.perm("base").isSuspended).toBe(true);
      expect(s.perm("redirector").isSuspended).toBe(true);
      expect(s.state.players[0]!.deck).toHaveLength(copied ? 1 : 2);
      expect(s.state.players[0]!.hand).toHaveLength(2);
      expect(s.state.players[0]!.security).toHaveLength(1);
      expect(s.state.players[0]!.trash).toHaveLength(0);
      expect(s.state.players[1]!.trash).toHaveLength(0);
      expect(s.state.pendingDecision).toBeUndefined();
      assertNoLoudGap(s);
    },
  );

  it.each([true, false])("redirect is used only once after two public evolutions, copied %s", async (copied) => {
    const options = {
      autoDeclineOptional: true,
      autoAcceptOptional: false,
      autoSelectCards: true,
      autoChooseOption: true,
    };
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-056", as: "host", suspended: true },
            { card: "BT1-077", as: "firstBase", suspended: true },
            { card: "BT1-077", as: "secondBase", suspended: true },
          ],
          hand: [
            { card: "BT26-032", as: "succession" },
            { card: "BT2-050", as: "firstEvolution" },
            { card: "BT2-050", as: "secondEvolution" },
          ],
          deck: [NEUTRAL, NEUTRAL, NEUTRAL, "BT1-028"],
          security: ["BT1-028"],
        },
        1: {
          battleArea: [
            { card: NEUTRAL, as: "firstPayment" },
            { card: NEUTRAL, as: "secondPayment" },
          ],
          deck: [NEUTRAL],
          security: ["BT1-028"],
        },
      },
      options,
    );
    s.state.memory = 10;
    await s.ready();
    const hostSourceId = s.inst("host").instanceId;
    const baseIds = [s.inst("firstBase").instanceId, s.inst("secondBase").instanceId];
    const formationResult = copied
      ? s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("host").permanentId,
          instanceId: s.inst("succession").instanceId,
          useAlternateCost: true,
        })
      : undefined;
    expect(formationResult).toEqual(copied ? { ok: true } : undefined);
    if (copied) await settle(() => s.perm("host").topCard.cardId === "BT26-032");
    await settle();
    options.autoDeclineOptional = false;
    options.autoAcceptOptional = true;
    for (const [index, label] of ["first", "second"].entries()) {
      const evolutionId = s.inst(`${label}Evolution`).instanceId;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm(`${label}Base`).permanentId,
          instanceId: evolutionId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm(`${label}Base`).topCard.instanceId === evolutionId);
      await settle();
      expect(s.perm(`${label}Base`).stack.map((card) => card.instanceId)).toEqual([baseIds[index]]);
    }
    expect(s.state.memory).toBe(copied ? 1 : 3);
    expect(s.perm("firstPayment").isSuspended).toBe(true);
    expect(s.perm("secondPayment").isSuspended).toBe(false);
    expect(s.perm("host").topCard.instanceId).toBe(copied ? s.inst("succession").instanceId : hostSourceId);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual(copied ? [hostSourceId] : []);
    expect(s.state.players[0]!.deck).toHaveLength(copied ? 1 : 2);
    expect(s.state.players[0]!.hand).toHaveLength(3);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it.each([false, true])("supplemental failed suspension preserves redirect usage, copied %s", async (copied) => {
    const options = {
      autoDeclineOptional: true,
      autoAcceptOptional: false,
      autoSelectCards: true,
      autoChooseOption: true,
    };
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-056", as: "host", suspended: true },
            { card: "BT1-077", as: "firstBase", suspended: true },
            { card: "BT1-077", as: "secondBase", suspended: true },
          ],
          hand: [
            { card: "BT26-032", as: "succession" },
            { card: "BT2-050", as: "firstEvolution" },
            { card: "BT2-050", as: "secondEvolution" },
          ],
          deck: [NEUTRAL, NEUTRAL, NEUTRAL, "BT1-028"],
          security: ["BT1-028"],
        },
        1: { battleArea: [{ card: NEUTRAL, as: "payment" }], deck: [NEUTRAL], security: ["BT1-028"] },
      },
      options,
    );
    s.state.memory = 10;
    await s.ready();
    const formation = copied
      ? s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("host").permanentId,
          instanceId: s.inst("succession").instanceId,
          useAlternateCost: true,
        })
      : undefined;
    expect(formation).toEqual(copied ? { ok: true } : undefined);
    if (copied) await settle(() => s.perm("host").topCard.cardId === "BT26-032");
    await settle();
    options.autoDeclineOptional = false;
    options.autoAcceptOptional = true;
    // The fault is injected at the existing primitive seam, not attributed to a real card.
    const restore = advance(s.engine).failNextSuspension();
    try {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("firstBase").permanentId,
          instanceId: s.inst("firstEvolution").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("firstBase").topCard.cardId === "BT2-050");
      await settle();
      expect(s.state.memory).toBe(copied ? 3 : 5);
      expect(s.perm("payment").isSuspended).toBe(false);
    } finally {
      restore();
    }
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("secondBase").permanentId,
        instanceId: s.inst("secondEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("secondBase").topCard.cardId === "BT2-050");
    await settle();
    expect(s.state.memory).toBe(copied ? 1 : 3);
    expect(s.perm("payment").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it.each([false, true])("public paid suspension resolves Ceresmon's reaction, copied %s", async (copied) => {
    const preferred: string[] = [];
    const options = {
      autoDeclineOptional: true,
      autoAcceptOptional: false,
      autoSelectCards: true,
      autoChooseOption: true,
      preferInstanceIds: preferred,
    };
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-056", as: "host", suspended: true },
            { card: "BT1-077", as: "base", suspended: true },
            { card: "BT25-059", as: "watcher" },
          ],
          hand: [
            { card: "BT26-032", as: "succession" },
            { card: "BT2-050", as: "evolution" },
          ],
          deck: [NEUTRAL, "BT1-028", "BT1-028"],
          security: [NEUTRAL],
        },
        1: {
          battleArea: [
            { card: NEUTRAL, as: "payment" },
            { card: "BT6-063", as: "reactionTarget", suspended: true },
          ],
          deck: [NEUTRAL],
          security: ["BT1-028"],
        },
      },
      options,
    );
    s.state.memory = 10;
    await s.ready();
    const reactionId = s.inst("reactionTarget").instanceId;
    const paymentId = s.inst("payment").instanceId;
    preferred.push(reactionId);
    const formation = copied
      ? s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("host").permanentId,
          instanceId: s.inst("succession").instanceId,
          useAlternateCost: true,
        })
      : undefined;
    expect(formation).toEqual(copied ? { ok: true } : undefined);
    if (copied) await settle(() => s.perm("host").topCard.cardId === "BT26-032");
    await settle();
    options.autoDeclineOptional = false;
    options.autoAcceptOptional = true;
    options.autoSelectCards = false;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const paymentDecision = s.state.pendingDecision!;
    const paymentCandidates = s.decisions.at(-1)!.req.options?.candidateInstanceIds;
    expect(paymentCandidates).toContain(paymentId);
    expect(paymentCandidates).not.toContain(reactionId);
    options.autoSelectCards = true;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: paymentDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [paymentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT2-050");
    await settle();
    expect(s.state.memory).toBe(copied ? 6 : 8);
    expect(s.perm("payment").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([paymentId]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([reactionId]);
    expect(s.perm("watcher").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });
});
