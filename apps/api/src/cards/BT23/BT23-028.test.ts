import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-028.js";

describe("BT23-028 Coordemon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-028")).toMatchObject({
      cardId: "BT23-028",
      nameEn: "Coordemon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Yellow", level: 3, memoryCost: 2 }],
      forms: ["Sup.", "Appmon"],
      attributes: ["Entertainment"],
      types: ["Coordinate"],
      linkDp: 3000,
      linkEffect:
        "[When Linking] Until your opponent's turn ends, 1 of their Digimon can't activate [When Digivolving] effects.",
      linkRequirement: "[Link] [Appmon]\u00a0trait: Cost 2",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
  it("waits for its security battle to end, plays itself and applies its On Play DP loss", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-024", as: "target" },
            { card: "BT1-009", as: "attacker" },
          ],
        },
        1: {
          security: [{ card: "BT23-028", as: "securityCoordemon" }],
        },
      },
      { autoSelectCards: true },
    );
    const coordemonId = s.inst("securityCoordemon").instanceId;
    const attackerId = s.inst("attacker").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.battleArea.some((card) => card.topCard?.instanceId === coordemonId) &&
        s.perm("target").currentDP === 7000,
    );

    expect(s.perm("target").currentDP).toBe(7000);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === coordemonId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === coordemonId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === attackerId && card.cardId === "BT1-009")).toBe(
      true,
    );
    const battleIndex = s.events.findIndex((event) => event.kind === "securityChecked");
    const securityBattle = s.events.find((event) => event.kind === "securityChecked");
    expect(securityBattle && "battle" in securityBattle ? securityBattle.battle : undefined).toMatchObject({
      attackerDeleted: true,
      securityDigimonDeleted: false,
    });
    const movedIndex = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.instanceIds.includes(coordemonId),
    );
    expect(battleIndex).toBeGreaterThanOrEqual(0);
    expect(movedIndex).toBeGreaterThan(battleIndex);
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("still plays itself at the end of a security battle it lost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-045", as: "dpTarget", dp: 20_000 },
            { card: "BT1-024", as: "attacker" },
          ],
        },
        1: {
          security: [{ card: "BT23-028", as: "securityCoordemon" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const coordemonId = s.inst("securityCoordemon").instanceId;
    const dpTargetBase = s.perm("dpTarget").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    // 10000 DP beats the 4000 DP security Digimon, so Coordemon is trashed by the battle and
    // the deferred security clause still plays it from there, with its [On Play] attached.
    const securityBattle = s.events.find((event) => event.kind === "securityChecked");
    expect(securityBattle && "battle" in securityBattle ? securityBattle.battle : undefined).toMatchObject({
      attackerDeleted: false,
      securityDigimonDeleted: true,
    });
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === coordemonId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === coordemonId)).toBe(false);
    expect(s.perm("dpTarget").currentDP).toBe(dpTargetBase - 3000);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("links for 2, contributes 3000 DP and restricts an opposing Digimon when linking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host" }],
          hand: [{ card: "BT23-028", as: "linker" }],
        },
        1: { battleArea: [{ card: "BT1-024", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    const linkerId = s.inst("linker").instanceId;
    const baseDp = s.perm("host").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: linkerId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving"));

    expect(s.state.memory).toBe(3);
    expect(s.perm("host").currentDP).toBe(baseDp + 3000);
    expect(s.perm("host").linked.map((card) => card.instanceId)).toEqual([linkerId]);
  });

  it("plays itself at the end of the battle when revealed from security", () => {
    const security = compiled.effects.find((entry) => entry.trigger === "Security");
    expect(security).toMatchObject({
      timing: "endOfBattle",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityBattleEnded",
          once: true,
          actions: [
            {
              kind: "PlayWithoutCost",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              from: ["trash"],
              payCost: false,
            },
          ],
        },
      ],
    });
  });

  it("reduces one opposing Digimon by 3000 on play and when digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = compiled.effects.find((entry) => entry.trigger === trigger)?.actions[0];
      expect(action).toMatchObject({
        kind: "ModifyDP",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        amount: -3000,
        duration: "forTheTurn",
      });
    }
  });

  it("publicly applies mandatory On Play -3000 to exactly one opposing Digimon for this turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT23-028", as: "coordemon" },
            { card: "ST1-02", as: "ownControl" },
          ],
          battleArea: [{ card: "BT1-009", as: "ownBoard", dp: 5000 }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowOpponent", dp: 3000 },
            { card: "BT1-010", as: "highOpponent", dp: 4000 },
          ],
          hand: [{ card: "ST1-02", as: "opponentControl" }],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    const ownBaseDp = s.perm("ownBoard").currentDP;
    const highBaseDp = s.perm("highOpponent").currentDP;
    const coordemonId = s.inst("coordemon").instanceId;
    const lowId = s.perm("lowOpponent").permanentId;
    const lowCardId = s.perm("lowOpponent").topCard!.instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: coordemonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === coordemonId));
    expect(s.perm("ownBoard").currentDP).toBe(ownBaseDp);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === lowId)).toBe(false);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === lowCardId && card.cardId === "BT1-009")).toBe(
      true,
    );
    expect(s.perm("highOpponent").currentDP).toBe(highBaseDp);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("reduces exactly 4000 DP to 1000 and expires on the actual current-turn boundary", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT23-028", as: "coordemon" },
            { card: "ST1-02", as: "ownNeutral" },
          ],
          security: ["ST1-02", "ST1-02"],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "target", dp: 4000 }],
          hand: [{ card: "ST1-02", as: "neutral" }],
          security: ["ST1-02", "ST1-02"],
          deck: ["BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const targetId = s.perm("target").permanentId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("coordemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 1000);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === targetId)).toBe(true);
    expect(s.perm("target").currentDP).toBe(1000);
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("coordemon").instanceId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("coordemon").instanceId)).toBe(
      true,
    );
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("target").permanentId).toBe(targetId);
    expect(s.perm("target").currentDP).toBe(4000);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("publicly digivolves from a legal yellow level 3, draws, and applies the DP tail", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-047", as: "base" }],
          hand: [{ card: "BT23-028", as: "coordemon" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-024", as: "target", dp: 7000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    const drawnInstanceId = s.state.players[0]!.deck[0]!.instanceId;
    const baseId = s.perm("base").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("coordemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT23-028" && s.perm("target").currentDP === 4000);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(drawnInstanceId);
    expect(s.perm("base").topCard?.cardId).toBe("BT23-028");
    expect(s.perm("base").stack.map((card) => card.instanceId)).toContain(baseId);
    expect(s.perm("target").currentDP).toBe(4000);
  });

  it("carries the Appmon link requirement and linked timing restriction", () => {
    expect(compiled.linkRequirement).toEqual([{ cost: 2, traits: ["Appmon"] }]);
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
              restriction: "cannotActivateWhenDigivolving",
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
      ],
    });
  });

  it("publicly suppresses an opponent When Digivolving effect after linking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host" }],
          hand: [
            { card: "BT23-028", as: "coordemon" },
            { card: "ST1-02", as: "neutral" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-047", as: "opponentBase" }],
          hand: [
            { card: "BT23-028", as: "opponentEvo" },
            { card: "ST1-02", as: "opponentNeutral" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const hostBaseDp = s.perm("host").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("coordemon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("opponentBase"), "cannotActivateWhenDigivolving"));
    const hostLinkedDp = s.perm("host").currentDP;
    expect(hostLinkedDp).toBe(hostBaseDp + 3000);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("opponentBase").permanentId,
        instanceId: s.inst("opponentEvo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponentBase").topCard?.cardId === "BT23-028");
    expect(s.perm("host").currentDP).toBe(hostLinkedDp);
    await s.engine.applyIntent(1, { type: "surrender" });
    await loop;
  });

  it.each([
    [true, "linked suppression"],
    [false, "unsuppressed control"],
  ])("%s: external Diaboromon reactivation follows the When Digivolving restriction", async (linked) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host" }],
          hand: [...(linked ? [{ card: "BT23-028", as: "coordemon" }] : []), { card: "ST1-02", as: "played" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "EX6-043", as: "diaboromon" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const linkResult = linked
      ? s.engine.applyIntent(0, {
          type: "linkCard",
          instanceId: s.inst("coordemon").instanceId,
          targetPermanentId: s.perm("host").permanentId,
        })
      : undefined;
    expect(linkResult).toEqual(linked ? { ok: true } : undefined);
    if (linked)
      await settle(() => observe(s.engine).isRestricted(s.perm("diaboromon"), "cannotActivateWhenDigivolving"));
    expect(observe(s.engine).isRestricted(s.perm("diaboromon"), "cannotActivateWhenDigivolving")).toBe(linked);
    const tokensBeforePlay = s.state.players[1]!.battleArea.filter(
      (perm) => perm.topCard?.cardId === "TOKEN-Diaboromon",
    );
    expect(tokensBeforePlay).toHaveLength(0);
    const playedId = s.inst("played").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: playedId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === playedId));
    const tokenCount = s.state.players[1]!.battleArea.filter(
      (perm) => perm.topCard?.cardId === "TOKEN-Diaboromon",
    ).length;
    expect(tokenCount).toBe(linked ? 0 : 1);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === playedId)).toBe(true);
  });

  it("suppresses When Digivolving without consuming the later shared When Attacking link", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host" }],
          hand: [
            { card: "BT23-028", as: "coordemon" },
            { card: "ST1-02", as: "neutral" },
          ],
          security: ["ST1-02", "ST1-02", "ST1-02"],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT23-016", as: "base" }],
          hand: [
            { card: "BT23-021", as: "evo" },
            { card: "BT23-007", as: "link" },
            { card: "ST1-02", as: "neutralOpponent" },
          ],
          security: ["ST1-02", "ST1-02", "ST1-02"],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("coordemon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("base"), "cannotActivateWhenDigivolving"));
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    const evolvedSourceId = s.perm("base").topCard!.instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.instanceId === s.inst("evo").instanceId);
    expect(s.perm("base").topCard?.cardId).toBe("BT23-021");
    expect(s.perm("base").stack).toContainEqual(
      expect.objectContaining({ instanceId: evolvedSourceId, cardId: "BT23-016" }),
    );
    expect(s.perm("base").linked).toHaveLength(0);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("link").instanceId);
    expect(observe(s.engine).isRestricted(s.perm("base"), "cannotActivateWhenDigivolving")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").linked.some((card) => card.instanceId === s.inst("link").instanceId));
    expect(s.perm("base").linked.map((card) => card.instanceId)).toEqual([s.inst("link").instanceId]);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("link").instanceId);
    expect(observe(s.engine).isRestricted(s.perm("base"), "cannotActivateWhenDigivolving")).toBe(true);
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it.each([
    [true, "restricted"],
    [false, "control"],
  ])("%s: restricted TigerVespamon cannot process its mandatory by-placement", async (restricted) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-009", as: "host", dp: 13000 },
            { card: "BT1-009", as: "target" },
          ],
          hand: [...(restricted ? [{ card: "BT23-028", as: "coordemon" }] : []), { card: "ST1-02", as: "neutral" }],
          security: ["ST1-02", "ST1-02", "ST1-02"],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT23-044", as: "base" }],
          hand: [
            { card: "BT23-045", as: "tiger" },
            { card: "BT18-044", as: "royalSource" },
            { card: "ST1-02", as: "neutralOpponent" },
          ],
          security: ["ST1-02", "ST1-02", "ST1-02"],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const linkResult = restricted
      ? s.engine.applyIntent(0, {
          type: "linkCard",
          instanceId: s.inst("coordemon").instanceId,
          targetPermanentId: s.perm("host").permanentId,
        })
      : undefined;
    expect(linkResult).toEqual(restricted ? { ok: true } : undefined);
    if (restricted) await settle(() => observe(s.engine).isRestricted(s.perm("base"), "cannotActivateWhenDigivolving"));
    expect(observe(s.engine).isRestricted(s.perm("base"), "cannotActivateWhenDigivolving")).toBe(restricted);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    const royalSourceId = s.inst("royalSource").instanceId;
    const targetId = s.perm("target").permanentId;
    const targetCardId = s.perm("target").topCard!.instanceId;
    const securityBefore = s.state.players[1]!.security.map((card) => card.instanceId);
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("tiger").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT23-045");
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === royalSourceId)).toBe(restricted);
    expect(s.state.players[1]!.security.some((card) => card.instanceId === royalSourceId && card.faceUp === true)).toBe(
      !restricted,
    );
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual(
      restricted ? securityBefore : [...securityBefore, royalSourceId],
    );
    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === targetId)).toBe(restricted);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === targetCardId)).toBe(!restricted);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("expires the linked When Digivolving restriction at opponent turn end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host" }],
          hand: [
            { card: "BT23-028", as: "coordemon" },
            { card: "ST1-02", as: "neutral" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-047", as: "target" }],
          hand: [{ card: "ST1-02", as: "neutralOpponent" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("coordemon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving"));
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving")).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("rejects Link onto a non-Appmon without spending memory or moving Coordemon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host" }], hand: [{ card: "BT23-028", as: "coordemon" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("coordemon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: false, reason: "link-requirement-unmet" });
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("coordemon").instanceId);
  });
});
