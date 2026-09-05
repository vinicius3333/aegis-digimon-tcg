import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX9-052.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-052", () => {
  it("rejects a non-Ver.5 evolution without processing the placement cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-052", as: "source" }],
          trash: ["EX9-010", "EX9-015", "EX9-058"],
          hand: ["BT10-064"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("source"));
    await settle();
    expect(s.perm("source").topCard.cardId).toBe("EX9-052");
    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["EX9-010", "EX9-015", "EX9-058"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT10-064"]);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not activate twice after Security restores the same Raremon", async () => {
    const options = { autoSelectCards: true, autoChooseOption: true };
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-052", as: "source" },
            { card: "BT1-009", as: "decoy" },
          ],
          trash: ["EX9-010", "EX9-015", "EX9-058", "EX9-010", "EX9-015", "EX9-058"],
          hand: ["EX9-043"],
          deck: ["BT1-010", "BT1-048"],
        },
        1: { security: ["BT8-104"] },
      },
      options,
    );
    s.state.memory = 5;
    await s.ready();
    const originalId = s.perm("source").topCard.instanceId;
    const activation = advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("source"));
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "EX9-043" && s.state.pendingDecision?.kind === "optional");
    // Keep the remaining three payment cards in trash by declining MetalTyrannomon's separate cost.
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await activation;
    await settle();
    expect(s.state.memory).toBe(1);
    expect(s.perm("source").stack).toHaveLength(4);
    options.autoSelectCards = false;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("source").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("source").topCard.cardId === "EX9-052" && s.state.pendingDecision?.kind === "chooseTargets",
    );
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("decoy").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("source").topCard.instanceId).toBe(originalId);
    expect(s.state.players[1]!.security).toHaveLength(0);
    const sourceIds = s.perm("source").stack.map(({ instanceId }) => instanceId);
    const trashIds = s.state.players[0]!.trash.map(({ instanceId }) => instanceId);
    expect(sourceIds).toHaveLength(3);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["EX9-010", "EX9-015", "EX9-058", "EX9-043"]),
    );
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("source"));
    await settle();
    expect(s.perm("source").topCard.instanceId).toBe(originalId);
    expect(s.perm("source").stack.map(({ instanceId }) => instanceId)).toEqual(sourceIds);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(trashIds);
    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it.each(["EX9-007", "BT1-009"])("accepts an off-color level-3 base only with DM: %s", async (base) => {
    const s = setupEngine({
      0: { battleArea: [{ card: base, as: "host" }], hand: [{ card: "EX9-052", as: "evo" }], deck: ["BT1-010"] },
    });
    s.state.memory = 5;
    await s.ready();
    const eligible = base === "EX9-007";
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
        useAlternateCost: true,
      }).ok,
    ).toBe(eligible);
    await settle();
    expect(s.perm("host").topCard.cardId).toBe(eligible ? "EX9-052" : base);
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(eligible ? [base] : []);
    expect(s.state.memory).toBe(eligible ? 3 : 5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("cannot complete a two-card payment with another trait or the opponent's trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-052", as: "source" }],
          trash: ["EX9-010", "EX9-015", "EX9-023"],
          hand: ["EX9-043"],
        },
        1: { trash: ["EX9-058"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("source"));
    await settle();
    expect(s.perm("source").topCard.cardId).toBe("EX9-052");
    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["EX9-010", "EX9-015", "EX9-023"]);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["EX9-058"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX9-043"]);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it("once per turn digivolves at end of turn by placing three Ver.5 Digimon from trash underneath", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Digivolve",
          from: ["hand", "trash"],
          into: { nameOrTrait: [{ tokens: ["Ver.5"], match: "trait" }] },
          cost: { kind: "place", target: { count: 3 }, faceDown: true, destination: "digivolutionStack" },
        },
      ],
    }));
  it("requires exactly three Ver.5 cards for optional face-down bottom placement", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")?.actions[0]).toMatchObject({
      optional: true,
      abortOnDecline: true,
      cost: {
        kind: "place",
        target: {
          count: 3,
          from: ["trash"],
          filter: { zone: "trash", nameOrTrait: [{ tokens: ["Ver.5"], match: "trait" }] },
        },
        destination: "digivolutionStack",
        position: "bottom",
        host: "self",
        faceDown: true,
      },
    }));
  it("inherits de-digivolve one on deletion", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "DeDigivolve", amount: 1 }],
    }));
  it.each(["hand", "trash"] as const)(
    "places three Ver.5 cards at real turn end and pays evolution from %s",
    async (zone) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "EX9-052", as: "source", under: ["EX9-046"] }],
            trash: ["EX9-010", "EX9-015", "EX9-058", ...(zone === "trash" ? ["EX9-043"] : [])],
            hand: zone === "hand" ? ["EX9-043"] : [],
            deck: ["BT1-009", "BT1-048"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
      );
      s.state.memory = 4;

      await advance(s.engine).runTurn(0);
      await settle();

      const stack = s.perm("source").stack;
      expect(
        stack
          .slice(0, 3)
          .map((card) => card.cardId)
          .sort(),
      ).toEqual(["EX9-010", "EX9-015", "EX9-058"]);
      expect(stack.slice(0, 3).every((card) => card.faceUp === false)).toBe(true);
      expect(stack.slice(3).map(({ cardId }) => cardId)).toEqual(["EX9-046", "EX9-052"]);
      expect(s.perm("source").topCard.cardId).toBe("EX9-043");
      expect(s.state.memory).toBe(-7);
      expect(s.state.players[0]!.trash).toHaveLength(0);
      expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
      expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it("de-digivolves the opposing attacker after the inherited host loses a real battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-064", as: "host", under: ["EX9-052"], suspended: true }],
          security: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT10-065", as: "target", under: ["BT10-062"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("target").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId).sort()).toEqual(["BT10-064", "EX9-052"]);
    expect(s.perm("target").topCard.cardId).toBe("BT10-062");
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT10-065"]);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("leaves the source and trash unchanged when the optional end-of-turn cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-052", as: "source" }],
          trash: ["EX9-010", "EX9-015", "EX9-058"],
          hand: ["EX9-043"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("source"));
    await settle();
    expect(s.perm("source").topCard.cardId).toBe("EX9-052");
    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["EX9-010", "EX9-015", "EX9-058"]);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX9-043")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
