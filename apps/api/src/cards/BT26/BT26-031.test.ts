import { describe, expect, it } from "vitest";
import { EffectTiming, Zone } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-031.js";
import "../index.js";

describe("BT26-031 compiled fidelity", () => {
  it("encodes independent digivolve triggers, shared recovery, and the complete DUAL Option side", () => {
    const card = compiled;
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.effects?.[0]?.actions).toMatchObject([
      { kind: "RecoverByTrashingMostSecurity", recover: false },
      { kind: "SelectBind", condition: { kind: "ifThisEffectActed" } },
      {
        kind: "Restrict",
        restriction: "suspend",
        blocksCombatSuspend: true,
        condition: { kind: "ifThisEffectActed" },
      },
    ]);
    expect(card?.effects?.slice(1, 3)).toMatchObject([
      {
        trigger: "WhenDigivolving",
        frequency: "OncePerTurn",
        sharedUseKey: "BT26-031/tamer-trash-recovery",
        actions: [
          {
            kind: "CostGatedBlock",
            cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine" },
            optional: true,
            actions: [{ kind: "Recover", amount: 1 }],
          },
        ],
      },
      {
        trigger: "WhenAttacking",
        frequency: "OncePerTurn",
        sharedUseKey: "BT26-031/tamer-trash-recovery",
      },
    ]);
    expect(card?.effects?.[3]).toMatchObject({
      trigger: "Static",
      actions: [{ kind: "WaiveColorRequirement" }],
    });
    expect(card?.effects?.[4]).toMatchObject({
      trigger: "Main",
      actions: [
        { kind: "SelectBind" },
        { kind: "ModifyDP", amount: -8000 },
        {
          kind: "CostGatedBlock",
          cost: { kind: "trashSecurityTop", controller: "mine" },
          optional: true,
          actions: [{ kind: "ModifyDP", amount: -5000 }],
        },
      ],
    });
  });

  it("publicly trashes the leading security stack, locks an opponent target, and recovers", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-031", as: "murasamemon" }],
          security: [
            { card: "BT1-001", as: "oldest" },
            { card: "BT1-002", as: "remaining" },
          ],
          deck: ["BT1-005", { card: "BT1-003", as: "recovery" }],
          battleArea: [
            { card: "BT26-026", as: "base" },
            { card: "BT1-089", as: "tamer", under: [{ card: "BT1-004", faceUp: false }] },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }], security: [{ card: "BT1-010" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("murasamemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovery").instanceId));

    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT1-001", "BT1-004"]),
    );
    expect(
      (
        s.engine as unknown as { continuous: { hasRestriction: (id: string, kind: string) => boolean } }
      ).continuous.hasRestriction(s.perm("target").permanentId, "beSuspended"),
    ).toBe(true);
    expect(
      (
        s.engine as unknown as { continuous: { hasRestriction: (id: string, kind: string) => boolean } }
      ).continuous.hasRestriction(s.perm("target").permanentId, "suspend"),
    ).toBe(true);
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("target").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("lets the controller choose which tied largest security stack pays the cost (Q6997)", async () => {
    const preferred = ["opponent"];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-031", as: "murasamemon" }],
          security: [{ card: "BT1-001", as: "mine" }],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "target" }],
          security: [{ card: "BT1-010", as: "theirs" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("murasamemon"));

    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toContain(s.inst("mine").instanceId);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("theirs").instanceId);
  });

  it("does not pay the recovery cost from a face-up bottom card beneath a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-031", as: "murasamemon" },
            {
              card: "BT1-089",
              as: "tamer",
              under: [
                { card: "BT1-001", as: "faceUpBottom", faceUp: true },
                { card: "BT1-002", as: "faceDownUpper", faceUp: false },
              ],
            },
          ],
          deck: [{ card: "BT1-003", as: "recovery" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("murasamemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "combatResolved"));

    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("faceUpBottom").instanceId,
      s.inst("faceDownUpper").instanceId,
    ]);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toContain(s.inst("recovery").instanceId);
  });

  it("shares the recovery once-per-turn use between When Digivolving and When Attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-031", as: "murasamemon" },
            {
              card: "BT1-089",
              as: "firstTamer",
              under: [{ card: "BT1-001", as: "firstCost", faceUp: false }],
            },
            {
              card: "BT1-088",
              as: "secondTamer",
              under: [{ card: "BT1-002", as: "secondCost", faceUp: false }],
            },
          ],
          deck: ["BT1-003", "BT1-004"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("murasamemon"));
    expect(
      advance(s.engine).ledgers.tracker.count(
        s.perm("murasamemon").topCard.instanceId,
        "BT26-031/BT26-031/tamer-trash-recovery",
      ),
    ).toBe(1);
    expect(s.perm("firstTamer").stack.length + s.perm("secondTamer").stack.length).toBe(1);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("murasamemon"));
    expect(
      advance(s.engine).ledgers.tracker.count(
        s.perm("murasamemon").topCard.instanceId,
        "BT26-031/BT26-031/tamer-trash-recovery",
      ),
    ).toBe(1);

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(
      s.state.players[0]!.trash.filter(({ instanceId }) =>
        [s.inst("firstCost").instanceId, s.inst("secondCost").instanceId].includes(instanceId),
      ),
    ).toHaveLength(1);
    expect(s.perm("firstTamer").stack.length + s.perm("secondTamer").stack.length).toBe(1);
  });

  it("evolves from a level-4 Glowing Dawn Digimon for 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-026", as: "base" }],
          hand: [{ card: "BT26-031", as: "murasamemon" }],
          deck: ["BT1-001"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("murasamemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT26-031");

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.at(-1)?.cardId).toBe("BT26-026");
  });

  it("offers both simultaneous When Digivolving effects for ordering (Q6999)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-031", as: "murasamemon" },
            { card: "BT1-089", as: "tamer", under: [{ card: "BT1-001", faceUp: false }] },
          ],
          security: ["BT1-002"],
          deck: ["BT1-003"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );

    const resolving = advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("murasamemon"));
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const pending = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === pending.decisionId)!.req;
    const keys = request.options?.triggerKeys ?? [];
    expect(keys).toHaveLength(2);
    expect(new Set(keys).size).toBe(2);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "orderTriggers", order: [keys[1]!] },
      }),
    ).toEqual({ ok: true });
    await resolving;
  });

  it("uses the DUAL Option side with a non-yellow Glowing Dawn card and binds both reductions to one target", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-052", as: "glowingDawn" }],
          hand: [{ card: "BT26-031", as: "murasamemon" }],
          security: [{ card: "BT1-001", as: "cost" }],
        },
        1: {
          battleArea: [
            { card: "BT1-080", as: "chosen", dp: 13000 },
            { card: "BT1-080", as: "other", dp: 13000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").permanentId);
    const chosenId = s.perm("chosen").permanentId;
    const chosenTopId = s.perm("chosen").topCard.instanceId;
    const optionId = s.inst("murasamemon").instanceId;
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("murasamemon").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === optionId));

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(chosenId);
    expect(s.perm("other").currentDP).toBe(13000);
    const optionTrashIndex = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.instanceIds.includes(optionId) && event.to === Zone.Trash,
    );
    const zeroDpDeletionIndex = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.instanceIds.includes(chosenTopId) && event.to === Zone.Trash,
    );
    expect(optionTrashIndex).toBeGreaterThanOrEqual(0);
    expect(zeroDpDeletionIndex).toBeGreaterThan(optionTrashIndex);
  });

  it("may decline the further -5000 DP security cost while keeping the initial -8000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-052", as: "glowingDawn" }],
          hand: [{ card: "BT26-031", as: "murasamemon" }],
          security: [{ card: "BT1-001", as: "cost" }],
        },
        1: { battleArea: [{ card: "BT1-080", as: "target", dp: 13000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("murasamemon").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 5000);

    expect(s.perm("target").currentDP).toBe(5000);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toContain(s.inst("cost").instanceId);
  });

  it("performs the Q6998 rule deletion after Arts Digivolve and before its When Digivolving effects resolve", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-026", as: "base" }],
          hand: [{ card: "BT26-031", as: "murasamemon" }],
          security: [{ card: "BT1-001", as: "cost" }],
        },
        1: { battleArea: [{ card: "BT1-080", as: "target", dp: 13000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId, s.perm("base").topCard.instanceId);
    const targetTopId = s.perm("target").topCard.instanceId;
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("murasamemon").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT26-031");
    await settle(
      () => !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === targetTopId),
    );

    const zeroDpDeletionIndex = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.instanceIds.includes(targetTopId) && event.to === Zone.Trash,
    );
    const firstWhenDigivolvingResolutionIndex = s.events.findIndex(
      (event) =>
        event.kind === "effectResolved" &&
        event.sourceCardId === "BT26-031" &&
        event.timing === EffectTiming[EffectTiming.WhenDigivolving],
    );
    expect(zeroDpDeletionIndex).toBeGreaterThanOrEqual(0);
    expect(firstWhenDigivolvingResolutionIndex).toBeGreaterThan(zeroDpDeletionIndex);
  });
});
