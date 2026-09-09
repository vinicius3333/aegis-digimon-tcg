import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT19-020.js";

// BT19-020 Greymon — Blue/Black Lv.4 Champion, 5000 DP, play cost 5,
// digivolves from a Blue Lv.3 or a Black Lv.3 for 3.
//   ＜Rush＞
//   [On Deletion] If you have 1 or fewer Tamers, you may play 1 [Kiriha Aonuma] from your
//   hand without paying the cost. Then, ＜Save＞.
//   Inherited: ＜Reboot＞.
//
// Fixtures: BT1-028 Elecmon (inert Blue Lv.3) and BT2-052 Hagurumon (inert Black Lv.3) are
// the two legal digivolution sources; BT1-064 Goblimon (inert Green Lv.3) is the illegal
// source. BT19-081 Kiriha Aonuma is the exact printed Tamer; EX4-062
// [Kiriha Aonuma & Nene Amano] is the near-miss whose name merely CONTAINS it, and
// BT19-079 Taiki Kudo is the unrelated second Tamer. Security is seeded with inert
// main-deck Digimon so no digivolve or attack trips the security-out win check.
describe("BT19-020 Greymon", () => {
  it("matches the catalog printing", () => {
    expect(getCardDefinition("BT19-020")).toMatchObject({
      cardId: "BT19-020",
      nameEn: "Greymon",
      colors: ["Blue", "Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Dinosaur", "Blue Flare"],
      evoCosts: [
        { color: "Blue", level: 3, memoryCost: 3 },
        { color: "Black", level: 3, memoryCost: 3 },
      ],
      effectText:
        "＜Rush＞ \n[On Deletion] If you have 1 or fewer Tamers, you may play 1 [Kiriha Aonuma] from your hand without paying the cost. Then, ＜Save＞.",
      inheritedEffectText: "＜Reboot＞.",
    });
  });

  it("compiles every printed clause", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Rush" }] });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnDeletion",
      // "Then, ＜Save＞" is the keyword, so the placement is optional and lands at the bottom.
      keywords: [{ keyword: "Save" }],
      actions: [
        {
          kind: "PlayWithoutCost",
          payCost: false,
          optional: true,
          from: ["hand"],
          // Bracketed [Kiriha Aonuma] is an EXACT name, never a substring.
          target: { count: 1, filter: { controller: "mine", nameOrTrait: [{ match: "nameExact" }] } },
          condition: {
            kind: "youHave",
            filter: { controllerDefault: "mine", kind: ["Tamer"], zone: "battleArea", countMax: 1 },
          },
        },
        {
          kind: "PlaceUnder",
          optional: true,
          target: { count: 1, isSelf: true, filter: { isSelfRef: true } },
          underFilter: { controller: "mine", kind: ["Tamer"] },
        },
      ],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Reboot" }],
    });
    expect(compiled.effects).toHaveLength(3);
  });

  // ---------------------------------------------------------------------------
  // Digivolution routes
  // ---------------------------------------------------------------------------

  it.each([
    ["Blue Lv.3", "BT1-028"],
    ["Black Lv.3", "BT2-052"],
  ])("digivolves from a %s source for 3 with the bonus draw", async (_label, baseCardId) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCardId, as: "base" }],
        hand: [{ card: "BT19-020", as: "greymon" }],
        deck: [{ card: "BT1-010", as: "evoDraw" }, "BT1-011"],
        security: ["BT1-009", "BT1-013"],
      },
      1: { security: ["BT1-009", "BT1-013"] },
    });
    s.state.memory = 3;
    await s.ready();
    const baseInstanceId = s.inst("base").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("greymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("evoDraw").instanceId));

    expect(s.perm("base").topCard?.cardId).toBe("BT19-020");
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseInstanceId]);
    expect(s.perm("base").currentDP).toBe(5000);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses an illegal Green Lv.3 source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-064", as: "green" }],
        hand: [{ card: "BT19-020", as: "greymon" }],
        deck: ["BT1-010", "BT1-011"],
        security: ["BT1-009", "BT1-013"],
      },
      1: { security: ["BT1-009", "BT1-013"] },
    });
    s.state.memory = 10;
    await s.ready();

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("green").permanentId,
      instanceId: s.inst("greymon").instanceId,
    });
    expect(result.ok).toBe(false);
    expect(s.perm("green").topCard?.cardId).toBe("BT1-064");
    expect(s.perm("green").stack).toHaveLength(0);
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-020"]);
  });

  // ---------------------------------------------------------------------------
  // ＜Rush＞
  // ---------------------------------------------------------------------------

  it("attacks the turn it arrives while a plain peer that arrived with it may not", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-020", as: "greymon", enteredThisTurn: true },
            { card: "BT1-028", as: "plainPeer", enteredThisTurn: true },
          ],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-013"],
        },
        1: { security: ["BT1-009", "BT1-013", "BT1-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("greymon"), "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("plainPeer"), "Rush")).toBe(false);

    // The summoning-sickness gate refuses the peer that arrived this turn without ＜Rush＞.
    const refused = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("plainPeer").permanentId,
      target: { kind: "player" },
    });
    expect(refused.ok).toBe(false);
    expect(s.perm("plainPeer").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(3);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("greymon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 2);

    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.perm("greymon").isSuspended).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // [On Deletion] ... Then, ＜Save＞ — Q3076, Q4714
  // ---------------------------------------------------------------------------

  it("plays Kiriha with no Tamer in play and Saves under the Tamer it just played (Q3076)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-020", as: "greymon" }],
          hand: [{ card: "BT19-081", as: "kiriha" }],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-013"],
        },
        1: { security: ["BT1-009", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    const greymonInstanceId = s.inst("greymon").instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("greymon").permanentId])).toBe(1);
    await settle(() => s.perm("kiriha").stack.length === 1);
    await settle(() => false, 30);

    const kiriha = s.perm("kiriha");
    expect(kiriha.topCard?.cardId).toBe("BT19-081");
    expect(kiriha.stack.map((card) => card.instanceId)).toEqual([greymonInstanceId]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    // Played "without paying the cost": the memory gauge never moves.
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("skips the play with 2 Tamers in play but still Saves to the stack bottom (Q4714, CR 4-3-2)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-020", as: "greymon" },
            { card: "BT19-081", as: "firstTamer", under: [{ card: "BT1-011", as: "older" }] },
            { card: "BT19-079", as: "secondTamer" },
          ],
          hand: [{ card: "BT19-081", as: "handKiriha" }],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-013"],
        },
        1: { security: ["BT1-009", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    await s.ready();
    // Pin the ＜Save＞ host so the placement position is asserted deterministically.
    preferInstanceIds.push(s.perm("firstTamer").topCard!.instanceId);
    const greymonInstanceId = s.inst("greymon").instanceId;
    const olderInstanceId = s.inst("older").instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("greymon").permanentId]);
    await settle(() => s.perm("firstTamer").stack.length === 2);
    await settle(() => false, 30);

    // The "if" clause failed, so the Kiriha in hand stays there; the ＜Save＞ after "then"
    // still happens (Q4714).
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-081"]);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.perm("secondTamer").stack).toHaveLength(0);
    // Comprehensive 4-3-2: a card placed under a Tamer that already has cards under it goes
    // to the BOTTOM of the stack. `Permanent.stack` is bottom-first.
    expect(s.perm("firstTamer").stack.map((card) => card.instanceId)).toEqual([greymonInstanceId, olderInstanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // [Kiriha Aonuma] is a bracketed EXACT name gate. BT10-088 is a different printing with
  // the same printed name (qualifies); EX4-062 prints "The name of this card/Tamer is also
  // treated as [Kiriha Aonuma]/[Nene Amano]", so it answers to the exact name too
  // (qualifies); BT11-095 [Taiki, Kiriha, & Nene] and BT1-085 [Tai Kamiya] are the
  // near-miss Tamers this clause must never play.
  it.each([
    ["BT10-088", true],
    ["EX4-062", true],
    ["BT11-095", false],
    ["BT1-085", false],
  ] as const)("plays %s from hand: %s", async (tamerCardId, qualifies) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-020", as: "greymon" },
            { card: "BT19-079", as: "taiki" },
          ],
          hand: [{ card: tamerCardId, as: "candidate" }],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-013"],
        },
        1: { security: ["BT1-009", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    const greymonInstanceId = s.inst("greymon").instanceId;
    const candidateInstanceId = s.inst("candidate").instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("greymon").permanentId]);
    await settle(() => s.perm("taiki").stack.length === 1);
    await settle(() => false, 30);

    const onBoard = s.state.players[0]!.battleArea.some(
      (permanent) => permanent.topCard?.instanceId === candidateInstanceId,
    );
    expect(onBoard).toBe(qualifies);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === candidateInstanceId)).toBe(!qualifies);
    // ＜Save＞ runs either way, and no cost is ever paid.
    expect(s.perm("taiki").stack.map((card) => card.instanceId)).toEqual([greymonInstanceId]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("may decline the eligible Kiriha play and still Saves under the existing Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-020", as: "greymon" },
            { card: "BT19-081", as: "tamer" },
          ],
          hand: [{ card: "BT19-081", as: "handKiriha" }],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-013"],
        },
        1: { security: ["BT1-009", "BT1-013"] },
      },
      // Declines BOTH optionals: no play, and ＜Save＞ itself is optional too, so the
      // Greymon goes to the trash instead of under the Tamer.
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const greymonInstanceId = s.inst("greymon").instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("greymon").permanentId]);
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === greymonInstanceId));
    await settle(() => false, 30);

    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-081"]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([greymonInstanceId]);
  });

  it("does nothing at all when it is deleted with no Tamer and no Kiriha", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-020", as: "greymon" }],
          hand: [{ card: "BT1-010", as: "spare" }],
          deck: ["BT1-011"],
          security: ["BT1-009", "BT1-013"],
        },
        1: { security: ["BT1-009", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const greymonInstanceId = s.inst("greymon").instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("greymon").permanentId]);
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === greymonInstanceId));
    await settle(() => false, 30);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([greymonInstanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Inherited ＜Reboot＞
  // ---------------------------------------------------------------------------

  it("grants inherited ＜Reboot＞ only to the host it sits under", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-025", as: "host", under: ["BT19-020"] },
          { card: "BT19-025", as: "plain" },
          { card: "BT19-020", as: "onTop" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("plain"), "Reboot")).toBe(false);
    // An inherited effect never applies to the card while it is the TOP card.
    expect(observe(s.engine).hasKeyword(s.perm("onTop"), "Reboot")).toBe(false);
  });

  it("actually unsuspends its host during the opponent's unsuspend phase", async () => {
    // Both own Digimon attack into security on turn 0 and end it suspended. 20 000 DP keeps
    // them alive through the security check; only the Greymon host carries ＜Reboot＞.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-025", as: "host", dp: 20_000, under: ["BT19-020"] },
            { card: "BT19-025", as: "plainPeer", dp: 20_000 },
          ],
          hand: ["BT1-013"],
          deck: ["BT1-009", "BT1-012", "BT1-013", "BT1-010", "BT1-011", "BT1-009"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT1-028", as: "opponentDigimon" }],
          deck: ["BT1-009", "BT1-012", "BT1-013", "BT1-010", "BT1-011", "BT1-009"],
          security: ["BT1-009", "BT1-013", "BT1-012", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    for (const alias of ["host", "plainPeer"]) {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm(alias).permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm(alias).isSuspended && !observe(s.engine).isAttacking());
    }
    expect(s.state.turnSeat).toBe(0);
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.perm("plainPeer").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);

    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.turnSeat).toBe(1);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.perm("plainPeer").isSuspended).toBe(true);

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
