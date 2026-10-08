import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle, type BoardSpec } from "../../engine/testkit/harness.js";
import "./index.js";
import "../EX13/EX13-060.js";
import "../ST21/ST21-09.js";
import "../ST21/ST21-11.js";
import "../ST17/index.js";

const options = { autoSelectCards: true, autoOrderTriggers: true, autoDeclineOptional: true };

describe("GitHub #5323: printed Alphamon/Ouryumon DNA routes on the accepted baseline", () => {
  it.each([false, true])(
    "offers and accepts ordinary Main DNA with named battle-area materials (reverse %s)",
    async (reverse) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "EX13-060", as: "alpha" },
              { card: "BT20-018", as: "ouryu" },
            ],
            hand: [{ card: "BT20-060", as: "ace" }],
            deck: ["BT1-009", "BT1-009"],
            security: ["BT1-009"],
          },
          1: { battleArea: [{ card: "BT1-010", as: "target" }], security: ["BT1-009", "BT1-009"] },
        },
        options,
      );
      s.state.memory = 3;
      await s.ready();
      const ids = [s.perm("alpha").permanentId, s.perm("ouryu").permanentId];
      expect(s.inst("ace").dnaDigivolveRoutes).toHaveLength(1);
      expect(s.inst("ace").dnaDigivolveRoutes[0]).toMatchObject({ projectedCost: 0 });
      expect(JSON.parse(s.inst("ace").dnaDigivolveRoutes[0]!.materialPermanentIdsJson)).toEqual(ids);
      expect(
        s.engine.applyIntent(0, {
          type: "dnaDigivolve",
          instanceId: s.inst("ace").instanceId,
          materialPermanentIds: reverse ? [...ids].reverse() : ids,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && s.state.pendingDecision === undefined);
      expect(s.state.players[0]!.battleArea).toHaveLength(1);
      expect(s.state.players[0]!.battleArea[0]!.topCard.instanceId).toBe(s.inst("ace").instanceId);
      // The first matching recipe assigns Ouryumon's black and Alphamon's yellow.
      expect(s.state.players[0]!.battleArea[0]!.stack.map((c) => c.cardId)).toEqual(["EX13-060", "BT20-018"]);
      expect(s.state.players[0]!.deck).toHaveLength(0); // one evolution draw plus one Recovery
      expect(s.state.players[0]!.security).toHaveLength(2);
      expect(s.state.players[1]!.security).toHaveLength(1);
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
      expect(s.state.memory).toBe(6); // cost 0, then Ouryuken's once-per-turn +3
    },
  );

  it.each([
    ["EX13-060", "BT20-018"],
    ["BT20-018", "EX13-060"],
  ])("accepts Counter Blast DNA with %s in battle and %s in hand", async (field, partner) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: field, as: "field", suspended: true }],
          hand: [
            { card: partner, as: "partner" },
            { card: "BT20-060", as: "ace" },
          ],
          deck: ["BT1-009", "BT1-009"],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "attacker" }], security: ["BT1-009", "BT1-009"] },
      },
      options,
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "respondCounter" })).toEqual({ ok: false, reason: "wrong-phase" });
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((e) => e.kind === "counterWindowOpened"));
    const opened = s.events.find((e) => e.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("Counter did not open");
    expect(opened.eligibleCounters).toHaveLength(1);
    const counter = opened.eligibleCounters[0]!;
    expect(counter.instanceId).toBe(s.inst("ace").instanceId);
    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: counter.instanceId,
        effectKey: counter.effectKey,
      }),
    ).toEqual({ ok: false, reason: "not-your-turn" });
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: counter.instanceId,
        effectKey: counter.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    const result = s.state.players[0]!.battleArea[0]!;
    expect(result.topCard.instanceId).toBe(s.inst("ace").instanceId);
    expect(result.stack.map((c) => c.cardId)).toEqual(["BT20-018", "EX13-060"]);
    expect(result.isSuspended).toBe(false);
    expect(s.state.players[0]!.hand).toHaveLength(1); // one evolution draw
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(0); // no cost, defender gains 3
    expect(s.events.some((e) => e.kind === "securityChecked")).toBe(false);
    expect(s.events.filter((e) => e.kind === "counterResolved")).toEqual([
      expect.objectContaining({ activated: true }),
    ]);
    expect(s.engine.applyIntent(0, { type: "respondCounter" })).toEqual({ ok: false, reason: "wrong-phase" });
  });

  it.each(["field/hand", "breeding/field", "opponent/field"])(
    "does not offer ordinary Main DNA for %s materials",
    async (placement) => {
      const board: BoardSpec = {
        0: { hand: [{ card: "BT20-060", as: "ace" }], battleArea: [{ card: "BT20-018", as: "ouryu" }] },
        1: {},
      };
      if (placement === "field/hand") board[0]!.hand!.push({ card: "EX13-060", as: "alpha" });
      if (placement === "breeding/field") board[0]!.breeding = { card: "EX13-060", as: "alpha" };
      if (placement === "opponent/field") board[1]!.battleArea = [{ card: "EX13-060", as: "alpha" }];
      const s = setupEngine(board, options);
      await s.ready();
      expect(s.inst("ace").dnaDigivolveRoutes).toHaveLength(0);
      const alphaId = placement === "field/hand" ? s.inst("alpha").instanceId : s.perm("alpha").permanentId;
      expect(
        s.engine.applyIntent(0, {
          type: "dnaDigivolve",
          instanceId: s.inst("ace").instanceId,
          materialPermanentIds: [alphaId, s.perm("ouryu").permanentId],
        }).ok,
      ).toBe(false);
      expect(s.inst("ace").cardId).toBe("BT20-060");
      expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("ace").instanceId)).toBe(true);
    },
  );

  it.each(["breeding", "both-field", "missing", "opponent", "wrong-name"])(
    "excludes illegal Blast materials: %s",
    async (placement) => {
      // A separate ST21 Counter keeps the window observable even when the Ouryuken pair is illegal.
      const board: BoardSpec = {
        0: {
          battleArea: [{ card: "ST21-09" }],
          hand: [{ card: "BT20-060", as: "ace" }, { card: "ST21-11" }],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
      };
      if (placement === "breeding") {
        board[0]!.breeding = { card: "EX13-060", as: "alpha" };
        board[0]!.hand!.push("BT20-018");
      } else {
        board[0]!.battleArea!.push({ card: "EX13-060", as: "alpha" });
        if (placement === "both-field") board[0]!.battleArea!.push("BT20-018");
        if (placement === "opponent") board[1]!.battleArea!.push("BT20-018");
        if (placement === "wrong-name") board[0]!.hand!.push("ST21-09");
      }
      const s = setupEngine(board, options);
      s.state.turnSeat = 1;
      await s.ready();
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.some((e) => e.kind === "counterWindowOpened"));
      const opened = s.events.find((e) => e.kind === "counterWindowOpened");
      if (opened?.kind !== "counterWindowOpened") throw new Error("Control Counter did not open");
      expect(opened.eligibleCounters.some((c) => c.instanceId === s.inst("ace").instanceId)).toBe(false);
      expect(
        s.engine.applyIntent(0, {
          type: "respondCounter",
          sourceInstanceId: s.inst("ace").instanceId,
          effectKey: "blast-dna-digivolve:[]",
        }),
      ).toEqual({ ok: false, reason: "illegal-target" });
      expect(s.engine.applyIntent(0, { type: "respondCounter" })).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
      expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("ace").instanceId)).toBe(true);
    },
  );

  it.each([false, true])("preserves normal paid evolution cost 6 (breeding %s)", async (breeding) => {
    const s = setupEngine(
      {
        0: {
          ...(breeding
            ? { breeding: { card: "EX13-060", as: "alpha" } }
            : { battleArea: [{ card: "EX13-060", as: "alpha" }] }),
          hand: [{ card: "BT20-060", as: "ace" }],
          deck: ["BT1-009", "BT1-009"],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target" }], security: ["BT1-009", "BT1-009"] },
      },
      options,
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.inst("ace").digivolveRoutes.some((r) => r.projectedCost === 6)).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("alpha").permanentId,
        instanceId: s.inst("ace").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && s.state.pendingDecision === undefined);
    expect(s.perm("alpha").topCard.instanceId).toBe(s.inst("ace").instanceId);
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(breeding ? 1 : 0);
  });

  async function lockedFixture(mode: "main" | "counter") {
    const s = setupEngine(
      {
        0: {
          battleArea:
            mode === "main"
              ? [
                  { card: "EX13-060", as: "alpha" },
                  { card: "BT20-018", as: "ouryu" },
                ]
              : [{ card: "EX13-060", as: "alpha" }, { card: "BT1-009" }, { card: "ST21-09" }],
          hand: [{ card: "BT20-060", as: "ace" }, ...(mode === "counter" ? ["BT20-018", "ST21-11"] : [])],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "ST17-07", as: "base" },
            { card: "BT1-010", as: "attacker" },
          ],
          hand: [{ card: "ST17-08", as: "mega" }],
          deck: ["BT1-009"],
        },
      },
      options,
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mega").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && s.state.pendingDecision === undefined);
    expect(observe(s.engine).isRestricted(s.perm("alpha"), "digivolve")).toBe(true);
    return s;
  }

  it("honors a printed digivolution prohibition in Main timing", async () => {
    const s = await lockedFixture("main");
    // Start the opponent's Main fixture while the printed until-opponent-turn-end lock still applies.
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    expect(s.inst("ace").dnaDigivolveRoutes).toHaveLength(0);
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        instanceId: s.inst("ace").instanceId,
        materialPermanentIds: [s.perm("alpha").permanentId, s.perm("ouryu").permanentId],
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        instanceId: s.inst("ace").instanceId,
        permanentId: s.perm("alpha").permanentId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("ace").instanceId)).toBe(true);
  });

  it("honors a printed digivolution prohibition in Counter timing", async () => {
    const s = await lockedFixture("counter");
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((e) => e.kind === "counterWindowOpened"));
    const opened = s.events.find((e) => e.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("Control Counter did not open");
    expect(opened.eligibleCounters.some((c) => c.instanceId === s.inst("ace").instanceId)).toBe(false);
    expect(s.engine.applyIntent(0, { type: "respondCounter" })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("ace").instanceId)).toBe(true);
  });
});
