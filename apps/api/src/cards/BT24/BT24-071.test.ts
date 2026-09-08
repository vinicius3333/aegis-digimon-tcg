import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_071 } from "./BT24-071.js";
import "../index.js";

describe("BT24-071 Raidramon", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("BT24-071")).toMatchObject({
      cardId: "BT24-071",
      nameEn: "Raidramon",
      colors: ["Purple", "Red"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 6,
      dp: 6000,
      forms: ["Sup.", "Appmon"],
      attributes: ["System"],
      types: ["Super Hacking"],
      evoCosts: [
        { color: "Purple", level: 3, memoryCost: 3 },
        { color: "Red", level: 3, memoryCost: 3 },
      ],
    });
    expect(BT24_071.appFusionRequirement).toEqual([{ names: ["Hackmon", "Protecmon", "Pipomon"], cost: 0 }]);
  });

  it("grants Security Attack +1 to one eligible trait Digimon and revives level 3 Appmon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(BT24_071.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "SecurityAttack", amount: 1 },
        duration: "forTheTurn",
        target: {
          filter: { nameOrTrait: [{ tokens: ["System", "Life", "Transmutation"], match: "trait" }] },
          count: 1,
        },
      });
    }
    expect(BT24_071.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      target: { filter: { levels: [3], nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] } },
    });
  });

  it("models its cost-2 Appmon link and linked On Deletion revival", () => {
    expect(BT24_071.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 2 }]);
    expect(BT24_071.effects.find((effect) => effect.isLinked)).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          optional: true,
          target: { filter: { levels: [3], nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] } },
        },
      ],
    });
  });

  it("public play pays 6 and grants Security Attack +1 to a Life-trait Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-038", as: "life" }],
          hand: [{ card: "BT24-071", as: "raidramon" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("raidramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).keywordAmount(s.perm("life"), "SecurityAttack") === 1);

    expect(s.state.memory).toBe(1);
  });

  it.each([
    ["System", "BT24-067"],
    ["Life", "BT24-038"],
    ["Transmutation", "BT24-079"],
  ])("publicly buffs one %s ally for the turn and expires after the owner turn", async (_label, allyCard) => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: allyCard, as: "ally", dp: 10000 },
            { card: "BT1-009", as: "nonmatching", dp: 10000 },
          ],
          hand: [{ card: "BT24-071", as: "raidramon" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          security: [
            { card: "BT1-009", as: "securityOne" },
            { card: "BT1-010", as: "securityTwo" },
            { card: "BT1-011", as: "securityThree" },
          ],
          hand: ["BT1-009"],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    await s.ready();
    preferred.push(s.perm("ally").topCard.instanceId);
    const securityOneId = s.inst("securityOne").instanceId;
    const securityTwoId = s.inst("securityTwo").instanceId;
    const securityThreeId = s.inst("securityThree").instanceId;
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("raidramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).keywordAmount(s.perm("ally"), "SecurityAttack") === 1);
    expect(observe(s.engine).keywordAmount(s.perm("nonmatching"), "SecurityAttack")).toBe(0);
    expect(observe(s.engine).keywordAmount(s.perm("raidramon"), "SecurityAttack")).toBe(0);
    expect(s.state.memory).toBe(4);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ally").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "securityChecked").length === 2 && !observe(s.engine).isAttacking(),
    );
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([securityOneId, securityTwoId]);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([securityThreeId]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
    expect(observe(s.engine).keywordAmount(s.perm("ally"), "SecurityAttack")).toBe(0);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });

  it.each([
    ["normal purple level-3 requirement", "BT24-068"],
    ["normal red level-3 requirement", "BT1-009"],
  ])("uses the %s for cost 3", async (_label, baseCard) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: baseCard, as: "base" },
            { card: "BT24-038", as: "life" },
          ],
          hand: [{ card: "BT24-071", as: "raidramon" }],
          deck: [{ card: "BT1-010", as: "evolutionDeckSentinel" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const sourceId = s.perm("base").topCard.instanceId;
    const raidramonId = s.inst("raidramon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("raidramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("raidramon").instanceId);
    await settle(() => observe(s.engine).keywordAmount(s.perm("life"), "SecurityAttack") === 1);

    expect(s.state.memory).toBe(2);
    expect(s.perm("base").topCard.instanceId).toBe(raidramonId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(
      s.inst("evolutionDeckSentinel").instanceId,
    );
  });

  it("rejects a public evolution from a non-purple, non-red level-3 source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-027", as: "base" }], hand: [{ card: "BT24-071", as: "raidramon" }] },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("raidramon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(5);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("base").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("raidramon").instanceId);
  });

  it.each([
    ["BT24-067", "BT24-053"],
    ["BT24-067", "BT24-032"],
    ["BT24-053", "BT24-067"],
    ["BT24-053", "BT24-032"],
    ["BT24-032", "BT24-067"],
    ["BT24-032", "BT24-053"],
  ])("Q5647: App Fuses from %s linked with %s", async (hostCard, linkCard) => {
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
          trash: [{ card: "BT24-071", as: "fusion" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("reiDiscard").instanceId, s.perm("host").topCard.instanceId, s.inst("fusion").instanceId);
    s.state.memory = 5;
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const hostTopId = s.perm("host").topCard.instanceId;
    const linkId = s.inst("link").instanceId;
    const fusionId = s.inst("fusion").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("fusion").instanceId);

    expect(s.state.memory).toBe(4);
    expect(s.perm("host").permanentId).toBe(hostId);
    expect(s.perm("host").topCard.instanceId).toBe(fusionId);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([hostTopId, linkId]);
    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.perm("rei").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("reiDraw").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("fusionBonusDraw").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("reiDiscard").instanceId);
  });

  it("rejects a public link from a non-Appmon source without mutation", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-067", as: "host" }], hand: [{ card: "BT1-009", as: "invalidLink" }] },
    });
    s.state.memory = 5;
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const invalidId = s.inst("invalidLink").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: invalidId,
        targetPermanentId: hostId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(5);
    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(invalidId);
  });

  it.each([EffectTiming.OnPlay, EffectTiming.WhenDigivolving])(
    "grants Security Attack +1 to an eligible Digimon on %s",
    async (timing) => {
      const s = setupEngine({ 0: { battleArea: [{ card: "BT24-071", as: "raidramon" }] } }, { autoSelectCards: true });
      await s.ready();

      await advance(s.engine).fire(timing, s.perm("raidramon"));

      expect(observe(s.engine).keywordAmount(s.perm("raidramon"), "SecurityAttack")).toBe(1);
    },
  );

  it("plays a level 3 Appmon from trash on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-071", as: "raidramon", suspended: true }],
          trash: [{ card: "BT21-009", as: "appmon" }],
          security: [{ card: "BT1-013", as: "security" }],
        },
        1: { battleArea: [{ card: "BT1-020", as: "attacker", dp: 6000 }], deck: ["BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const raidramonId = s.perm("raidramon").permanentId;
    const raidramonCardId = s.perm("raidramon").topCard.instanceId;
    const appmonId = s.state.players[0]!.trash.find((card) => card.cardId === "BT21-009")!.instanceId;
    const attackerId = s.perm("attacker").permanentId;
    const attackerCardId = s.perm("attacker").topCard.instanceId;
    const securityId = s.inst("security").instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "permanent", permanentId: raidramonId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved") && !observe(s.engine).isAttacking());
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-009"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === appmonId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(appmonId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(raidramonCardId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(attackerCardId);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([securityId]);
  });

  it("may refuse standalone revival after a public opponent attack deletes it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-071", as: "raidramon", suspended: true }],
          trash: [{ card: "BT21-009", as: "appmon" }],
        },
        1: { battleArea: [{ card: "BT1-022", as: "attacker", dp: 7000 }], deck: ["BT1-010", "BT1-011"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const raidramonId = s.perm("raidramon").permanentId;
    const raidramonCardId = s.perm("raidramon").topCard.instanceId;
    const appmonId = s.state.players[0]!.trash.find((card) => card.cardId === "BT21-009")!.instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: raidramonId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved") && !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === raidramonId)).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(appmonId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(raidramonCardId);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("attacker").permanentId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === appmonId)).toBe(false);
  });

  it("links for cost 2, adds 3000 DP, and revives a level 3 Appmon when the host is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host" }],
          hand: [{ card: "BT24-071", as: "raidramon" }],
          trash: [{ card: "BT24-032", as: "appmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const baseDp = s.perm("host").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("raidramon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === s.inst("raidramon").instanceId));

    expect(s.state.memory).toBe(1);
    expect(s.perm("host").currentDP).toBe(baseDp + 3000);

    await advance(s.engine).fire(EffectTiming.OnDeletion, s.perm("host"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("appmon").instanceId),
    );
  });

  it("cancels the linked revival when BT7-107 returns its deleted host first (Q5648)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-067", as: "host" }],
          hand: [
            { card: "BT24-071", as: "raidramon" },
            { card: "BT7-107", as: "calling" },
          ],
          trash: [{ card: "BT24-032", as: "appmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: false },
    );
    s.state.memory = 10;
    await s.ready();
    const hostCardId = s.state.players[0]!.battleArea[0]!.topCard.instanceId;
    const linkedId = s.state.players[0]!.hand.find((card) => card.cardId === "BT24-071")!.instanceId;
    const appmonId = s.state.players[0]!.trash.find((card) => card.cardId === "BT24-032")!.instanceId;
    const callingId = s.inst("calling").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("raidramon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === s.inst("raidramon").instanceId));
    expect(s.state.memory).toBe(8);
    expect(s.perm("host").currentDP).toBe(4000);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("calling").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.decisions.some(({ req }) => req.kind === "selectCards"));
    const returnDecision = [...s.decisions].reverse().find(({ req }) => req.kind === "selectCards")?.req;
    expect(returnDecision?.kind).toBe("selectCards");
    if (returnDecision?.kind !== "selectCards") throw new Error("Calling decision is not selectCards");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: returnDecision.decisionId,
        response: { kind: "selectCards", instanceIds: [hostCardId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === hostCardId));
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === callingId));

    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(hostCardId);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === hostCardId)).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(callingId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(linkedId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(appmonId);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("appmon").instanceId),
    ).toBe(false);
  });

  it("accepts linked On Deletion revival after a public battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-067", as: "host", linked: [{ card: "BT24-071", as: "raidramon" }], suspended: true },
          ],
          trash: [{ card: "BT21-009", as: "appmon" }],
          security: [{ card: "BT1-013", as: "security" }],
        },
        1: { battleArea: [{ card: "BT1-020", as: "attacker", dp: 6000 }], deck: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const hostCardId = s.perm("host").topCard.instanceId;
    const linkedId = s.inst("raidramon").instanceId;
    const appmonId = s.inst("appmon").instanceId;
    const attackerId = s.perm("attacker").permanentId;
    const securityId = s.inst("security").instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved") && !observe(s.engine).isAttacking());
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT21-009"));
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(hostCardId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(linkedId);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === appmonId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(appmonId);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === attackerId)).toBe(true);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([securityId]);
  });
});
