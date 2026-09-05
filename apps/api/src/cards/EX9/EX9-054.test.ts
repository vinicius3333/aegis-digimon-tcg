import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./EX9-054.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX9-051.js";
import "../index.js";

describe("EX9-054", () => {
  it("Q4808 combines one trash Negamon and one surviving host's source to play level five but not six", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-054", as: "source" },
            // EX9-005 can play this Negamon-text Digimon and become its bottom source.
            { card: "EX9-047", as: "other", under: ["EX9-005"] },
          ],
          trash: ["EX9-005"],
          hand: [{ card: "EX9-054", as: "candidate" }, "EX9-055"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const memory = s.state.memory;
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId]);
    await settle();
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.battleArea.map((card) => card.topCard.cardId)).toEqual(["EX9-047", "EX9-054"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX9-055"]);
    expect(s.perm("other").stack.map((card) => card.cardId)).toEqual(["EX9-005"]);
    expect(s.state.memory).toBe(memory);
  });
  it("de-digivolves one on play and digivolution", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [{ kind: "DeDigivolve", amount: 1 }],
      });
  });
  it("plays a Negamon-text Digimon from hand on deletion with a level limit scaled by Negamon cards", () => {
    const action = compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0];
    expect(action).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      target: { filter: { levelComparison: { op: "lte", value: 4 } } },
    });
    expect(action).toMatchObject({ target: { filter: { nameOrTrait: [{ tokens: ["Negamon"], match: "text" }] } } });
  });
  it("scales the optional deletion play limit by every two exact named Negamon cards in trash or stacks", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({
      optional: true,
      from: ["hand"],
      payCost: false,
      target: {
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Negamon"], match: "text" }],
          levelComparison: {
            op: "lte",
            value: 4,
            scaling: {
              per: 2,
              unit: "cards",
              filter: {
                zone: ["trash", "digivolutionCards"],
                controller: "mine",
                kind: ["Digimon", "DigiEgg"],
                nameOrTrait: [{ tokens: ["Negamon"], match: "nameExact" }],
              },
            },
          },
        },
      },
    }));
  it("inherits once-per-turn unsuspend when an Abbadomon attack target switches", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenAttackTargetSwitched", actions: [{ kind: "Unsuspend" }] }],
    }));
  it("unsuspends a real Abbadomon host when its attack is redirected by Blocker", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-055", as: "host", under: ["EX9-054"] }], security: ["BT1-090"] },
        1: { battleArea: [{ card: "BT2-058", as: "blocker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 1);
    expect(s.perm("host").isSuspended).toBe(true);

    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
  it("unsuspends only after the first of two real Blocker target switches in one turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "first" },
          { card: "BT1-010", as: "second" },
        ],
      },
      1: {
        battleArea: [{ card: "EX9-055", as: "host", under: ["EX9-051", "EX9-054"] }],
        security: ["BT1-010"],
      },
    });
    await s.ready();
    const host = s.perm("host");
    expect(observe(s.engine).hasKeyword(host, "Blocker")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("first").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 1);
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: host.permanentId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        !s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT1-009"),
    );
    expect(host.isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === host.permanentId)).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("second").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 1);
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: host.permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[0]!.battleArea.length === 0);

    expect(host.isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === host.permanentId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it.each([false, true])(
    "de-digivolves only one opposing stack through a public intent (digivolve=%s)",
    async (digivolve) => {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: digivolve ? [{ card: "EX9-048", as: "source" }] : [],
            hand: [{ card: "EX9-054", as: "evo" }],
            deck: ["BT1-010"],
          },
          1: {
            battleArea: [
              { card: "BT10-065", as: "target", under: ["BT10-062"] },
              { card: "BT2-064", as: "peer", under: ["BT10-064"] },
            ],
          },
        },
        { autoSelectCards: true, preferInstanceIds: preferred },
      );
      preferred.push(s.perm("target").permanentId);
      s.state.memory = 10;
      expect(
        s.engine.applyIntent(
          0,
          digivolve
            ? { type: "digivolve", permanentId: s.perm("source").permanentId, instanceId: s.inst("evo").instanceId }
            : { type: "playCard", instanceId: s.inst("evo").instanceId },
        ),
      ).toEqual({ ok: true });
      await settle();
      expect(s.perm("target").stack).toHaveLength(0);
      expect(s.perm("target").topCard.cardId).toBe("BT10-062");
      expect(s.perm("peer").topCard.cardId).toBe("BT2-064");
      expect(s.perm("peer").stack.map(({ cardId }) => cardId)).toEqual(["BT10-064"]);
      expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT10-065"]);
      expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("EX9-054");
      expect(s.state.players[0]!.battleArea[0]!.stack.map(({ cardId }) => cardId)).toEqual(
        digivolve ? ["EX9-048"] : [],
      );
      expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(digivolve ? ["BT1-010"] : []);
      expect(s.state.memory).toBe(digivolve ? 7 : 3);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );
  it("plays a qualifying Negamon-text Digimon from hand when deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-054", as: "source" }], hand: ["EX9-047"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0]!;

    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId]);
    await settle(() => player.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-047"));

    expect(player.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-047")).toBe(true);
    expect(player.hand.some((card) => card.cardId === "EX9-047")).toBe(false);
  });

  it("raises the level maximum for exact named Negamon cards, including Digi-Eggs", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-054", as: "source" }],
          hand: [{ card: "EX9-054", as: "candidate" }],
          trash: ["EX9-005", "EX9-005"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0]!;

    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId]);
    await settle(() =>
      player.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("candidate").instanceId),
    );

    expect(player.hand.some((card) => card.instanceId === s.inst("candidate").instanceId)).toBe(false);
  });

  it("does not raise the level maximum for cards that only mention Negamon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-054", as: "source" }],
          hand: [{ card: "EX9-054", as: "candidate" }],
          trash: ["EX9-047", "EX9-048"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0]!;

    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId]);
    await settle(() => s.state.pendingDecision === undefined);

    expect(player.hand.some((card) => card.instanceId === s.inst("candidate").instanceId)).toBe(true);
  });

  it("leaves the qualifying hand card in hand when the optional deletion play is declined", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-054", as: "source" }], hand: [{ card: "EX9-047", as: "candidate" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId]);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("candidate").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-047")).toBe(false);
  });
});
