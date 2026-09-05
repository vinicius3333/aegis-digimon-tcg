import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-062.js";
import "../index.js";

const CARD_ID = "EX10-062";

/**
 * Full-engine A3 for EX10-062 Yujin Ozora's [All Turns] trash-link-card-trigger clause
 * (plan 08-02), consuming the Wave-1 (08-01) `whenLinkTrashed` SubTrigger event:
 *
 *   "[All Turns] When effects trash any of your Digimon's link cards, by suspending this
 *    Tamer, <Draw 1>."  (documented behavior EffectTiming.OnLinkCardDiscarded)
 *
 * KB authority (node tools/kb/query.mjs card EX10-062):
 *   Q5172: the effect does NOT trigger on a link-card REPLACE — the Wave-1 fire gate already
 *     excludes the replace path (only a genuine trash of a link card fires whenLinkTrashed).
 *
 * The card's continuous AllTurns SubTrigger watcher installs during recomputeContinuousEffects;
 * we then trash a real LINK card via the production `trash` primitive (the genuine producing
 * site) and assert the controller drew exactly 1 and the Tamer suspended.
 *
 * FAILS-WHEN-REVERTED: drop the SubTrigger consumer from EX10-062.ts (the `whenLinkTrashed`
 * action) — the watcher never installs, so the trash draws nothing and the Tamer stays
 * unsuspended => the draw + suspend assertions go RED. (Equivalently: removing the
 * fireSubTrigger at the trash seam, the 08-01 lever, also turns this RED.)
 */

describe("A3 EX10-062 — whenLinkTrashed consumer: suspend this Tamer to <Draw 1>", () => {
  it("records the exact catalog and compiled IR contract", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Black"],
      playCost: 3,
      dp: 0,
      evoCosts: [],
      forms: ["-"],
      attributes: ["-"],
      types: ["App Driver", "Appmon", "Leviathan"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "StartOfYourMainPhase",
          actions: [expect.objectContaining({ kind: "GainMemory", amount: 1 })],
        }),
        expect.objectContaining({
          trigger: "EndOfYourTurn",
          frequency: "OncePerTurn",
          actions: [expect.objectContaining({ kind: "AppFuse", from: ["hand"], optional: true })],
        }),
        expect.objectContaining({ trigger: "Security", isSecurity: true }),
      ]),
    );
  });

  it("gains 1 memory at start-main only while the opponent has a Digimon", async () => {
    const withTarget = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "tamer" }] },
      1: { battleArea: ["BT1-009"] },
    });
    await withTarget.ready();
    await advance(withTarget.engine).fireForPermanent(EffectTiming.OnStartMainPhase, withTarget.perm("tamer"));
    expect(withTarget.state.memory).toBe(1);

    const withoutTarget = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "tamer" }] } });
    await withoutTarget.ready();
    await advance(withoutTarget.engine).fireForPermanent(EffectTiming.OnStartMainPhase, withoutTarget.perm("tamer"));
    expect(withoutTarget.state.memory).toBe(0);
  });

  it("trashing a friendly Digimon's link card suspends the Tamer and draws 1", async () => {
    // EX10-062 Yujin Ozora (a Tamer) on the controller's field — the watcher anchor + suspend cost.
    // A friendly Digimon (host) carries a LINK card (the genuine link-trash subject).
    // Deck cards so the <Draw 1> has something to draw.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX10-062", as: "tamer" },
            { card: "BT1-009", as: "host", linked: [{ card: "BT1-009", as: "linkCard" }] },
          ],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true },
    );
    const p0 = s.state.players[0]!;
    const tamer = s.perm("tamer");
    const host = s.perm("host");
    const linkCard = s.inst("linkCard");

    const handBefore = p0.hand.length;

    // Install EX10-062's continuous whenLinkTrashed watcher.
    await s.engine.recomputeContinuousEffects();

    // Trash the link card via the REAL production seam (fires whenLinkTrashed).
    await advance(s.engine).verb.trash([linkCard.instanceId]);
    await settle(() => p0.hand.length > handBefore);

    expect(host.linked.length).toBe(0); // the link card genuinely left the linked list
    // FAILS-WHEN-REVERTED: drop the whenLinkTrashed consumer => no draw, no suspend.
    expect(p0.hand.length).toBe(handBefore + 1); // exactly 1 drawn (the suspend-cost tail ran)
    expect(tamer.isSuspended).toBe(true); // the "by suspending this Tamer" cost was paid
  });

  it("trashing a NON-link card (a hand card) does not draw (replace/non-trash control, Q5172)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-062", as: "tamer" }],
          deck: ["BT1-009"],
          hand: [{ card: "BT1-009", as: "handCard" }],
        },
      },
      { autoAcceptOptional: true },
    );
    const p0 = s.state.players[0]!;
    const tamer = s.perm("tamer");
    const handCard = s.inst("handCard");

    const handBefore = p0.hand.length;
    await s.engine.recomputeContinuousEffects();

    await advance(s.engine).verb.trash([handCard.instanceId]);
    await settle(() => false, 30);

    // The hand card was trashed (hand shrinks), but no link-card trash => no whenLinkTrashed
    // fire => no draw and the Tamer stays unsuspended.
    expect(p0.hand.length).toBe(handBefore - 1);
    expect(tamer.isSuspended).toBe(false);
  });

  it("does not fire for an OPPONENT's Digimon's link card (sourceFilter controller: mine)", async () => {
    // The printed text says "any of YOUR Digimon's link cards". Without
    // `sourceFilter.controller: "mine"` the watcher would also arm on the opponent's link
    // trash, so this is the case that falsifies that field.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-062", as: "tamer" }],
          deck: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponentHost", linked: [{ card: "BT1-009", as: "opponentLink" }] }],
        },
      },
      { autoAcceptOptional: true },
    );
    const p0 = s.state.players[0]!;
    const handBefore = p0.hand.length;
    await s.engine.recomputeContinuousEffects();

    await advance(s.engine).verb.trash([s.inst("opponentLink").instanceId]);
    await settle(() => false, 30);

    expect(s.perm("opponentHost").linked).toHaveLength(0);
    expect(p0.hand.length).toBe(handBefore);
    expect(s.perm("tamer").isSuspended).toBe(false);
  });

  it("[Once Per Turn] app fuses only once even with a second legal host and hand card", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "tamer" },
            { card: "EX10-017", as: "firstHost", linked: [{ card: "EX10-043", as: "firstSakusimon" }] },
            { card: "EX10-017", as: "secondHost", linked: [{ card: "EX10-043", as: "secondSakusimon" }] },
          ],
          hand: [
            { card: "EX10-019", as: "firstWarudamon" },
            { card: "EX10-019", as: "secondWarudamon" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: { deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();

    // Pin both inputs so a broken frequency/shared-use guard cannot simply fuse the first
    // host a second time and still leave the second host untouched.
    preferred.push(s.perm("firstHost").topCard!.instanceId, s.inst("firstWarudamon").instanceId);
    await advance(s.engine).fireForPermanent(EffectTiming.OnEndTurn, s.perm("tamer"));
    await settle(() => s.perm("firstHost").topCard?.cardId === "EX10-019");

    preferred.length = 0;
    preferred.push(s.perm("secondHost").topCard!.instanceId, s.inst("secondWarudamon").instanceId);
    // Second activation in the SAME turn, aimed at a different legal pair: the per-turn use
    // ledger must refuse it rather than passing because the resolver picked the first pair again.
    await advance(s.engine).fireForPermanent(EffectTiming.OnEndTurn, s.perm("tamer"));
    await settle(() => false, 30);

    expect(s.perm("firstHost").topCard?.cardId).toBe("EX10-019");
    expect(s.perm("secondHost").topCard?.cardId).toBe("EX10-017");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      s.inst("secondWarudamon").instanceId,
    );

    // Drive the next complete turn through the production state machine. Its start-turn
    // boundary must reset the use ledger and its end-turn window must offer the second pair.
    // The direct timing seam above does not itself advance the turn machine.
    expect(s.state.turnSeat).toBe(0);
    const previousTurnCount = s.state.turnCount;
    await advance(s.engine).runTurn(0);
    expect(s.state.turnCount).toBe(previousTurnCount + 1);
    await settle(() => s.perm("secondHost").topCard?.cardId === "EX10-019");
    expect(s.perm("secondHost").topCard?.instanceId).toBe(s.inst("secondWarudamon").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(
      s.inst("secondWarudamon").instanceId,
    );
  });

  it("leaves the Tamer unsuspended and draws nothing when the suspend cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX10-062", as: "tamer" },
            { card: "BT1-009", as: "host", linked: [{ card: "BT1-009", as: "linkCard" }] },
          ],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoDeclineOptional: true },
    );
    const p0 = s.state.players[0]!;
    const tamer = s.perm("tamer");
    const handBefore = p0.hand.length;

    await s.engine.recomputeContinuousEffects();
    await advance(s.engine).verb.trash([s.inst("linkCard").instanceId]);
    await settle(() => false, 30);

    expect(s.decisions.some((d) => d.req.kind === "optional")).toBe(true);
    expect(tamer.isSuspended).toBe(false);
    expect(p0.hand.length).toBe(handBefore);
  });

  it("app fuses a chosen Digimon into a legal hand card without paying at end of turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "tamer" },
            { card: "EX10-017", as: "host", linked: [{ card: "EX10-043", as: "sakusimon" }] },
          ],
          hand: [{ card: "EX10-019", as: "warudamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnEndTurn, s.perm("tamer"));
    await settle(() => s.perm("host").topCard?.cardId === "EX10-019");
    expect(s.perm("host").topCard?.instanceId).toBe(s.inst("warudamon").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("plays itself from security without paying", async () => {
    const s = setupEngine({ 0: { security: [{ card: CARD_ID, as: "tamer" }] } });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("tamer"));
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID));
    expect(s.state.players[0]!.security).toHaveLength(0);
  });
});
