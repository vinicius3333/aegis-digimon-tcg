import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-032.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-032", () => {
  it("plays a Puppet Digimon from hand by deleting an own Token or other Puppet", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [{ kind: "Digivolve", from: ["hand"], payCost: false, cost: { kind: "deleteOwn" } }],
      });
  });

  it("does not offer a hand Puppet as the delete-own cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-032", as: "source" }],
          hand: ["EX9-024", "EX9-033"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle();
    expect(s.perm("source").topCard.cardId).toBe("EX9-032");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX9-024", "EX9-033"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });
  it("inherits once-per-turn leaving-play prevention with the same deletion cost", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanYourEffect",
          cost: { kind: "deleteOwn" },
        },
      ],
    }));

  it("deletes the supporting Puppet and digivolves from hand without paying its cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-032", as: "source" },
            { card: "EX9-024", as: "cost" },
          ],
          hand: ["EX9-033"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.perm("source").topCard?.cardId === "EX9-033");
    expect(s.perm("source").topCard?.cardId).toBe("EX9-033");
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) =>
          permanent.topCard?.cardId === "EX9-033" && permanent.permanentId !== s.perm("source").permanentId,
      ),
    ).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX9-024")).toBe(true);
  });

  it("accepts an own Token in the printed delete-own cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-032", as: "source" },
            { card: "TOKEN-Diaboromon", as: "token" },
          ],
          hand: ["EX9-033"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.perm("source").topCard?.cardId === "EX9-033");
    expect(s.perm("source").topCard.cardId).toBe("EX9-033");
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "TOKEN-Diaboromon")).toBe(false);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).not.toContain("TOKEN-Diaboromon");
  });

  it.each(["EX9-024", "TOKEN-Diaboromon"] as const)(
    "prevents a legal battle leave after EX9-032 is inherited, paying a battlefield %s",
    async (payment) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "EX9-027", as: "base" },
              { card: payment, as: "payment" },
            ],
            hand: [
              { card: "EX9-032", as: "source" },
              { card: "BT3-089", as: "next" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
      );
      s.state.memory = 10;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("source").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "EX9-032");
      const next = s.inst("next");
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: next.instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "BT3-089");
      const hostId = s.perm("base").permanentId;
      expect(await advance(s.engine).verb.deletePermanent([hostId], "byBattle")).toBe(0);
      await settle();
      expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === hostId)).toBe(true);
      expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === payment)).toBe(false);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it("does not prevent a battle leave when the inherited cost is refused, and cannot prevent twice", async () => {
    const make = (autoAcceptOptional: boolean) =>
      setupEngine(
        {
          0: {
            battleArea: [
              { card: "EX9-027", as: "base" },
              { card: "EX9-024", as: "payment" },
              { card: "EX9-024", as: "payment2" },
            ],
            hand: [
              { card: "EX9-032", as: "source" },
              { card: "BT3-089", as: "next" },
            ],
          },
        },
        {
          autoAcceptOptional,
          autoDeclineOptional: !autoAcceptOptional,
          autoSelectCards: true,
          autoOrderTriggers: true,
        },
      );

    const refused = make(false);
    refused.state.memory = 10;
    expect(
      refused.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: refused.perm("base").permanentId,
        instanceId: refused.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => refused.perm("base").topCard.cardId === "EX9-032");
    const refusedNext = refused.inst("next");
    expect(
      refused.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: refused.perm("base").permanentId,
        instanceId: refusedNext.instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => refused.perm("base").topCard.cardId === "BT10-083");
    const refusedHost = refused.perm("base").permanentId;
    expect(await advance(refused.engine).verb.deletePermanent([refusedHost], "byBattle")).toBe(1);
    expect(refused.state.players[0]!.battleArea).toHaveLength(2);
    expect(refused.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("EX9-024");

    const twice = make(true);
    twice.state.memory = 10;
    await twice.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: twice.perm("base").permanentId,
      instanceId: twice.inst("source").instanceId,
    });
    await settle(() => twice.perm("base").topCard.cardId === "EX9-032");
    const twiceNext = twice.inst("next");
    await twice.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: twice.perm("base").permanentId,
      instanceId: twiceNext.instanceId,
    });
    await settle(() => twice.perm("base").topCard.cardId === "BT3-089");
    const twiceHost = twice.perm("base").permanentId;
    expect(await advance(twice.engine).verb.deletePermanent([twiceHost], "byBattle")).toBe(0);
    await settle();
    expect(await advance(twice.engine).verb.deletePermanent([twiceHost], "byBattle")).toBe(1);
    expect(twice.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX9-024"]);
  });

  it("distinguishes own-effect, opponent-effect, and hand-only leave attempts", async () => {
    const prepare = async (paymentInBattle: boolean) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "EX9-027", as: "base" },
              ...(paymentInBattle ? [{ card: "EX9-024", as: "payment" }] : []),
            ],
            hand: [{ card: "EX9-032", as: "source" }, { card: "BT3-089", as: "next" }, "EX9-024"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
      );
      s.state.memory = 10;
      await s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      });
      await settle(() => s.perm("base").topCard.cardId === "EX9-032");
      await s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("next").instanceId,
      });
      await settle(() => s.perm("base").topCard.cardId === "BT3-089");
      return s;
    };

    const ownEffect = await prepare(true);
    const ownId = ownEffect.perm("base").permanentId;
    advance(ownEffect.engine).verb.enterEffectResolution(0, ["Digimon"], ownId);
    try {
      expect(await advance(ownEffect.engine).verb.deletePermanent([ownId], "byEffect")).toBe(1);
    } finally {
      advance(ownEffect.engine).verb.leaveEffectResolution();
    }
    expect(ownEffect.state.players[0]!.battleArea).toHaveLength(1);
    expect(ownEffect.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX9-024"]);

    const opponentEffect = await prepare(true);
    const opponentId = opponentEffect.perm("base").permanentId;
    advance(opponentEffect.engine).verb.enterEffectResolution(1, ["Digimon"]);
    try {
      expect(await advance(opponentEffect.engine).verb.deletePermanent([opponentId], "byEffect")).toBe(0);
    } finally {
      advance(opponentEffect.engine).verb.leaveEffectResolution();
    }
    expect(opponentEffect.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([opponentId]);
    expect(opponentEffect.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["EX9-024"]);

    const handOnly = await prepare(false);
    const handOnlyId = handOnly.perm("base").permanentId;
    advance(handOnly.engine).verb.enterEffectResolution(1, ["Digimon"]);
    try {
      expect(await advance(handOnly.engine).verb.deletePermanent([handOnlyId], "byEffect")).toBe(1);
    } finally {
      advance(handOnly.engine).verb.leaveEffectResolution();
    }
    expect(handOnly.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("EX9-024");
  });
});
