import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-030.js";
import "../index.js";

const CARD_ID = "EX10-030";
const LINKABLE_LV4 = "BT24-036";
const LINKABLE_LV3 = "BT26-010";
const NO_LINK = "BT1-009";

describe("EX10-030 Cometmon", () => {
  it("records the exact catalog and compiled contract", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Black", "Yellow"],
      level: 5,
      playCost: 8,
      dp: 8000,
      evoCosts: [
        { color: "Black", level: 4, memoryCost: 4 },
        { color: "Yellow", level: 4, memoryCost: 4 },
      ],
      forms: ["Ult.", "Appmon"],
      attributes: ["Navi"],
      types: ["Astronomy", "Leviathan"],
      linkDp: 4000,
      linkRequirement: "[Link] [Appmon]\u00A0trait: Cost 3",
      linkEffect:
        "[All Turns] [Once Per Turn] When this Digimon would leave the battle area, by trashing 1 of its link cards, it doesn't leave.",
    });
    expect(getCardDefinition(CARD_ID)).not.toHaveProperty("inheritedEffectText");
    const replacement = compiled.effects?.find((effect) =>
      effect.actions?.some((action) => action.kind === "Replacement"),
    );
    expect(replacement).toMatchObject({ trigger: "AllTurns", isLinked: true, frequency: "OncePerTurn" });
    expect(replacement?.isInherited).toBeUndefined();
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.appFusionRequirement).toEqual([{ names: ["Warpmon", "Weatherdramon"], cost: 0 }]);
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 3 }]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Link",
            from: ["hand", "digivolutionCards"],
            optional: true,
            payCost: false,
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                levelComparison: { op: "lte", value: 4 },
                hasLinkRequirement: true,
                hostFilter: { isSelfRef: true },
              },
              count: 1,
            },
            recipient: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          },
        ],
      });
    }
    expect(compiled.effects?.flatMap((effect) => effect.actions ?? []).some((action) => action.kind === "Return")).toBe(
      false,
    );
  });

  it("[On Play] links a level-4-or-lower Digimon card with <Link> from hand, free of its link cost", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "comet" },
            { card: LINKABLE_LV4, as: "medic" },
            { card: NO_LINK, as: "noLink" },
          ],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("medic").instanceId);
    await s.ready();
    s.state.memory = 10;
    const cometId = s.inst("comet").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: cometId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea[0]?.linked.length === 1);

    const comet = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === cometId)!;
    expect(comet.linked.map((card) => card.instanceId)).toEqual([s.inst("medic").instanceId]);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("noLink").instanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("Q5087: a card without <Link> is not a legal target, so nothing gets linked", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "comet" },
            { card: NO_LINK, as: "noLink" },
          ],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    const cometId = s.inst("comet").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: cometId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === cometId));
    await settle(() => false, 40);

    const comet = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === cometId)!;
    expect(comet.linked).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("noLink").instanceId]);
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[When Digivolving] fires on the printed black Lv.4 route and links from the digivolution cards", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-052", as: "warpmon" }],
          hand: [{ card: CARD_ID, as: "comet" }],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("warpmon").instanceId);
    await s.ready();
    s.state.memory = 10;
    const warpmonInstanceId = s.inst("warpmon").instanceId;
    const handBefore = s.state.players[0]!.hand.length;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("warpmon").permanentId,
        instanceId: s.inst("comet").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("warpmon").linked.length === 1);

    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-013"]);
    expect(s.state.players[0]!.hand).toHaveLength(handBefore);
    expect(s.perm("warpmon").topCard!.cardId).toBe(CARD_ID);
    expect(s.perm("warpmon").linked.map((card) => card.instanceId)).toEqual([warpmonInstanceId]);
    expect(s.perm("warpmon").stack).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("also digivolves on the printed yellow Lv.4 route for the same 4 memory", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-043", as: "sociamon" }],
          hand: [{ card: CARD_ID, as: "comet" }],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("sociamon").instanceId);
    await s.ready();
    s.state.memory = 10;
    const sociamonInstanceId = s.inst("sociamon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("sociamon").permanentId,
        instanceId: s.inst("comet").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("sociamon").linked.length === 1);

    expect(s.state.memory).toBe(6);
    expect(s.perm("sociamon").topCard!.cardId).toBe(CARD_ID);
    expect(s.perm("sociamon").linked.map((card) => card.instanceId)).toEqual([sociamonInstanceId]);
    expect(s.perm("sociamon").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-013"]);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("refuses an illegal digivolution source (a red Lv.3 meets neither printed requirement)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-009", as: "gatchmon" }],
        hand: [{ card: CARD_ID, as: "comet" }],
        deck: ["BT1-013"],
      },
    });
    await s.ready();
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gatchmon").permanentId,
        instanceId: s.inst("comet").instanceId,
      }).ok,
    ).toBe(false);
    expect(s.perm("gatchmon").topCard!.cardId).toBe("BT21-009");
    expect(s.state.memory).toBe(10);
  });

  it("[App Fusion] [Warpmon] & [Weatherdramon]: Cost 0 through the public appFusion intent", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-029", as: "warpmon", linked: [{ card: "EX10-014", as: "weatherdramon" }] }],
          hand: [{ card: CARD_ID, as: "comet" }],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("weatherdramon").instanceId);
    await s.ready();
    s.state.memory = 0;
    const warpmonInstanceId = s.inst("warpmon").instanceId;
    const weatherInstanceId = s.inst("weatherdramon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "appFusion",
        permanentId: s.perm("warpmon").permanentId,
        instanceId: s.inst("comet").instanceId,
        linkedInstanceId: weatherInstanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("warpmon").topCard?.cardId === CARD_ID);
    await settle(() => s.perm("warpmon").linked.length === 1);

    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "digivolved", mechanic: "appFusion", cardId: CARD_ID }),
    );
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-013"]);
    expect(s.perm("warpmon").linked.map((card) => card.instanceId)).toEqual([weatherInstanceId]);
    expect(s.perm("warpmon").stack.map((card) => card.instanceId)).toEqual([warpmonInstanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("＜Collision＞ forces the opponent to block, the LINK replacement saves it, and the trash gives -8000 for the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "comet", dp: 1000, linked: [{ card: CARD_ID, as: "linkComet" }] }],
          hand: ["BT1-013"],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-010"],
          security: ["BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "victim", dp: 20_000 }],
          hand: ["BT1-013"],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-010"],
          security: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).hasKeyword(s.perm("comet"), "Collision")).toBe(true);
    const cometPermanentId = s.perm("comet").permanentId;
    const victimPermanentId = s.perm("victim").permanentId;

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: cometPermanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.events.find((event) => event.kind === "blockWindowOpened")).toMatchObject({
      mustBlock: true,
      eligibleBlockerIds: [victimPermanentId],
    });
    expect(s.engine.applyIntent(1, { type: "declineBlock" }).ok).toBe(false);
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: victimPermanentId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.map((p) => p.permanentId)).toContain(cometPermanentId);
    expect(s.perm("comet").linked).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("linkComet").instanceId]);
    expect(s.perm("victim").currentDP).toBe(12_000);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("victim").currentDP).toBe(20_000);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q5088: a link card trashed by the over-limit replace rule does not fire the -8000 watcher", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-029", as: "warpmon", linked: [{ card: LINKABLE_LV4, as: "existing" }] }],
          hand: [
            { card: CARD_ID, as: "comet" },
            { card: LINKABLE_LV3, as: "newLink" },
          ],
          deck: ["BT1-013", "BT1-014"],
        },
        1: { battleArea: [{ card: "BT1-013", as: "victim", dp: 20_000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("newLink").instanceId);
    await s.ready();
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("warpmon").permanentId,
        instanceId: s.inst("comet").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("existing").instanceId));
    await settle(() => false, 40);

    expect(s.perm("warpmon").linked.map((card) => card.instanceId)).toEqual([s.inst("newLink").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("existing").instanceId]);
    expect(s.perm("victim").currentDP).toBe(20_000);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q5089/Q5086: the link replacement pays with another of the host's link cards, then with itself, once per turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT21-101",
              as: "host",
              dp: 1000,
              linked: [
                { card: CARD_ID, as: "comet" },
                { card: LINKABLE_LV4, as: "other" },
              ],
            },
          ],
          hand: ["BT1-013"],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-010"],
          security: ["BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "attackerA", dp: 20_000 },
            { card: "BT1-013", as: "attackerB", dp: 20_000 },
          ],
          hand: ["BT1-013"],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-010"],
          security: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("other").instanceId);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const hostPermanentId = s.perm("host").permanentId;
    expect(s.perm("host").linked).toHaveLength(2);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerA").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: hostPermanentId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.map((p) => p.permanentId)).toContain(hostPermanentId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("other").instanceId]);
    expect(s.perm("host").linked.map((card) => card.instanceId)).toEqual([s.inst("comet").instanceId]);
    expect(s.perm("host").isSuspended).toBe(true);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerB").permanentId,
        target: { kind: "permanent", permanentId: hostPermanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    await settle(() => false, 40);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("other").instanceId, s.inst("comet").instanceId]),
    );
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[Once Per Turn] resets: the link replacement saves the host again on the next turn, paying with Cometmon itself", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT21-101",
              as: "host",
              dp: 1000,
              linked: [
                { card: CARD_ID, as: "comet" },
                { card: LINKABLE_LV4, as: "other" },
              ],
            },
          ],
          hand: ["BT1-013"],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-010", "BT1-012"],
          security: ["BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "attackerA", dp: 20_000 },
            { card: "BT1-013", as: "attackerB", dp: 20_000 },
          ],
          hand: ["BT1-013"],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-010", "BT1-012"],
          security: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("other").instanceId);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const hostPermanentId = s.perm("host").permanentId;

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerA").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: hostPermanentId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.map((p) => p.permanentId)).toContain(hostPermanentId);
    expect(s.perm("host").linked.map((card) => card.instanceId)).toEqual([s.inst("comet").instanceId]);

    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    const blocksBefore = s.events.filter((event) => event.kind === "blocked").length;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerB").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: hostPermanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.filter((event) => event.kind === "blocked").length > blocksBefore);
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.map((p) => p.permanentId)).toContain(hostPermanentId);
    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("other").instanceId, s.inst("comet").instanceId]),
    );
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("grants no would-leave replacement while Cometmon is a digivolution card instead of a link card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT21-101",
              as: "host",
              dp: 1000,
              under: [{ card: CARD_ID, as: "comet" }],
              linked: [{ card: LINKABLE_LV4, as: "other" }],
            },
          ],
          hand: ["BT1-013"],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-010"],
          security: ["BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "attacker", dp: 20_000 }],
          hand: ["BT1-013"],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-010"],
          security: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const hostPermanentId = s.perm("host").permanentId;
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual([CARD_ID]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: hostPermanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    await settle(() => false, 40);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(
      ["BT21-101", LINKABLE_LV4, CARD_ID].sort(),
    );
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("may decline the replacement, in which case the host leaves and no link card is trashed for it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-029", as: "host", dp: 1000, linked: [{ card: CARD_ID, as: "comet" }] }],
          hand: ["BT1-013"],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-010"],
          security: ["BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "attacker", dp: 20_000 }],
          hand: ["BT1-013"],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-010"],
          security: ["BT1-013", "BT1-014"],
        },
      },
      { autoDeclineOptional: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const hostPermanentId = s.perm("host").permanentId;
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: hostPermanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["EX10-029", CARD_ID]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
