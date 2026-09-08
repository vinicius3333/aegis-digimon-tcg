import { EffectTiming, Zone } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT24-013.js";
import "../index.js";

describe("BT24-013 Fugamon", () => {
  it("requires the hand-trash cost before deleting a 6000-DP-or-less opponent Digimon", () => {
    for (const trigger of ["OnPlay", "WhenAttacking"]) {
      const action = compiled.effects.find((effect) => effect.trigger === trigger)?.actions?.[0];
      expect(action?.kind).toBe("Delete");
      if (action?.kind !== "Delete") throw new Error(`${trigger} action is not Delete`);
      expect(action).toMatchObject({
        kind: "Delete",
        optional: true,
        abortOnDecline: true,
        cost: { kind: "trash" },
      });
      expect(action.target.filter.dp).toEqual({ op: "lte", value: 6000 });
    }
  });

  it("scopes inherited trash-triggered digivolution to this Demon/Titan Digimon", () => {
    const inherited = compiled.effects.find((effect) => effect.isInherited);
    const watcher = inherited?.actions?.[0];
    expect(watcher?.kind).toBe("SubTrigger");
    if (watcher?.kind !== "SubTrigger") throw new Error("inherited action is not SubTrigger");
    const action = watcher.actions[0];
    expect(action?.kind).toBe("Digivolve");
    if (action?.kind !== "Digivolve") throw new Error("inherited nested action is not Digivolve");
    const nested = action;
    expect(nested.target).toMatchObject({ filter: { isSelfRef: true }, isSelf: true });
    expect(nested.condition).toMatchObject({ kind: "selfHasTrait" });
    expect(nested).toMatchObject({
      kind: "Digivolve",
      from: ["trash"],
      payCost: true,
      useAlternateCost: true,
      reduceCost: 1,
      optional: true,
    });
  });

  it("draws when this card is trashed from a hand that then has 5 cards", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT24-013", as: "fugamon" }, "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
    });
    await s.ready();

    await advance(s.engine).verb.trash([s.inst("fugamon").instanceId], 0);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
  });

  it("does not draw when this card is trashed while 6 cards remain in hand", async () => {
    const s = setupEngine({
      0: {
        hand: ["BT24-013", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        deck: ["BT1-010"],
      },
    });
    await s.ready();

    await advance(s.engine).verb.trash([s.state.players[0]!.hand[0]!.instanceId], 0);

    expect(s.state.players[0]!.hand).toHaveLength(6);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("draws from a public On Play effect that trashes Fugamon from a six-card hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-009", as: "shamanmon" },
            { card: "BT24-013", as: "fugamon" },
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
          ],
          deck: [{ card: "BT1-010", as: "drawn" }, "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shamanmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("fugamon").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
  });

  it("may trash a hand card to delete an opposing 6000-DP Digimon on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-013", as: "fugamon" }],
          hand: [{ card: "BT1-009", as: "cost" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "boundary", dp: 6000 },
            { card: "BT1-009", as: "tooLarge", dp: 7000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("fugamon"));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("tooLarge").permanentId,
    ]);
  });

  it("publicly plays Fugamon, pays its hand-trash cost, and deletes only the 6000-DP target", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-013", as: "fugamon" },
            { card: "BT1-009", as: "cost" },
          ],
          battleArea: [{ card: "BT24-009", as: "source" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "boundary", dp: 6000 },
            { card: "BT1-009", as: "tooLarge", dp: 6001 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("fugamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("tooLarge").permanentId,
    ]);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("fugamon").instanceId),
    ).toBe(true);
  });

  it("may decline the On Play hand-trash cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-013", as: "fugamon" }],
          hand: [{ card: "BT1-009", as: "cost" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 6000 }] },
      },
      { autoDeclineOptional: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("fugamon"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("trashes the paid card and deletes a 6000-DP target from a public attack intent", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-013", as: "fugamon" }], hand: [{ card: "BT1-009", as: "cost" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "target", dp: 6000 },
            { card: "BT1-009", as: "tooLarge", dp: 6001 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("fugamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.every((permanent) => permanent.permanentId === s.perm("tooLarge").permanentId),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("tooLarge").permanentId,
    ]);
  });

  it("digivolves its Titan host into Titamon from trash with cost reduced by one", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-072", as: "host", under: [{ card: "BT24-013", as: "inherited" }] }],
          hand: [{ card: "BT1-009", as: "discard" }],
          trash: [{ card: "P-209", as: "titamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).verb.trash([s.inst("discard").instanceId], 0);
    await settle(() => s.perm("host").topCard.instanceId === s.inst("titamon").instanceId);

    expect(s.perm("host").topCard.cardId).toBe("P-209");
    expect(s.state.memory).toBe(3);
  });

  it("does not retroactively open Alliance when attack-time hand trash evolves a legal Titan host (Q5582)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-072", as: "host", under: ["BT24-013", "ST16-03"] }],
          hand: [
            { card: "BT1-009", as: "drawnTrash" },
            { card: "BT1-010", as: "attackCost" },
          ],
          trash: [{ card: "P-209", as: "titamon" }],
          deck: ["BT1-011", "BT1-012", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "target", dp: 6000 }],
          security: ["BT1-013"],
          deck: ["BT1-015", "BT1-016", "BT1-017"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "P-209" && !observe(s.engine).isAttacking());

    expect(s.perm("host").topCard.cardId).toBe("P-209");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("attackCost").instanceId);
    expect(s.events.some((event) => event.kind === "alliancePrompt")).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("does not inherited-evolve an ineligible level 4 host during a public attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-026", as: "host", under: ["BT24-013"] }],
          hand: [{ card: "BT1-009", as: "attackCost" }],
          trash: [{ card: "P-209", as: "titamon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("attackCost").instanceId));
    expect(s.perm("host").topCard.cardId).toBe("BT24-026");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("titamon").instanceId);
    expect(s.state.memory).toBe(5);
  });

  it("digivolves from a level 3 Demon or TS Digimon for cost 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-009", as: "base" }],
        hand: [{ card: "BT24-013", as: "fugamon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("fugamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("fugamon").instanceId);

    expect(s.state.memory).toBe(3);
  });

  it("checks hand size separately when two Fugamon are trashed by one public effect (Q5583)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-042", as: "purpleSource" }],
          hand: [
            { card: "BT24-098", as: "option" },
            { card: "BT24-013", as: "firstFugamon" },
            { card: "BT24-013", as: "secondFugamon" },
            "BT1-009",
            "BT1-010",
            "BT1-011",
          ],
          deck: [
            { card: "BT1-012", as: "drawOne" },
            { card: "BT1-014", as: "drawTwo" },
            { card: "BT1-015", as: "activationDraw" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.filter((card) => card.cardId === "BT24-013").length === 2);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "BT24-013")).toHaveLength(2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawOne").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawTwo").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("activationDraw").instanceId);
  });

  it("publicly suppresses the inherited second trigger, then resets after the opponent turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-072", as: "host", under: ["BT24-013"] }],
          hand: [
            { card: "BT24-013", as: "play1" },
            { card: "BT24-013", as: "play2" },
            { card: "BT1-009", as: "fodder1" },
            { card: "BT1-009", as: "fodder2" },
          ],
          trash: [
            { card: "P-209", as: "firstTitamon" },
            { card: "BT24-081", as: "secondTitamon" },
          ],
          security: ["BT1-013", "BT1-013"],
          deck: [
            "BT1-014",
            "BT1-015",
            "BT1-016",
            "BT1-017",
            "BT1-018",
            "BT1-019",
            "BT1-014",
            "BT1-015",
            "BT1-016",
            "BT1-017",
            "BT1-018",
            "BT1-019",
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "target1", dp: 3000 },
            { card: "BT1-009", as: "target2", dp: 3000 },
            { card: "BT1-009", as: "target3", dp: 3000 },
          ],
          security: ["BT1-013"],
          deck: [
            "BT1-014",
            "BT1-015",
            "BT1-016",
            "BT1-017",
            "BT1-018",
            "BT1-019",
            "BT1-014",
            "BT1-015",
            "BT1-016",
            "BT1-017",
            "BT1-018",
            "BT1-019",
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("fodder1").instanceId, s.inst("fodder2").instanceId);
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const hostBaseId = s.perm("host").topCard.instanceId;
    const inheritedId = s.perm("host").stack[0]!.instanceId;
    const stackWithTop = () => [
      ...s.perm("host").stack.map((card) => card.instanceId),
      s.perm("host").topCard.instanceId,
    ];
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("play1").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("firstTitamon").instanceId);
    expect(stackWithTop()).toEqual([inheritedId, hostBaseId, s.inst("firstTitamon").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("fodder1").instanceId);
    expect(s.state.memory).toBe(4);

    preferred.splice(0, preferred.length, s.inst("fodder2").instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("play2").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.map((card) => card.instanceId).includes(s.inst("fodder2").instanceId));
    expect(s.perm("host").topCard.instanceId).toBe(s.inst("firstTitamon").instanceId);
    expect(s.state.memory).toBe(0);
    const play3 = s.give(0, Zone.Hand, { card: "BT24-013", as: "play3" });
    const fodder3 = s.give(0, Zone.Hand, { card: "BT1-009", as: "fodder3" });
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const nextOwnerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    preferred.splice(0, preferred.length, fodder3.instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: play3.instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("secondTitamon").instanceId);
    expect(stackWithTop()).toEqual([
      inheritedId,
      hostBaseId,
      s.inst("firstTitamon").instanceId,
      s.inst("secondTitamon").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(fodder3.instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("secondTitamon").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnerTurn;
  });
});
