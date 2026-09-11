import { appFusionCostFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-033.js";

describe("BT23-033 Beautymon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-033")).toMatchObject({
      cardId: "BT23-033",
      nameEn: "Beautymon",
      colors: ["Yellow", "Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 8,
      dp: 8000,
      evoCosts: [
        { color: "Yellow", level: 4, memoryCost: 4 },
        { color: "Black", level: 4, memoryCost: 4 },
      ],
      forms: ["Ult.", "Appmon"],
      attributes: ["Life"],
      types: ["Beauty"],
      linkDp: 4000,
      linkEffect:
        "[When Linking] Until your opponent's turn ends, their effects can't return this Digimon to hands or decks or affect it with ＜De-Digivolve＞ effects.",
      linkRequirement: "[Link] [Appmon]\u00a0trait: Cost 3",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
  it("links only a Link-capable level-4-or-lower card and still scales DP when Recovery is ineligible", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-033", as: "beautymon" }],
          trash: [
            { card: "BT23-039", as: "linkCapable" },
            { card: "BT1-009", as: "noLink" },
          ],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          deck: [{ card: "BT23-100", as: "mustRemainInDeck" }],
        },
        1: { battleArea: [{ card: "BT1-024", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    const linkId = s.inst("linkCapable").instanceId;
    const beautymonId = s.inst("beautymon").instanceId;

    // Public flow: play Beautymon from hand for its printed cost of 8.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: beautymonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === beautymonId));
    await settle();

    expect(s.state.memory).toBe(2);
    expect(s.perm("beautymon").linked.some((card) => card.instanceId === linkId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(6);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.perm("target").currentDP).toBe(4000);
  });

  it("declares Barrier", () => {
    const staticEffect = compiled.effects.find((entry) => entry.trigger === "Static") as any;
    expect(staticEffect.keywords).toEqual([{ keyword: "Barrier", raw: "＜Barrier＞" }]);
  });

  it("may link a level 4-or-lower card from trash or this Digimon's stack", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "Link",
        target: {
          source: "thisDigimon",
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            hasLinkRequirement: true,
            levelComparison: { op: "lte", value: 4 },
          },
          count: 1,
        },
        from: ["trash", "digivolutionCards"],
        payCost: false,
        optional: true,
      });
      expect(action.recipient).toBeUndefined();
    }
  });

  it("once per turn reacts only when this Digimon gets linked", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn") as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenLinked",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          source: "deck",
          amount: 1,
          condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 5 },
        },
        {
          kind: "ModifyDP",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: -1000,
          duration: "untilOpponentTurnEnd",
          scaling: { per: 1, unit: "security", filter: { controller: "mine" } },
        },
      ],
    });
  });

  it("carries App Fusion, Link cost and linked return/de-digivolve protection", () => {
    expect(compiled.appFusionRequirement).toEqual([{ names: ["Coordemon", "Consulmon"], cost: 0 }]);
    expect(compiled.linkRequirement).toEqual([{ cost: 3, traits: ["Appmon"] }]);
    expect(compiled.effects.find((entry) => entry.isLinked)).toMatchObject({
      trigger: "AllTurns",
      isLinked: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Restrict",
              restriction: "cannotReturnToHandOrDeck",
              // "THEIR effects can't return this Digimon": the controller's own effects still can.
              byOpponentEffectsOnly: true,
              duration: "untilOpponentTurnEnd",
            },
            {
              kind: "GrantStatic",
              grant: "protection",
              tokens: ["beDeDigivolved"],
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
      ],
    });
    expect(appFusionCostFor("BT23-033", { topName: "Coordemon", linkedNames: ["Consulmon"] })).toBe(0);
    expect(appFusionCostFor("BT23-033", { topName: "Consulmon", linkedNames: ["Coordemon"] })).toBe(0);
  });

  it("App Fusions from a linked [Coordemon] + [Consulmon] pair for 0 and refuses a wrong partner", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-028", as: "coordemon" }],
          hand: [
            { card: "BT23-052", as: "consulmon" },
            { card: "BT23-033", as: "beautymon" },
          ],
          deck: [{ card: "BT1-046", as: "bonusDraw" }, "BT1-047", "BT1-049"],
        },
      },
      // Decline Beautymon's own optional link clause so only the App Fusion moves cards.
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    const coordemonId = s.inst("coordemon").instanceId;
    const consulmonId = s.inst("consulmon").instanceId;
    const beautymonId = s.inst("beautymon").instanceId;

    // [Link] [Appmon] trait: Cost 2 — Coordemon carries the [Appmon] form, so Consulmon links to it.
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: consulmonId,
        targetPermanentId: s.perm("coordemon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("coordemon").linked.some((card) => card.instanceId === consulmonId));
    expect(s.state.memory).toBe(3);

    expect(
      s.engine.applyIntent(0, {
        type: "appFusion",
        permanentId: s.perm("coordemon").permanentId,
        instanceId: beautymonId,
        linkedInstanceId: consulmonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("coordemon").topCard.instanceId === beautymonId);
    await settle();

    // [App Fusion] [Coordemon] & [Consulmon]: Cost 0 — the linked partner is consumed into
    // the stack alongside the former top card, and the memory left by the link is untouched.
    expect(s.state.memory).toBe(3);
    expect(
      s
        .perm("coordemon")
        .stack.map((card) => card.instanceId)
        .sort(),
    ).toEqual([coordemonId, consulmonId].sort());
    expect(s.perm("coordemon").linked).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("bonusDraw").instanceId]);
    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "digivolved", mechanic: "appFusion", cardId: "BT23-033" }),
    );
    expect(s.state.pendingDecision).toBeUndefined();

    // Negative: the same fusion from a linked partner that is not [Consulmon] is refused.
    const illegal = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-028", as: "coordemon", linked: [{ card: "BT23-039", as: "wrongPartner" }] }],
          hand: [{ card: "BT23-033", as: "beautymon" }],
          deck: ["BT1-046", "BT1-047"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await illegal.ready();
    illegal.state.memory = 5;

    expect(
      illegal.engine.applyIntent(0, {
        type: "appFusion",
        permanentId: illegal.perm("coordemon").permanentId,
        instanceId: illegal.inst("beautymon").instanceId,
        linkedInstanceId: illegal.inst("wrongPartner").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(illegal.perm("coordemon").topCard.instanceId).toBe(illegal.inst("coordemon").instanceId);
    expect(illegal.state.memory).toBe(5);
  });

  it("at five security recovers first, then scales the DP loss from all six cards, per Q5281", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-033", as: "beautymon" }],
          trash: [{ card: "BT23-039", as: "link" }],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          deck: [{ card: "BT23-100", as: "recovery" }],
        },
        1: { battleArea: [{ card: "BT1-024", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    const beautymonId = s.inst("beautymon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: beautymonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 6);
    await settle();

    expect(s.state.players[0]!.security).toHaveLength(6);
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("recovery").instanceId);
    // Q5281: the "then" half runs whether or not the Recovery condition held — here it did,
    // so all six security cards scale the DP loss.
    expect(s.perm("target").currentDP).toBe(4000);
    expect(s.state.memory).toBe(2);
  });

  it("links onto an Appmon for 3, adds 4000 DP, and grants both linked protections", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-009", as: "host" }], hand: [{ card: "BT23-033", as: "beautymon" }] },
    });
    s.state.memory = 5;
    const baseDp = s.perm("host").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("beautymon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === s.inst("beautymon").instanceId));
    expect(s.state.memory).toBe(2);
    expect(s.perm("host").currentDP).toBe(baseDp + 4000);
    expect(observe(s.engine).isRestricted(s.perm("host"), "beReturned")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("host"), "cantBeDeDigivolved")).toBe(true);
  });

  it("when digivolving links from this Digimon's stack, not another friendly stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-028", as: "base", under: [{ card: "BT23-028", as: "ownLink" }] },
            { card: "BT23-028", as: "otherHost", under: [{ card: "BT23-028", as: "otherLink" }] },
          ],
          hand: [{ card: "BT23-033", as: "beautymon" }],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("beautymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").linked.some((card) => card.instanceId === s.inst("ownLink").instanceId));

    expect(s.perm("base").linked.map((card) => card.instanceId)).toContain(s.inst("ownLink").instanceId);
    expect(s.perm("otherHost").stack.map((card) => card.instanceId)).toContain(s.inst("otherLink").instanceId);
    expect(s.perm("otherHost").linked.map((card) => card.instanceId)).not.toContain(s.inst("otherLink").instanceId);
  });

  it.each([
    ["accepts", true],
    ["refuses", false],
  ] as const)("public Barrier combat %s the deletion", async (_label, accept) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-033", as: "beautymon" }],
        security: ["BT1-009", "BT1-010"],
        hand: [{ card: "BT1-011", as: "ownSpare" }],
        deck: ["BT1-012", "BT1-013", "BT1-014"],
      },
      1: {
        battleArea: [{ card: "BT1-024", as: "attacker" }],
        security: ["BT1-045", "BT1-047"],
        hand: [{ card: "BT1-011", as: "opponentSpare" }],
        deck: ["BT1-011", "BT1-012", "BT1-013"],
      },
    });
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    // Beautymon attacks the player so it is suspended when the opponent's turn comes round,
    // reaching the combat Barrier window through production flow rather than a turnSeat write.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("beautymon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle();
    expect(s.perm("beautymon").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    const attack = s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "permanent", permanentId: s.perm("beautymon").permanentId },
    });
    expect(attack).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(
      s.engine.applyIntent(0, {
        type: "respondBarrier",
        permanentId: s.perm("beautymon").permanentId,
        accept,
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle();
    if (accept) {
      expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("beautymon").permanentId)).toBe(true);
      expect(s.state.players[0]!.security).toHaveLength(1);
      expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-009");
    } else {
      expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("beautymon").permanentId)).toBe(false);
    }
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("places the exact deck top card onto the top of the security stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-033", as: "beautymon" }],
          hand: [{ card: "BT23-039", as: "link" }],
          security: [{ card: "BT1-009", as: "oldTop" }, "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          deck: [
            { card: "BT1-014", as: "recovery" },
            { card: "BT23-100", as: "stayInDeck" },
          ],
        },
        1: { battleArea: [{ card: "BT1-024", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("beautymon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 6 && s.state.pendingDecision === undefined);

    const security = s.state.players[0]!.security;
    expect(security[0]!.instanceId).toBe(s.inst("recovery").instanceId);
    expect(security[0]!.faceUp).not.toBe(true);
    expect(security[1]!.instanceId).toBe(s.inst("oldTop").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("stayInDeck").instanceId]);
    expect(s.perm("target").currentDP).toBe(4000);
  });

  it("resets the once-per-turn link effect on the next own turn through the real turn loop", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-033", as: "beautymon" }],
          hand: [
            { card: "BT23-039", as: "firstLink" },
            { card: "BT23-039", as: "secondLink" },
            { card: "BT1-009", as: "spare" },
          ],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          deck: Array(10).fill("BT1-009"),
        },
        1: { battleArea: [{ card: "BT1-024", as: "target" }], deck: Array(10).fill("BT1-010") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 6;
    const baseDp = s.perm("target").currentDP;
    expect(baseDp).toBe(10000);

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("firstLink").instanceId,
        targetPermanentId: s.perm("beautymon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 4000 && s.state.pendingDecision === undefined);
    expect(s.perm("target").currentDP).toBe(4000);
    expect(s.state.players[0]!.security).toHaveLength(6);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("target").currentDP).toBe(4000);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("target").currentDP).toBe(baseDp);

    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("secondLink").instanceId,
        targetPermanentId: s.perm("beautymon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 4000 && s.state.pendingDecision === undefined);
    expect(s.perm("target").currentDP).toBe(4000);
    expect(s.state.players[0]!.security).toHaveLength(6);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("publicly triggers its linked Your Turn effect once, with security scaling and a second-link cap", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-033", as: "beautymon" }],
          hand: [
            { card: "BT23-039", as: "firstLink" },
            { card: "BT23-039", as: "secondLink" },
          ],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          deck: ["BT1-014"],
        },
        1: { battleArea: [{ card: "BT1-024", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    const first = s.engine.applyIntent(0, {
      type: "linkCard",
      instanceId: s.inst("firstLink").instanceId,
      targetPermanentId: s.perm("beautymon").permanentId,
    });
    expect(first).toEqual({ ok: true });
    await settle(() => s.perm("beautymon").linked.some((card) => card.instanceId === s.inst("firstLink").instanceId));
    expect(s.state.players[0]!.security).toHaveLength(6);
    expect(s.perm("target").currentDP).toBe(4000);
    const second = s.engine.applyIntent(0, {
      type: "linkCard",
      instanceId: s.inst("secondLink").instanceId,
      targetPermanentId: s.perm("beautymon").permanentId,
    });
    expect(second).toEqual({ ok: true });
    await settle(() => s.perm("beautymon").linked.some((card) => card.instanceId === s.inst("secondLink").instanceId));
    expect(s.state.players[0]!.security).toHaveLength(6);
    expect(s.perm("target").currentDP).toBe(4000);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
