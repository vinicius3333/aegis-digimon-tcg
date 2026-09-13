import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-051.js";
import "./EX6-055.js";
import "./EX6-045.js";

describe("EX6-051 NeoDevimon", () => {
  it("deletes a level 4 or lower opposing Digimon at five or fewer hand cards and trashes an opponent hand card at seven or more", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Delete", condition: { kind: "zoneCount", op: "lte", value: 5 } },
      {
        kind: "Trash",
        target: { filter: { controller: "opponent", zone: "hand" }, count: 1 },
        condition: { kind: "zoneCount", op: "gte", value: 7 },
      },
    ]));
  it("revives DanDevimon from trash at ten opposing trash cards and inherits the opponent-hand fallback", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      optional: true,
      condition: { kind: "zoneCount", zone: "trash", op: "gte", value: 10 },
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        { kind: "Trash", controller: "opponent", target: { filter: { controller: "opponent", zone: "hand" } } },
        { kind: "PlayWithoutCost", from: ["trash"], condition: { kind: "ifThisEffectDidNotAct" } },
      ],
    });
  });

  it("lets the opponent trash one card from hand on a real attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-055", as: "host", under: ["EX6-051"] }],
          deck: Array(10).fill("BT1-009"),
          hand: ["BT1-009"],
        },
        1: {
          hand: [{ card: "BT1-010", as: "opponentCard" }],
          deck: Array(10).fill("BT1-011"),
          security: Array(6).fill("BT1-011"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.length === 0 && s.state.pendingDecision === undefined);
    expect(s.state.players[1]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("opponentCard").instanceId)).toBe(true);
  });

  it("plays a purple level 3 from trash when the opponent refuses the discard", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX6-055", as: "host", under: ["EX6-051"] }],
        trash: [{ card: "EX6-045", as: "revive" }],
        hand: ["BT1-009"],
        deck: Array(10).fill("BT1-009"),
      },
      1: {
        hand: [{ card: "BT1-010", as: "opponentCard" }],
        deck: Array(10).fill("BT1-011"),
        security: Array(6).fill("BT1-011"),
      },
    });
    await s.ready();
    s.state.turnSeat = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const discardDecision = s.state.pendingDecision!;
    expect(discardDecision.seat).toBe(1);
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: discardDecision.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const playDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: playDecision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("revive").instanceId),
    );
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual([s.inst("opponentCard").instanceId]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("revive").instanceId)).toBe(false);
  });
  it("publicly deletes an opposing level 4 Digimon on play", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX6-051", as: "neo" }] }, 1: { battleArea: [{ card: "BT1-053", as: "victim" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("neo"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
  it("publicly uses the seven-card branch without deleting the opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-051", as: "neo" }] },
        1: {
          hand: [
            { card: "BT1-010", as: "discarded" },
            "BT1-011",
            "BT1-012",
            "BT1-013",
            "BT1-014",
            "BT1-015",
            "BT1-016",
          ],
          battleArea: [{ card: "BT1-053", as: "victim" }],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    const effect = advance(s.engine).fire(EffectTiming.OnPlay, s.perm("neo"));
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.state.pendingDecision!;
    expect(decision.seat).toBe(1);
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("discarded").instanceId] },
      }),
    ).toEqual({ ok: true });
    await effect;
    await settle(() => s.state.players[1]!.hand.length === 6);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("discarded").instanceId)).toBe(true);
    expect(s.state.players[1]!.hand).toHaveLength(6);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("publicly revives DanDevimon when deleted with ten cards in the opponent's trash", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-051", as: "neo" }], trash: [{ card: "EX6-055", as: "dan" }] },
        1: { trash: Array.from({ length: 10 }, () => "BT1-010") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("neo").permanentId], "byEffect");
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("dan").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("dan").instanceId)).toBe(
      true,
    );
  });

  it("legally evolves from a purple level 4, pays 3 memory, and preserves the source stack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-049", as: "base" }], hand: [{ card: "EX6-051", as: "neo" }] },
        1: {
          hand: Array.from({ length: 5 }, () => "BT1-010"),
          battleArea: [{ card: "BT1-053", as: "victim" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("neo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("base").topCard.cardId).toBe("EX6-051");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX6-049"]);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("rejects a non-purple level 4 as an illegal evolution source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-014", as: "base" }], hand: [{ card: "EX6-051", as: "neo" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("neo").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("base").topCard.cardId).toBe("BT1-014");
    expect(s.perm("base").stack).toHaveLength(0);
  });
});
