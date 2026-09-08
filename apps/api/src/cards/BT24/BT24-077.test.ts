import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_077 } from "./BT24-077.js";
import "../index.js";

describe("BT24-077 Revivemon", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("BT24-077")).toMatchObject({
      cardId: "BT24-077",
      nameEn: "Revivemon",
      colors: ["Purple", "Red"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 9,
      dp: 9000,
      forms: ["Ult.", "Appmon"],
      attributes: ["System"],
      types: ["Restoration"],
      evoCosts: [
        { color: "Purple", level: 4, memoryCost: 4 },
        { color: "Red", level: 4, memoryCost: 4 },
      ],
    });
  });

  it("links level 4 or lower cards from trash/stack and revives an Appmon on deletion", () => {
    for (const trigger of ["WhenDigivolving", "OnDeletion"]) {
      expect(BT24_077.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({
        kind: "Link",
        from: ["trash", "digivolutionCards"],
        recipient: { filter: { controller: "mine", kind: ["Digimon"] } },
        payCost: false,
        target: { filter: { levelComparison: { op: "lte", value: 4 }, hostFilter: { isSelfRef: true } } },
      });
    }
    const revival = BT24_077.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0];
    expect(
      BT24_077.effects?.find(
        (entry) => entry.trigger === "OnDeletion" && entry.actions?.[0]?.kind === "PlayWithoutCost",
      )?.actions?.[0],
    ).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      target: {
        filter: { levelComparison: { op: "lte", value: 4 }, nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] },
      },
    });
    expect(revival?.kind).toBe("Link");
  });

  it("implements its cost-3 Appmon link and linked lowest-DP deletion", () => {
    expect(BT24_077.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 3 }]);
    expect(BT24_077.effects.find((effect) => effect.isLinked)).toMatchObject({
      trigger: "WhenLinking",
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestDP" }, count: 1 },
        },
      ],
    });
  });

  it("public play pays 9 and enters with Blocker", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT24-077", as: "revivemon" }] } });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("revivemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("revivemon"), "Blocker"));

    expect(s.state.memory).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("revivemon"), "Blocker")).toBe(true);
  });

  it.each([
    ["normal purple level-4 requirement", "BT24-070"],
    ["normal red level-4 requirement", "BT1-014"],
  ])("uses the %s for cost 4 and resolves its free link", async (_label, baseCard) => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: baseCard, as: "base" },
            { card: "BT21-009", as: "recipient" },
          ],
          hand: [{ card: "BT24-077", as: "revivemon" }],
          trash: [{ card: "BT24-036", as: "link" }],
          deck: [{ card: "BT1-016", as: "bonusDraw" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("recipient").topCard.instanceId, s.inst("link").instanceId);
    s.state.memory = 6;
    await s.ready();
    const baseTopId = s.perm("base").topCard.instanceId;
    const evolvedId = s.inst("revivemon").instanceId;
    const linkId = s.inst("link").instanceId;
    const drawId = s.inst("bonusDraw").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("revivemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("recipient").linked.some((card) => card.instanceId === s.inst("link").instanceId));

    expect(s.state.memory).toBe(2);
    expect(s.perm("base").topCard.instanceId).toBe(evolvedId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseTopId]);
    expect(s.perm("recipient").linked.map((card) => card.instanceId)).toContain(linkId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(drawId);
  });

  it.each([
    ["Raidramon linked with Dezipmon", "BT24-071", "BT24-056"],
    ["Dezipmon linked with Raidramon", "BT24-056", "BT24-071"],
  ])("App Fuses from %s linked pair for cost 0", async (_label, hostCard, linkCard) => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-087", as: "rei" },
            { card: hostCard, as: "host" },
          ],
          hand: [
            { card: linkCard, as: "link" },
            { card: "BT1-009", as: "reiDiscard" },
          ],
          deck: [
            { card: "BT1-010", as: "reiDraw" },
            { card: "BT1-011", as: "fusionBonusDraw" },
          ],
          trash: [{ card: "BT24-077", as: "fusion" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("host").topCard.instanceId, s.inst("fusion").instanceId);
    s.state.memory = 5;
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const hostTopId = s.perm("host").topCard.instanceId;
    const linkId = s.inst("link").instanceId;
    const fusionId = s.inst("fusion").instanceId;
    const reiDrawId = s.inst("reiDraw").instanceId;
    const fusionBonusDrawId = s.inst("fusionBonusDraw").instanceId;
    const reiDiscardId = s.inst("reiDiscard").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const drawDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: drawDecision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const fusionDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: fusionDecision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const revivemonDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: revivemonDecision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === fusionId);
    await settle(() => observe(s.engine).hasKeyword(s.perm("host"), "Blocker"));

    expect(s.state.memory).toBe(3);
    expect(s.perm("host").permanentId).toBe(hostId);
    expect(s.perm("host").topCard.instanceId).toBe(fusionId);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([hostTopId, linkId]);
    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(reiDrawId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(fusionBonusDrawId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(reiDiscardId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(fusionId);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
  });

  it("free-links an eligible level 4 from trash to a chosen friendly Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-077", as: "revivemon" },
            { card: "BT21-009", as: "recipient" },
          ],
          trash: [
            { card: "BT24-035", as: "noLink" },
            { card: "BT24-036", as: "eligible" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("recipient").topCard.instanceId, s.inst("noLink").instanceId, s.inst("eligible").instanceId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("revivemon"));
    await settle(() => s.perm("recipient").linked.some((card) => card.instanceId === s.inst("eligible").instanceId));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("noLink").instanceId);
  });

  it("public evolution free-links only Revivemon's own source and leaves a neighboring stack unchanged", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-071", as: "base" },
            { card: "BT21-009", as: "recipient" },
            { card: "BT24-077", as: "other", under: [{ card: "BT24-071", as: "otherSource" }] },
          ],
          hand: [{ card: "BT24-077", as: "revivemon" }],
          deck: [{ card: "BT1-016", as: "bonusDraw" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("recipient").topCard.instanceId, s.inst("otherSource").instanceId);
    const sourceId = s.perm("base").topCard.instanceId;
    const neighborStackIds = s.perm("other").stack.map((card) => card.instanceId);
    const evolvedId = s.inst("revivemon").instanceId;
    const drawId = s.inst("bonusDraw").instanceId;
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: evolvedId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.linked.some((card) => card.instanceId === sourceId)),
    );

    expect(s.state.memory).toBe(2);
    expect(s.perm("base").topCard.instanceId).toBe(evolvedId);
    expect(s.perm("base").stack).toHaveLength(0);
    expect(s.perm("recipient").linked.map((card) => card.instanceId)).toContain(sourceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(sourceId);
    expect(s.perm("other").stack.map((card) => card.instanceId)).toEqual(neighborStackIds);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(drawId);
  });

  it("public evolution refusal retains an eligible link card and leaves the recipient empty", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-014", as: "base" },
            { card: "BT21-009", as: "recipient" },
          ],
          hand: [{ card: "BT24-077", as: "revivemon" }],
          trash: [{ card: "BT24-036", as: "eligible" }],
          deck: [{ card: "BT1-016", as: "bonusDraw" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const baseId = s.perm("base").permanentId;
    const baseTopId = s.perm("base").topCard.instanceId;
    const eligibleId = s.inst("eligible").instanceId;
    const drawId = s.inst("bonusDraw").instanceId;
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: baseId, instanceId: s.inst("revivemon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT24-077" && s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(2);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseTopId]);
    expect(s.perm("recipient").linked).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(eligibleId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(drawId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("public evolution with only a non-Link candidate leaves it in trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-070", as: "base" },
            { card: "BT21-009", as: "recipient" },
          ],
          hand: [{ card: "BT24-077", as: "revivemon" }],
          trash: [{ card: "BT24-035", as: "noLink" }],
          deck: [{ card: "BT1-017", as: "bonusDraw" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const baseTopId = s.perm("base").topCard.instanceId;
    const noLinkId = s.inst("noLink").instanceId;
    const drawId = s.inst("bonusDraw").instanceId;
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("revivemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT24-077" && s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(2);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseTopId]);
    expect(s.perm("recipient").linked).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(noLinkId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(drawId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("public Happy Bullet deletion resolves Revivemon's On Deletion candidates", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-077", as: "revivemon", under: [{ card: "BT24-070", as: "ownSource" }] },
            { card: "BT21-023", as: "recipient" },
          ],
          trash: [
            { card: "BT24-036", as: "link" },
            { card: "BT24-032", as: "appmon" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-020", as: "optionSource" }],
          hand: [{ card: "BT6-095", as: "option" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("link").instanceId);
    s.state.turnSeat = 1;
    s.state.memory = 7;
    await s.ready();
    const hostId = s.perm("revivemon").permanentId;
    const hostCardId = s.inst("revivemon").instanceId;
    const appmonId = s.inst("appmon").instanceId;
    const optionId = s.inst("option").instanceId;

    const optionTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === hostCardId));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === appmonId));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(hostCardId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(appmonId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(optionId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(hostId);
    expect(s.perm("recipient").linked.map((card) => card.instanceId)).toContain(s.inst("link").instanceId);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === appmonId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(1);
    await optionTurn;
  });

  it("accepts Revivemon's public Blocker interception", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-077", as: "blocker" }], security: [{ card: "BT1-013", as: "security" }] },
      1: { battleArea: [{ card: "BT1-020", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    const blockerId = s.perm("blocker").permanentId;
    const attackerId = s.perm("attacker").permanentId;
    const securityId = s.inst("security").instanceId;

    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: blockerId })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blocked"));
    await settle(() => s.events.some((event) => event.kind === "combatResolved") && !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([securityId]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toContain(blockerId);
    expect(s.perm("blocker").isSuspended).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("attacker").instanceId);
  });

  it("links for cost 3, adds 4000 DP, and deletes one Digimon tied for lowest DP", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host" }],
          hand: [{ card: "BT24-077", as: "revivemon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowA", dp: 2000 },
            { card: "BT1-010", as: "lowB", dp: 2000 },
            { card: "BT1-011", as: "high", dp: 3000 },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("lowA").topCard.instanceId);
    const lowAId = s.perm("lowA").permanentId;
    const lowBId = s.perm("lowB").permanentId;
    s.state.memory = 5;
    await s.ready();
    const hostDp = s.perm("host").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("revivemon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === s.inst("revivemon").instanceId));
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowAId));

    expect(s.state.memory).toBe(2);
    expect(s.perm("host").currentDP).toBe(hostDp + 4000);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(lowAId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(lowBId);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(false);
  });
});
