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
    expect(gate.actions[1].condition.kind).toBe("youHaveNone");
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
    s.state.turnSeat = 0;
    s.state.memory = 5;
    await s.ready();
    const evolvedBaseDp = getCardDefinition("BT24-012")!.dp;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("reptile").permanentId,
        instanceId: s.inst("evolved").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("reptile").topCard.instanceId === s.inst("evolved").instanceId);
    await settle(() => observe(s.engine).hasAttackedThisTurn(s.perm("reptile")));
    expect(s.perm("owen").isSuspended).toBe(true);
    expect(s.perm("reptile").currentDP).toBe(evolvedBaseDp + 3000);
    expect(observe(s.engine).hasAttackedThisTurn(s.perm("reptile"))).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    expect(s.perm("reptile").currentDP).toBe(evolvedBaseDp);
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
});
