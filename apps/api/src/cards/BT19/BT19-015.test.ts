import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT19-015.js";
import "../index.js";

/** Wait until the hand Gallantmon is the top card of a board permanent and the flow is quiet. */
async function settleOnGallant(s: ReturnType<typeof setupEngine>): Promise<void> {
  await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT19-015"));
  await settle(() => s.state.pendingDecision === undefined && !observe(s.engine).isAttacking());
}

// Inert fixtures only: BT1-024 MetalTyrannomon (Red Lv.5, 10000, no text) is the legal
// digivolution source, BT1-038 Monzaemon (Blue Lv.5) and BT1-014 Kokatorimon (Red Lv.4)
// are the illegal ones, and BT1-009/BT1-013 are the inert security and board bodies.

describe("BT19-015 Gallantmon", () => {
  it("matches the catalog printing", () => {
    expect(getCardDefinition("BT19-015")).toMatchObject({
      cardId: "BT19-015",
      nameEn: "Gallantmon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      types: ["Holy Warrior", "Royal Knight"],
      evoCosts: [{ color: "Red", level: 5, memoryCost: 4 }],
      effectText:
        "[When Digivolving] Delete 1 of your opponent's Digimon with 8000 DP or less. If this effect didn't delete, this Digimon gains ＜Piercing＞and gets +3000 DP until the end of your opponent's turn.\n[Your Turn] [Once Per Turn] When an opponent's Digimon is deleted, gain 2 memory.",
    });
    expect(getCardDefinition("BT19-015")?.inheritedEffectText ?? "").toBe("");
  });

  it("compiles the printed clauses into the expected IR", () => {
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 8000 } },
            count: 1,
          },
        },
        {
          kind: "GainKeyword",
          keyword: { keyword: "Piercing" },
          duration: "untilOpponentTurnEnd",
          condition: { kind: "ifThisEffectDidNotDelete" },
        },
        {
          kind: "ModifyDP",
          amount: 3000,
          duration: "untilOpponentTurnEnd",
          condition: { kind: "ifThisEffectDidNotDelete" },
        },
      ],
    });
    // The delete carries no `optional`, which is what makes it mandatory (Q3070).
    expect(compiled.effects[0]?.actions?.[0]).not.toHaveProperty("optional");
    expect(compiled.effects[1]).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          actions: [{ kind: "GainMemory", amount: 2 }],
        },
      ],
    });
    expect(compiled.coverage).toBe("full");
  });

  it("digivolves from a Red Lv.5 source for 4 memory and deletes an 8000 DP Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-024", as: "source" }],
          hand: [{ card: "BT19-015", as: "gallant" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "target", dp: 8000 }],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const targetId = s.perm("target").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("gallant").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    const gallant = s.perm("gallant");
    expect(gallant.topCard?.cardId).toBe("BT19-015");
    expect(gallant.stack.map((card) => card.cardId)).toEqual(["BT1-024"]);
    expect(gallant.currentDP).toBe(12000);
    expect(observe(s.engine).hasPierce(gallant)).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("target").instanceId);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(false);
    // 10 - 4 (evolution cost) + 1 (bonus draw is a card, not memory) + 2 (own [Your Turn] clause).
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses a Lv.4 source and a Blue Lv.5 source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-014", as: "lv4" },
          { card: "BT1-038", as: "blueLv5" },
        ],
        hand: [
          { card: "BT19-015", as: "gallantA" },
          { card: "BT19-015", as: "gallantB" },
        ],
        deck: [{ card: "BT1-009", as: "drawn" }],
        security: ["BT1-009"],
      },
      1: { security: ["BT1-009", "BT1-010"] },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lv4").permanentId,
        instanceId: s.inst("gallantA").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueLv5").permanentId,
        instanceId: s.inst("gallantB").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand).toHaveLength(2);
  });

  it("deletes the eligible target even when every optional prompt is declined (Q3070)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-024", as: "source" }],
          hand: [{ card: "BT19-015", as: "gallant" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-013", as: "target", dp: 8000 }], security: ["BT1-009", "BT1-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("gallant").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("gallant").currentDP).toBe(12000);
    expect(observe(s.engine).hasPierce(s.perm("gallant"))).toBe(false);
  });

  it("leaves a 9000 DP Digimon alone and takes the Piercing / +3000 DP branch instead", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-024", as: "source" }],
          hand: [{ card: "BT19-015", as: "gallant" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-013", as: "target", dp: 9000 }], security: ["BT1-009", "BT1-010"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("gallant").instanceId,
      }),
    ).toEqual({ ok: true });
    await settleOnGallant(s);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("target").currentDP).toBe(9000);
    expect(s.perm("gallant").currentDP).toBe(15000);
    expect(observe(s.engine).hasPierce(s.perm("gallant"))).toBe(true);
    // No opponent Digimon was deleted, so the [Your Turn] memory clause never fires.
    expect(s.state.memory).toBe(6);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("counts a chosen but undeletable Datamon as 'didn't delete' (Q3071)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-024", as: "source" }],
          hand: [{ card: "BT19-015", as: "gallant" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT14-062", as: "datamon" }], security: ["BT1-009", "BT1-010"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("gallant").instanceId,
      }),
    ).toEqual({ ok: true });
    await settleOnGallant(s);

    // Datamon's [All Turns] "can't be deleted by your opponent's effects" holds; it was still
    // a legal choice, so the fallback applies.
    expect(s.perm("datamon").topCard?.cardId).toBe("BT14-062");
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.perm("gallant").currentDP).toBe(15000);
    expect(observe(s.engine).hasPierce(s.perm("gallant"))).toBe(true);
    expect(s.state.memory).toBe(6);
  });

  it("takes the fallback branch when the opponent has no Digimon at all", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-024", as: "source" }],
          hand: [{ card: "BT19-015", as: "gallant" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
          security: ["BT1-009"],
        },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("gallant").instanceId,
      }),
    ).toEqual({ ok: true });
    await settleOnGallant(s);

    expect(s.perm("gallant").currentDP).toBe(15000);
    expect(observe(s.engine).hasPierce(s.perm("gallant"))).toBe(true);
  });

  it("checks security with the granted Piercing after winning a battle, unlike the deleting branch", async () => {
    // Fallback branch: no deletion happened, so Piercing is live and the excess damage from
    // beating a 3000 DP suspended Digimon reaches the security stack.
    const pierced = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-024", as: "source" }],
          hand: [{ card: "BT19-015", as: "gallant" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "victim", dp: 9000, suspended: true }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    pierced.state.memory = 10;
    await pierced.ready();
    expect(
      pierced.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: pierced.perm("source").permanentId,
        instanceId: pierced.inst("gallant").instanceId,
      }),
    ).toEqual({ ok: true });
    await settleOnGallant(pierced);
    expect(pierced.perm("gallant").currentDP).toBe(15000);

    expect(
      pierced.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: pierced.perm("gallant").permanentId,
        target: { kind: "permanent", permanentId: pierced.perm("victim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(pierced.engine).isAttacking());
    expect(pierced.state.players[1]!.security).toHaveLength(2);
    expect(pierced.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);

    // Control: the same board plus a deletable 8000 DP body, pinned as the delete target, so
    // the deletion happens, Piercing is never granted and the same battle leaves security alone.
    const preferInstanceIds: string[] = [];
    const plain = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-024", as: "source" }],
          hand: [{ card: "BT19-015", as: "gallant" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "deletable", dp: 8000 },
            { card: "BT1-009", as: "victim", dp: 3000, suspended: true },
          ],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    plain.state.memory = 10;
    preferInstanceIds.push(plain.perm("deletable").topCard!.instanceId);
    await plain.ready();
    expect(
      plain.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: plain.perm("source").permanentId,
        instanceId: plain.inst("gallant").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => plain.state.players[1]!.battleArea.length === 1);
    expect(observe(plain.engine).hasPierce(plain.perm("gallant"))).toBe(false);
    expect(plain.perm("gallant").currentDP).toBe(12000);

    expect(
      plain.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: plain.perm("gallant").permanentId,
        target: { kind: "permanent", permanentId: plain.perm("victim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(plain.engine).isAttacking());
    expect(plain.state.players[1]!.security).toHaveLength(3);
    expect(plain.events.filter((event) => event.kind === "securityChecked")).toHaveLength(0);
  });

  it("keeps the +3000 DP through the opponent's turn and loses it at that turn's end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-024", as: "source" }],
          hand: [{ card: "BT19-015", as: "gallant" }],
          deck: [{ card: "BT1-009", as: "drawnA" }, { card: "BT1-010", as: "drawnB" }, "BT1-011", "BT1-012"],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "big", dp: 9000 }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("gallant").instanceId,
      }),
    ).toEqual({ ok: true });
    await settleOnGallant(s);
    expect(s.perm("gallant").currentDP).toBe(15000);
    advance(s.engine).endMainPhaseIfOpen(0);

    // Read INSIDE the opponent's open Main phase: the grant is still live there. The turn
    // loop passes the turn itself, so nothing here writes `turnSeat`.
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.turnSeat).toBe(1);
    expect(s.perm("gallant").currentDP).toBe(15000);
    expect(observe(s.engine).hasPierce(s.perm("gallant"))).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);

    // ... and gone once that turn has ended, read inside our own next Main.
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.turnSeat).toBe(0);
    expect(s.perm("gallant").currentDP).toBe(12000);
    expect(observe(s.engine).hasPierce(s.perm("gallant"))).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("ignores the deletion of your OWN Digimon without consuming the once-per-turn window", async () => {
    // Both deletions are real battle outcomes on our own turn, driven by public attack
    // intents; nothing writes `turnSeat` or fires a timing directly.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-015", as: "gallant" },
            { card: "BT1-009", as: "mine", dp: 3000 },
          ],
          hand: [{ card: "BT1-013", as: "spare" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "theirBig", dp: 9000, suspended: true },
            { card: "BT1-010", as: "theirSmall", dp: 2000, suspended: true },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 0;
    const mineInstanceId = s.perm("mine").topCard!.instanceId;

    // Our own 3000 DP body attacks their suspended 9000 DP body and dies.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mine").permanentId,
        target: { kind: "permanent", permanentId: s.perm("theirBig").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([mineInstanceId]);
    expect(s.state.memory).toBe(0);

    // The window is untouched: the very next OPPONENT Digimon deletion still pays out.
    const theirSmallInstanceId = s.perm("theirSmall").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gallant").permanentId,
        target: { kind: "permanent", permanentId: s.perm("theirSmall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([theirSmallInstanceId]);
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("stays silent on the opponent's turn and re-arms on your next own turn", async () => {
    // Three consecutive turns of ONE real turn loop. Every deletion is a battle outcome
    // from a public attack intent, and the loop passes the turn itself — no `turnSeat`
    // write, no injected timing.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-015", as: "gallant" },
            { card: "BT1-020", as: "bait", dp: 10_000 },
            { card: "BT1-024", as: "second" },
          ],
          hand: [{ card: "BT1-013", as: "spare" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-009"],
          // 1000 DP security bodies, so the opponent's two suspending attacks survive.
          security: ["BT1-011", "BT1-011", "BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "theirAttacker", dp: 3000 },
            { card: "BT1-010", as: "firstVictim", dp: 2000 },
            { card: "BT1-011", as: "secondVictim", dp: 2000 },
          ],
          hand: [{ card: "BT1-013", as: "theirSpare" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-009"],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();

    // Turn 1 (ours): attack the player with the bait so it is left suspended and therefore
    // attackable on the opponent's turn. No opponent Digimon is deleted, so the
    // once-per-turn window is still unspent when their turn opens.
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.turnSeat).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("bait").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("bait").isSuspended && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea).toHaveLength(3);
    advance(s.engine).endMainPhaseIfOpen(0);

    // Turn 2 (theirs): their own 3000 DP Digimon attacks our suspended 10000 DP body and is
    // deleted. That IS "an opponent's Digimon is deleted", but not on OUR turn.
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.turnSeat).toBe(1);
    const theirAttackerInstanceId = s.perm("theirAttacker").topCard!.instanceId;
    const memoryBeforeTheirDeletion = s.state.memory;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("theirAttacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("bait").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.battleArea.length === 2);

    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(theirAttackerInstanceId);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === theirAttackerInstanceId),
    ).toBe(false);
    expect(s.perm("bait").topCard?.cardId).toBe("BT1-020");
    // The [Your Turn] gate held: the gauge moved only by the battle itself, not by +2.
    expect(s.state.memory).toBe(memoryBeforeTheirDeletion);

    // Their two survivors attack our 1000 DP security bodies, win, and end their turn
    // suspended — which is what makes them legal attack targets on our next turn.
    for (const alias of ["firstVictim", "secondVictim"]) {
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm(alias).permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm(alias).isSuspended && !observe(s.engine).isAttacking());
    }
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    advance(s.engine).endMainPhaseIfOpen(1);

    // Turn 3 (ours): the window is armed again and the first opponent deletion pays out.
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.turnSeat).toBe(0);
    s.state.memory = 0;
    const firstVictimInstanceId = s.perm("firstVictim").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gallant").permanentId,
        target: { kind: "permanent", permanentId: s.perm("firstVictim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(firstVictimInstanceId);
    expect(s.state.memory).toBe(2);

    // Second opponent deletion in the SAME turn, by a different attacker: [Once Per Turn].
    const secondVictimInstanceId = s.perm("secondVictim").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("second").permanentId,
        target: { kind: "permanent", permanentId: s.perm("secondVictim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(secondVictimInstanceId);
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
