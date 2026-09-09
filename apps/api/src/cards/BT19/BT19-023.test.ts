import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

// Fixture vocabulary.
// BT19-021 Xiquemon: Blue Lv.4 — the legal evolution source. Its own [On Play]/[When
//   Digivolving] belongs to Xiquemon, not to Huankunmon, so seating it as an established
//   base fires nothing; its inherited ＜Jamming＞ is inert for a defending Digimon.
// BT19-018 Swimmon: Blue Lv.3 — the level near-miss for the evolution requirement.
// BT1-014 Kokatorimon: Red Lv.4 — the colour near-miss for the evolution requirement.
// BT1-009 Monodramon: inert Red Lv.3, 3000 DP — the unprotected peer and inert security.
// BT19-022 MailBirdramon: printed ＜Blocker＞ — the opposing blocker used to prove that the
//   inherited [Your Turn] clause forbids a block (CR §12-1-1: a block IS a target switch).
const board = (s: ReturnType<typeof setupEngine>, seat: 0 | 1): (string | undefined)[] =>
  s.state.players[seat]!.battleArea.map((permanent) => permanent.topCard?.cardId);

describe("BT19-023 Huankunmon — catalog", () => {
  it("matches the printed catalog record", () => {
    expect(getCardDefinition("BT19-023")).toMatchObject({
      cardId: "BT19-023",
      nameEn: "Huankunmon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Aquatic"],
      evoCosts: [{ color: "Blue", level: 4, memoryCost: 3 }],
      effectText:
        "＜Blocker＞ \n[On Play] [When Digivolving] 1 of your Digimon can't be deleted by battle until the end of your opponent's turn.",
      inheritedEffectText: "[Your Turn] This Digimon's attack target can't be switched.",
    });
  });
});

describe("BT19-023 Huankunmon — ＜Blocker＞", () => {
  it("blocks a real attack on the player, and a peer without ＜Blocker＞ cannot", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-023", as: "huankun" },
          { card: "BT1-009", as: "peer" },
        ],
        security: ["BT1-009"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }], security: ["BT1-009"] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));

    // Near-miss: the 3000 DP Monodramon peer has no ＜Blocker＞, so it may not answer the window.
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("peer").permanentId }).ok).toBe(
      false,
    );
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("huankun").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "combatResolved"));

    // 7000 vs 3000: the redirected battle deletes the attacker and Huankunmon survives suspended.
    expect(board(s, 1)).toEqual([]);
    expect(board(s, 0).sort()).toEqual(["BT1-009", "BT19-023"]);
    expect(s.perm("huankun").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not grant ＜Blocker＞ to another Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-023", as: "huankun" },
          { card: "BT1-009", as: "peer" },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("huankun"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("peer"), "Blocker")).toBe(false);
  });
});

describe("BT19-023 Huankunmon — [On Play] / [When Digivolving] battle-deletion protection", () => {
  it("[On Play] protects the chosen Digimon through a real losing battle on the opponent's turn", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-023", as: "huankun" }],
          battleArea: [
            { card: "BT1-009", as: "shielded", suspended: true },
            { card: "BT1-009", as: "exposed", suspended: true },
          ],
          security: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "bigA", dp: 12_000 },
            { card: "BT1-009", as: "bigB", dp: 12_000 },
          ],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("shielded").topCard!.instanceId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("huankun").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasRestriction(s.perm("shielded"), "beDeletedInBattle"));

    expect(s.state.memory).toBe(3);
    expect(observe(s.engine).hasRestriction(s.perm("shielded"), "beDeletedInBattle")).toBe(true);
    expect(observe(s.engine).hasRestriction(s.perm("exposed"), "beDeletedInBattle")).toBe(false);
    expect(observe(s.engine).hasRestriction(s.perm("huankun"), "beDeletedInBattle")).toBe(false);

    // Real battles on the opponent's turn: 3000 DP loses to 12000 DP both times.
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("bigA").permanentId,
        target: { kind: "permanent", permanentId: s.perm("shielded").permanentId },
      }),
    ).toEqual({ ok: true });
    // Huankunmon has ＜Blocker＞, so every attack opens a block window; decline it so the
    // declared battle is the one under test.
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "combatResolved"));

    expect(board(s, 0)).toContain("BT1-009");
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("shielded").permanentId)).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("bigB").permanentId,
        target: { kind: "permanent", permanentId: s.perm("exposed").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter(({ kind }) => kind === "blockWindowOpened").length === 2);
    expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 1);

    // The unprotected peer is deleted by the identical battle; only the chosen one survived.
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(board(s, 0).sort()).toEqual(["BT1-009", "BT19-023"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[When Digivolving] protects one Digimon, and the protection expires at the end of the opponent's turn", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-021", as: "base" },
            { card: "BT1-009", as: "shielded" },
          ],
          hand: [{ card: "BT19-023", as: "huankun" }],
          deck: [{ card: "BT1-009", as: "drawn" }, "BT1-009"],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "peer" }], security: ["BT1-009"], hand: ["BT1-009"] },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("shielded").topCard!.instanceId);
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("huankun").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasRestriction(s.perm("shielded"), "beDeletedInBattle"));

    // Blue Lv.4 route: memory cost 3 and the digivolve draw.
    expect(s.state.memory).toBe(2);
    expect(s.perm("base").topCard?.cardId).toBe("BT19-023");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT19-021"]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(observe(s.engine).hasRestriction(s.perm("shielded"), "beDeletedInBattle")).toBe(true);
    expect(observe(s.engine).hasRestriction(s.perm("base"), "beDeletedInBattle")).toBe(false);

    // Still armed while the opponent's turn is open, gone once that turn has ended.
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();
    expect(observe(s.engine).hasRestriction(s.perm("shielded"), "beDeletedInBattle")).toBe(true);

    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).hasRestriction(s.perm("shielded"), "beDeletedInBattle")).toBe(false);
  });
});

describe("BT19-023 Huankunmon — evolution routes", () => {
  it("refuses an illegal source: Blue Lv.3 and Red Lv.4 both fail the Blue Lv.4 requirement", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-018", as: "blueLv3" },
          { card: "BT1-014", as: "redLv4" },
        ],
        hand: [{ card: "BT19-023", as: "huankun" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 10;
    await s.ready();

    for (const alias of ["blueLv3", "redLv4"]) {
      const result = s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm(alias).permanentId,
        instanceId: s.inst("huankun").instanceId,
      });
      expect(result.ok, `digivolve from ${alias}`).toBe(false);
    }
    await settle();

    expect(board(s, 0).sort()).toEqual(["BT1-014", "BT19-018"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-023"]);
    expect(s.state.memory).toBe(10);
  });
});

describe("BT19-023 Huankunmon — inherited [Your Turn] attack target can't be switched", () => {
  it("forbids an opposing ＜Blocker＞ from switching the target, unlike an identical host without it", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-014", as: "host", dp: 12_000, under: ["BT19-023"] },
          { card: "BT1-014", as: "plain", dp: 12_000 },
        ],
        security: ["BT1-009"],
      },
      1: { battleArea: [{ card: "BT19-022", as: "blocker" }], security: ["BT1-009", "BT1-009"] },
    });
    await s.ready();

    expect(observe(s.engine).hasRestriction(s.perm("host"), "attackTargetChange")).toBe(true);
    expect(observe(s.engine).hasRestriction(s.perm("plain"), "attackTargetChange")).toBe(false);

    // The restricted host: no block window ever opens, so the attack goes straight to security.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "securityChecked"));
    expect(s.events.some(({ kind }) => kind === "blockWindowOpened")).toBe(false);
    expect(s.perm("blocker").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);

    // The identical host WITHOUT BT19-023 underneath: the same blocker may switch the target.
    const before = s.events.length;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("plain").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.slice(before).some(({ kind }) => kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.slice(before).some(({ kind }) => kind === "combatResolved"));

    // 12000 vs 5000: the blocker is deleted and the second security card is untouched.
    expect(board(s, 1)).toEqual([]);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("does not restrict the host on the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-014", as: "host", under: ["BT19-023"] }] },
    });
    await s.ready();
    expect(observe(s.engine).hasRestriction(s.perm("host"), "attackTargetChange")).toBe(true);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasRestriction(s.perm("host"), "attackTargetChange")).toBe(false);
  });
});
