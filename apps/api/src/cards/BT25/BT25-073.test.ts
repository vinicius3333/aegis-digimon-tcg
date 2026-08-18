import { describe, it, expect } from "vitest";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
// Self-register every card module so the engine drives the REGISTERED BT25-073 override.
import "../index.js";

/**
 * A3 — BT25-073 (Dragomon). Engine capability: pay a cost by trashing a card from a
 * Digimon's LINK zone (`permanent.linked`).
 *
 * Printed: "[On Play] [When Digivolving] By trashing 1 of your Digimon's link cards, you may
 *   play or use 1 [TS] trait card with a play or use cost of 5 or less from your hand without
 *   paying the cost." plus inherited "[All Turns] By trashing 1 of its link cards, this Digimon
 *   doesn't leave play."
 *
 * The cost's `filter.zone === "linked"` selects the LINK CARDS of the matching HOST permanents;
 * the rest of the filter (kind:["Digimon"], controller:"mine") constrains the HOST, not the link
 * card. The chosen link card is removed from its host's `.linked` list and moved to the OWNER's
 * trash, then a [TS] cost<=5 card is played free from hand.
 *
 * FAILS-WHEN-REVERTED: drop the `zone === "linked"` branch in payCost and the trash cost finds no
 * candidates (link cards are not enumerable via the normal-zone paths) => the optional aborts, no
 * link card is trashed and nothing is played.
 */

function fireTiming(s: EngineSetup, timing: EffectTiming, trigger: Record<string, unknown> = {}): Promise<void> {
  return (
    s.engine as unknown as { fireTiming(t: EffectTiming, tr?: Record<string, unknown>): Promise<void> }
  ).fireTiming(timing, trigger);
}

// A [TS]-trait Digimon with play cost <= 5 and no On Play / When Digivolving of its own
// (BT24-011: <Rush>/<Raid> only) — the free-played payload.
const TS_CARD = "BT24-011";
const LINK_CARD = "BT1-013";
const DRAGOMON = "BT25-073";

function inArea(p: PlayerState, cardId: string): boolean {
  return p.battleArea.some((perm) => perm.topCard?.cardId === cardId);
}

describe("A3 BT25-073 — pay by trashing a link card, then free-play a [TS] cost<=5 card", () => {
  it("On Play: trashing a friendly Digimon's link card plays a [TS] cost<=5 card free from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: DRAGOMON, dp: 4000, as: "dragomon" },
            // A friendly Digimon HOST carrying one LINK card (the cost fuel).
            { card: LINK_CARD, dp: 4000, as: "host", linked: [{ card: LINK_CARD, as: "linkCard" }] },
          ],
          // The [TS] payload sitting in hand.
          hand: [TS_CARD],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const linkCardId = s.inst("linkCard").instanceId;

    expect(s.perm("host").linked.length).toBe(1);
    expect(p0.trash.length).toBe(0);

    await s.engine.recomputeContinuousEffects();
    await fireTiming(s, EffectTiming.OnPlay, {});
    await settle(() => inArea(p0, TS_CARD));

    expect(s.perm("host").linked.length).toBe(0); // the link card left the linked list
    expect(p0.trash.some((c) => c.instanceId === linkCardId)).toBe(true); // -> owner trash
    expect(inArea(p0, TS_CARD)).toBe(true); // the [TS] card was played free
    expect(p0.hand.some((c) => c.cardId === TS_CARD)).toBe(false); // and left the hand
  });

  it("When Digivolving: same link-trash cost pays and plays the [TS] card free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: DRAGOMON, dp: 4000, as: "dragomon" },
            { card: LINK_CARD, dp: 4000, as: "host", linked: [{ card: LINK_CARD, as: "linkCard" }] },
          ],
          hand: [TS_CARD],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const linkCardId = s.inst("linkCard").instanceId;

    await s.engine.recomputeContinuousEffects();
    await fireTiming(s, EffectTiming.WhenDigivolving, {});
    await settle(() => inArea(p0, TS_CARD));

    expect(s.perm("host").linked.length).toBe(0);
    expect(p0.trash.some((c) => c.instanceId === linkCardId)).toBe(true);
    expect(inArea(p0, TS_CARD)).toBe(true);
  });

  it("On Play declined (abortOnDecline): plays nothing and trashes no link card", async () => {
    // No autoAcceptOptional — respond to the "by trashing..." prompt manually, declining it, since
    // the harness's opts only express auto-accept, not auto-decline. fireTiming's own promise awaits
    // that prompt internally, so it must not be awaited before the manual response is sent.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: DRAGOMON, dp: 4000, as: "dragomon" },
            { card: LINK_CARD, dp: 4000, as: "host", linked: [{ card: LINK_CARD, as: "linkCard" }] },
          ],
          hand: [TS_CARD],
        },
      },
      { autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const linkCardId = s.inst("linkCard").instanceId;

    await s.engine.recomputeContinuousEffects();
    const pending = fireTiming(s, EffectTiming.OnPlay, {});
    await settle(() => s.decisions.some((d) => d.req.kind === "optional"), 60);
    const prompt = s.decisions.find((d) => d.req.kind === "optional");
    expect(prompt).toBeDefined();
    if (prompt !== undefined) {
      s.engine.applyIntent(prompt.seat, {
        type: "respondDecision",
        decisionId: prompt.req.decisionId,
        response: { kind: "optional", accept: false },
      });
    }
    await pending;
    await settle(() => false, 80); // flush; a (wrong) play/trash WOULD be observed

    expect(s.perm("host").linked.length).toBe(1); // link card untouched
    expect(p0.trash.some((c) => c.instanceId === linkCardId)).toBe(false);
    expect(inArea(p0, TS_CARD)).toBe(false); // nothing played
    expect(p0.hand.some((c) => c.cardId === TS_CARD)).toBe(true); // still in hand
  });

  it("(inherited) [All Turns] leave-prevention pays by trashing the host's OWN link card -> survives", async () => {
    // BT25-073's inherited [All Turns] clause is active only when it sits UNDER a Digimon: the
    // host carries BT25-073 in its digivolution stack. `isSelfRef` on the cost resolves to the
    // HOST permanent, so the link card must sit in the HOST's linked list.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: LINK_CARD,
              dp: 4000,
              as: "host",
              under: [{ card: DRAGOMON, faceUp: false }], // the inherited source card
              linked: [{ card: LINK_CARD, as: "linkCard" }],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const hostId = s.perm("host").permanentId;
    const linkCardId = s.inst("linkCard").instanceId;

    await s.engine.recomputeContinuousEffects(); // installs the inherited wouldLeavePlay prevention

    const fx = (s.engine as unknown as { primitives: { deletePermanent(ids: string[]): Promise<number> } })
      .primitives;
    await fx.deletePermanent([hostId]);
    await settle(() => s.perm("host").linked.length === 0);

    expect(p0.battleArea.some((perm) => perm.permanentId === hostId)).toBe(true); // survived
    expect(s.perm("host").linked.length).toBe(0); // the host's own link card paid the cost
    expect(p0.trash.some((c) => c.instanceId === linkCardId)).toBe(true); // -> owner trash
  });
});
