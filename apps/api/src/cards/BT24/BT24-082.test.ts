import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_082 } from "./BT24-082.js";
import "../index.js";

describe("BT24-082 Owen Dreadnought", () => {
  it("returns itself to deck bottom and gates the chained Elizamon play", () => {
    const start = BT24_082.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase");
    const gate = start?.actions?.[0];
    expect(gate?.kind).toBe("CostGatedBlock");
    if (gate?.kind !== "CostGatedBlock") throw new Error("Start-of-Main action is not a CostGatedBlock");
    expect(gate).toMatchObject({
      kind: "CostGatedBlock",
      cost: { kind: "return", to: "deckBottom", target: { filter: { isSelfRef: true } } },
      optional: true,
      abortOnDecline: true,
    });
    expect(gate.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      target: { filter: { nameOrTrait: [{ tokens: ["Owen Dreadnought"], match: "nameExact" }] } },
      from: ["hand"],
    });
    expect(gate.actions[1]).toMatchObject({
      kind: "PlayWithoutCost",
      target: { filter: { nameOrTrait: [{ tokens: ["Elizamon"], match: "nameExact" }] } },
      from: ["trash"],
    });
    expect(gate.actions[1]).toMatchObject({ condition: { kind: "youHaveNone" } });
    const watcher = BT24_082.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0];
    expect(watcher?.kind).toBe("SubTrigger");
    if (watcher?.kind !== "SubTrigger") throw new Error("Your Turn action is not a SubTrigger");
    expect(watcher).toMatchObject({ event: "whenOneOfYoursDigivolves", cost: { kind: "suspend" } });
    expect(watcher.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "ModifyDP", amount: 3000 }),
        expect.objectContaining({ kind: "Attack" }),
      ]),
    );
  });

  it("returns itself to the deck, plays exact Owen, then plays exact Elizamon when no Digimon remains", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-082", as: "source" }],
          hand: [{ card: "BT21-081", as: "replacement" }],
          trash: [{ card: "BT24-008", as: "elizamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const sourceId = s.perm("source").permanentId;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("source"));
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("elizamon").instanceId,
      ),
    );

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(sourceId);
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("replacement").instanceId,
      ),
    ).toBe(true);
    expect(s.state.players[0]!.deck.some((card) => card.cardId === "BT24-082")).toBe(true);
  });

  it("does not bypass the return cost when no Owen is in hand (Q5663)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-082", as: "source" }],
          hand: [{ card: "BT1-009", as: "neutral" }],
          trash: [{ card: "BT24-008", as: "elizamon" }],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const sourceId = s.inst("source").instanceId;
    const elizamonId = s.inst("elizamon").instanceId;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === elizamonId));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === sourceId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === elizamonId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === elizamonId)).toBe(false);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(sourceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("does not process the Elizamon tail when the return-and-play cost is declined (Q5663)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-082", as: "source" }],
          hand: [{ card: "BT1-009", as: "neutral" }],
          trash: [{ card: "BT24-008", as: "elizamon" }],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.topCard.instanceId).toBe(s.inst("source").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("elizamon").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("Q5664: does not activate a start-of-main effect on the Owen played during that window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-082", as: "source" }],
          hand: [{ card: "BT21-081", as: "replacement" }],
        },
        1: { battleArea: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.memory).toBe(0);
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("replacement").instanceId,
      ),
    ).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("runs the Start of Your Main Phase effect through the natural turn window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-082", as: "source" }],
          hand: [{ card: "BT21-081", as: "replacement" }],
          trash: [{ card: "BT24-008", as: "elizamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("elizamon").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("elizamon").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.deck.some((card) => card.cardId === "BT24-082")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("suspends Owen to give the digivolved Reptile 3000 DP and let it attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-082", as: "owen" },
            { card: "BT1-010", as: "reptile" },
          ],
        },
        1: { security: [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const baseDp = s.perm("reptile").currentDP;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenOneOfYoursDigivolves", {
      subjectPermanentId: s.perm("reptile").permanentId,
    });
    await settle(() => observe(s.engine).hasAttackedThisTurn(s.perm("reptile")));

    expect(s.perm("owen").isSuspended).toBe(true);
    expect(s.perm("reptile").currentDP).toBe(baseDp + 3000);
    expect(observe(s.engine).hasAttackedThisTurn(s.perm("reptile"))).toBe(true);
  });

  it("triggers from a public Reptile evolution and expires the DP boost after the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-082", as: "owen" },
            { card: "BT1-010", as: "reptile" },
          ],
          hand: [{ card: "BT24-012", as: "evolved" }],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: { security: ["BT1-012"], deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    s.state.turnSeat = 0;
    const evolvedBaseDp = getCardDefinition("BT24-012")!.dp;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("reptile").permanentId,
        instanceId: s.inst("evolved").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasAttackedThisTurn(s.perm("reptile")));
    expect(s.perm("owen").isSuspended).toBe(true);
    expect(s.perm("reptile").currentDP).toBe(evolvedBaseDp + 3000);
    expect(observe(s.engine).hasAttackedThisTurn(s.perm("reptile"))).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    expect(s.perm("reptile").currentDP).toBe(evolvedBaseDp);
  });

  it("publicly declines the suspension cost and leaves the evolved Digimon unchanged", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-082", as: "owen" },
            { card: "BT1-009", as: "base" },
          ],
          hand: [{ card: "BT24-012", as: "evolved" }],
          deck: ["BT1-013", "BT1-014"],
        },
        1: { security: [{ card: "BT1-011", as: "security" }], deck: ["BT1-009", "BT1-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const baseId = s.perm("base").permanentId;
    const sourceId = s.inst("base").instanceId;
    const evolvedId = s.inst("evolved").instanceId;
    const securityId = s.inst("security").instanceId;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: baseId, instanceId: evolvedId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("base").topCard.instanceId === evolvedId && s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(3);
    expect(s.perm("owen").isSuspended).toBe(false);
    expect(s.perm("base").topCard.instanceId).toBe(evolvedId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.perm("base").currentDP).toBe(getCardDefinition("BT24-012")!.dp);
    expect(observe(s.engine).hasAttackedThisTurn(s.perm("base"))).toBe(false);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([securityId]);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([
    ["Reptile", "BT24-012"],
    ["Dragonkin", "BT24-011"],
  ] as const)("publicly plays Owen, then boosts and attacks with a %s evolution", async (_trait, evolvedCard) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "base" }],
          hand: [
            { card: "BT24-082", as: "owen" },
            { card: evolvedCard, as: "evolved" },
            { card: "BT1-013", as: "spare" },
          ],
          deck: [
            { card: "BT1-009", as: "bonusDraw" },
            { card: "BT1-010", as: "untouched" },
          ],
        },
        1: {
          security: [
            { card: "BT1-011", as: "securityOne" },
            { card: "BT1-014", as: "securityTwo" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("owen").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("owen").instanceId));
    expect(s.state.memory).toBe(7);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolved").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("evolved").instanceId);
    await settle(() => observe(s.engine).hasAttackedThisTurn(s.perm("base")));
    expect(s.state.memory).toBe(5);
    expect(s.perm("owen").isSuspended).toBe(true);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("evolved").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([s.inst("base").instanceId]);
    expect(s.perm("base").currentDP).toBe(getCardDefinition(evolvedCard)!.dp + 3000);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("securityOne").instanceId);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([s.inst("securityTwo").instanceId]);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    await settle(() => !observe(s.engine).isAttacking());
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    expect(s.perm("base").currentDP).toBe(getCardDefinition(evolvedCard)!.dp);
  });

  it("does not trigger Owen for a public non-Reptile evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "base" }],
          hand: [
            { card: "BT24-082", as: "owen" },
            { card: "BT1-014", as: "giantBird" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: { security: [{ card: "BT1-011", as: "security" }], deck: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("owen").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory === 7);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("giantBird").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("giantBird").instanceId && s.state.memory === 5);
    expect(s.perm("owen").isSuspended).toBe(false);
    expect(s.perm("base").currentDP).toBe(getCardDefinition("BT1-014")!.dp);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([s.inst("security").instanceId]);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(0);
    expect(observe(s.engine).isAttacking()).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("grants no DP and no attack when Owen cannot pay the suspension cost (Q5665)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-082", as: "owen", suspended: true },
            { card: "BT1-010", as: "reptile" },
          ],
        },
        1: { security: [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const baseDp = s.perm("reptile").currentDP;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenOneOfYoursDigivolves", {
      subjectPermanentId: s.perm("reptile").permanentId,
    });

    expect(s.perm("reptile").currentDP).toBe(baseDp);
    expect(observe(s.engine).hasAttackedThisTurn(s.perm("reptile"))).toBe(false);
  });

  it("refuses a second public evolution while Owen is already suspended (Q5665)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "firstBase" },
            { card: "BT1-009", as: "secondBase" },
          ],
          hand: [
            { card: "BT24-082", as: "owen" },
            { card: "BT24-012", as: "firstEvolved" },
            { card: "BT24-011", as: "secondEvolved" },
          ],
          deck: ["BT1-013", "BT1-014", "BT1-015"],
        },
        1: { security: [{ card: "BT1-011", as: "security" }], deck: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("owen").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory === 7);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("firstBase").permanentId,
        instanceId: s.inst("firstEvolved").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("firstBase").topCard.instanceId === s.inst("firstEvolved").instanceId && s.state.memory === 5,
    );
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("owen").isSuspended).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("secondBase").permanentId,
        instanceId: s.inst("secondEvolved").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("secondBase").topCard.instanceId === s.inst("secondEvolved").instanceId && s.state.memory === 3,
    );
    expect(s.perm("secondBase").currentDP).toBe(getCardDefinition("BT24-011")!.dp);
    expect(observe(s.engine).hasAttackedThisTurn(s.perm("secondBase"))).toBe(false);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("plays itself from security without paying the cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT24-082", as: "owen" }] } });
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("owen"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("owen").instanceId),
    );
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      s.inst("owen").instanceId,
    );
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).not.toContain(s.inst("owen").instanceId);
  });

  it("publicly plays itself from security after an opponent attack", async () => {
    const s = setupEngine(
      {
        0: {
          security: [
            { card: "BT24-082", as: "owen" },
            { card: "BT1-014", as: "remainingSecurity" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const owenId = s.inst("owen").instanceId;
    const remainingSecurityId = s.inst("remainingSecurity").instanceId;
    await s.ready();
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 1);
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(owenId);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([remainingSecurityId]);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.memory).toBe(3);
    expect(observe(s.engine).isAttacking()).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });
});
