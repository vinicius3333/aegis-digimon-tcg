import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import "../BT2/BT2-091.js";
import "../BT3/BT3-092.js";
import "./BT5-086.js";

describe("BT5-086 Omnimon", () => {
  it("has complete residual-free runtime coverage", () => {
    expect(runtimeCompiledCard("BT5-086")).toMatchObject({ coverage: "full", residual: [] });
  });

  it("unsuspends itself and gains Blitz when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-004", as: "base", suspended: true }],
          hand: [{ card: "BT5-086", as: "evolving" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("base").isSuspended && observe(s.engine).hasKeyword(s.perm("base"), "Blitz"));

    expect(s.perm("base").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("trashes a level 6 source to prevent deletion by an opponent's effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT5-086", as: "omni", under: [{ card: "AD1-004", as: "level6" }, "BT5-024"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const level6Id = s.inst("level6").instanceId;
    const omnimonPermanentId = s.perm("omni").permanentId;
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    const fx = (
      s.engine as unknown as {
        primitives: { deletePermanent(permanentIds: string[], cause: string): Promise<number> };
      }
    ).primitives;
    await fx.deletePermanent([omnimonPermanentId], "byEffect");
    await settle(() => s.state.players[0]?.trash.some((card) => card.instanceId === level6Id) === true);

    expect(s.state.players[0]?.battleArea.some((permanent) => permanent.permanentId === omnimonPermanentId)).toBe(true);
    expect(s.perm("omni").stack.some((card) => card.instanceId === level6Id)).toBe(false);
    expect(s.perm("omni").stack.map((card) => card.cardId)).toEqual(["BT5-024"]);
  });

  it("prevents opponent return-to-hand and return-to-deck effects", async () => {
    for (const destination of ["hand", "deck"] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT5-086", as: "omni", under: [{ card: "AD1-004", as: "level6" }, "BT5-024"] }],
            deck: ["BT1-010"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = 1;
      await s.engine.recomputeContinuousEffects();
      const fx = (
        s.engine as unknown as {
          primitives: {
            returnToHand(instanceIds: string[], opts?: { byEffectSeat?: number }): Promise<unknown[]>;
            returnToDeck(instanceIds: string[], opts?: { byEffectSeat?: number }): Promise<unknown[]>;
          };
        }
      ).primitives;
      const topInstanceId = s.perm("omni").topCard.instanceId;

      if (destination === "hand") {
        await fx.returnToHand([topInstanceId], { byEffectSeat: 1 });
      } else {
        await fx.returnToDeck([topInstanceId], { byEffectSeat: 1 });
      }
      await settle(() => s.perm("omni").stack.length === 1);

      expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("omni").permanentId)).toBe(true);
      expect(s.state.players[0]!.trash.some((card) => card.cardId === "AD1-004")).toBe(true);
      expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT5-086")).toBe(false);
      expect(s.state.players[0]!.deck.filter((card) => card.cardId === "BT5-086")).toHaveLength(0);
    }
  });

  it("may decline the prevention cost, allowing an opponent deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT5-086", as: "omni", under: [{ card: "AD1-004", as: "level6" }] }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    const fx = (
      s.engine as unknown as {
        primitives: { deletePermanent(permanentIds: string[], cause: string): Promise<number> };
      }
    ).primitives;

    await fx.deletePermanent([s.perm("omni").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT5-086", "AD1-004"]),
    );
  });
});

describe("BT5-086 Omnimon — KB Q&A rulings", () => {
  // Engine gap: <Blitz> is offered only after every [When Digivolving] effect has resolved, so the
  // unsuspend can never follow the Blitz attack declaration.
  it.fails("can attack with Blitz first and then unsuspend itself with the other [When Digivolving] effect (Q1356)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-004", as: "omnimon" }],
          hand: [{ card: "BT5-086", as: "evolving" }],
        },
        1: { security: ["BT1-010", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("omnimon").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.engine.hasAcceptedBlitzAttack(s.perm("omnimon").permanentId));
    expect(s.state.memory).toBe(-1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("omnimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1 && !observe(s.engine).isAttacking());

    expect(observe(s.engine).hasAttackedThisTurn(s.perm("omnimon"))).toBe(true);
    expect(s.perm("omnimon").isSuspended).toBe(false);
  });

  it('does not trigger "When another Digimon is deleted" effects when its [All Turns] effect keeps it in play (Q1357)', async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT2-009", { card: "BT3-092", as: "maloMyotismon" }],
          hand: [{ card: "BT2-091", as: "volcanicFlare" }],
        },
        1: {
          battleArea: [
            { card: "BT5-086", as: "omnimon", dp: 4000, under: [{ card: "AD1-004", as: "level6" }] },
            { card: "BT1-010", as: "bystander" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("omnimon").permanentId, s.perm("omnimon").topCard.instanceId);
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("volcanicFlare").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("level6").instanceId));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("omnimon").permanentId)).toBe(true);
    expect(s.state.memory).toBe(2);

    await advance(s.engine).verb.deletePermanent([s.perm("bystander").permanentId]);
    expect(s.state.memory).toBe(3);
  });
});
