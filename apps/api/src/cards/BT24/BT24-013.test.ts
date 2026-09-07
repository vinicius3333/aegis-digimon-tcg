import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT24-013.js";
import "../index.js";

describe("BT24-013 Fugamon", () => {
  it("requires the hand-trash cost before deleting a 6000-DP-or-less opponent Digimon", () => {
    for (const trigger of ["OnPlay", "WhenAttacking"]) {
      const actions = compiled.effects.find((effect) => effect.trigger === trigger)?.actions as any[];
      expect(actions[0]).toMatchObject({
        kind: "Delete",
        optional: true,
        abortOnDecline: true,
        cost: { kind: "trash" },
      });
      expect(actions[0].target.filter.dp).toEqual({ op: "lte", value: 6000 });
    }
  });

  it("scopes inherited trash-triggered digivolution to this Demon/Titan Digimon", () => {
    const inherited = compiled.effects.find((effect) => effect.isInherited) as any;
    const action = inherited.actions[0].actions[0];
    expect(action.target).toMatchObject({ filter: { isSelfRef: true }, isSelf: true });
    expect(action.condition).toMatchObject({ kind: "selfHasTrait" });
    expect(action).toMatchObject({
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
          battleArea: [{ card: "BT24-072", as: "host", under: ["BT24-013"] }],
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
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.filter((card) => card.cardId === "BT24-013").length === 2);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "BT24-013")).toHaveLength(2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawOne").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawTwo").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("activationDraw").instanceId);
  });
});
