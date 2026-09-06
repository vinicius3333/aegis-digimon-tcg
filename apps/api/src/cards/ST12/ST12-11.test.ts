import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for ST12-11 (Gankoomon) — two effects:
//   (1) [When Digivolving] Play 1 Huckmon or Sistermon-name Digimon from trash free.
//   (2) [Your Turn][Once Per Turn] When you play another Digimon by an effect,
//       ＜De-Digivolve 1＞ up to 2 opponent Digimon. source: documented behavior.
//
// FAILS-WHEN-REVERTED:
//   (1) Without the WhenDigivolving effect, the trash Huckmon stays in trash.
//   (2) The SubTrigger watcher is installed by the None staticModifier; without it the
//       fire-seam never calls De-Digivolve 1 on opponent Digimon.

// ST12-11 Gankoomon — Black Lv.6, evoCosts [{color:"Black",level:5,memoryCost:3},{color:"Red",level:5,memoryCost:3}].
// BT10-064 Gogmamon — Black Lv.5, playCost 5 → valid digivolution base.
// BT13-009 Huckmon — Red Lv.3, playCost 3 → target for [When Digivolving].
// BT10-085 Sistermon Ciel — Lv.4, nameEn contains "Sistermon" → also valid.
const GANKOOMON = "ST12-11";
const LV5_BASE = "BT10-064"; // Black Lv.5
const HUCKMON = "BT13-009"; // Lv.3 Huckmon

describe("ST12-11 [When Digivolving] plays Huckmon or Sistermon-name from trash free", () => {
  it("moves a Huckmon from trash to the battle area after digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: LV5_BASE, dp: 6000, as: "base" }],
          // Place a Huckmon in the owner's trash.
          trash: [{ card: HUCKMON, as: "huckmon" }],
          hand: [{ card: GANKOOMON, as: "card" }],
          deck: ["ST1-02", "ST1-02"],
        },
        1: {
          battleArea: [
            { card: "ST12-10", as: "target1", under: ["ST12-08"] },
            { card: "ST12-09", as: "target2", under: ["ST12-04"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const p0 = s.state.players[0]!;
    const base = s.perm("base");
    const huckmonId = s.inst("huckmon").instanceId;
    s.state.memory = 10;

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: base.permanentId,
      instanceId: s.inst("card").instanceId,
    });
    expect(result).toEqual({ ok: true });

    // Wait for Huckmon to appear on the battle area (played from trash).
    await settle(() => p0.battleArea.some((p) => p.topCard?.instanceId === huckmonId), 400);

    expect(p0.battleArea.some((p) => p.topCard?.instanceId === huckmonId)).toBe(true);
    // Huckmon should no longer be in trash.
    expect(p0.trash.some((c) => c.instanceId === huckmonId)).toBe(false);
    await settle(() => s.perm("target1").stack.length === 0 && s.perm("target2").stack.length === 0);
    expect(s.perm("target1").topCard.cardId).toBe("ST12-08");
    expect(s.perm("target2").topCard.cardId).toBe("ST12-04");
  });

  it("plays a Sistermon-name card but rejects BaoHuckmon as Huckmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: LV5_BASE, as: "base" }],
          trash: [
            { card: "ST12-13", as: "sistermon" },
            { card: "ST12-06", as: "baoHuckmon" },
          ],
          hand: [{ card: GANKOOMON, as: "card" }],
          deck: ["ST1-02", "ST1-02"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const sistermonId = s.inst("sistermon").instanceId;
    const baoHuckmonId = s.inst("baoHuckmon").instanceId;
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("card").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === sistermonId));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === sistermonId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === baoHuckmonId)).toBe(true);
  });

  it("does not treat BaoHuckmon as the exact Huckmon name", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: LV5_BASE, as: "base" }],
          trash: [{ card: "ST12-06", as: "baoHuckmon" }],
          hand: [{ card: GANKOOMON, as: "card" }],
          deck: ["ST1-02", "ST1-02"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const baoHuckmonId = s.inst("baoHuckmon").instanceId;
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("card").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === GANKOOMON));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === baoHuckmonId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === baoHuckmonId)).toBe(false);
  });

  it("does NOT play from trash when trash has no Huckmon or Sistermon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: LV5_BASE, dp: 6000, as: "base" }],
          // Trash has a non-matching card.
          trash: [{ card: "BT1-009", as: "other" }], // Monodramon — not Huckmon or Sistermon
          hand: [{ card: GANKOOMON, as: "card" }],
          deck: ["ST1-02", "ST1-02"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const p0 = s.state.players[0]!;
    const base = s.perm("base");
    const otherId = s.inst("other").instanceId;
    s.state.memory = 10;

    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: base.permanentId,
      instanceId: s.inst("card").instanceId,
    });

    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === GANKOOMON), 200);

    // The non-matching card should remain in trash.
    expect(p0.trash.some((c) => c.instanceId === otherId)).toBe(true);
  });

  it("may decline the free play and leave a matching Huckmon in trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: LV5_BASE, as: "base" }],
          trash: [{ card: HUCKMON, as: "huckmon" }],
          hand: [{ card: GANKOOMON, as: "card" }],
          deck: ["ST1-02", "ST1-02"],
        },
      },
      { autoOrderTriggers: true },
    );
    const huckmonId = s.inst("huckmon").instanceId;
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("card").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === huckmonId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === huckmonId)).toBe(false);
  });

  it("only De-Digivolves once when two effect-play Digimon enter in one turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST12-11", as: "gankoomon" },
            { card: "ST12-10", as: "jesmonOne" },
            { card: "ST12-10", as: "jesmonTwo" },
          ],
          hand: [
            { card: "ST12-13", as: "sisterOne" },
            { card: "ST12-13", as: "sisterTwo" },
          ],
        },
        1: {
          battleArea: [{ card: "ST12-10", as: "target", under: ["ST12-04", "ST12-06", "ST12-08"] }],
          security: ["BT1-001", "BT1-002", "BT1-003", "BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    const target = s.perm("target");
    const combat = (s.engine as unknown as { combat: { isAttacking: boolean } }).combat;
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("jesmonOne").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !combat.isAttacking && s.state.players[1]!.security.length === 3);
    expect(s.state.players[1]!.security).toHaveLength(3);
    expect(target.stack).toHaveLength(2);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("sisterOne").instanceId)).toBe(
      true,
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("jesmonTwo").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !combat.isAttacking && s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(combat.isAttacking).toBe(false);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("sisterTwo").instanceId)).toBe(
      true,
    );

    // A second effect-play in the same turn must not consume Gankoomon's OPT again.
    expect(target.stack).toHaveLength(2);
  });
});
