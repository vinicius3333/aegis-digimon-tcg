import { describe, it, expect } from "vitest";
import { EffectTiming, digivolutionRequirementsFor, type PlayerState } from "@aegis/shared";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
// Register only the audited module; importing the whole set masks card-local regressions and
// materially increases the focused gate's memory footprint.
import "./BT25-073.js";

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
  it("alternate-digivolves from an off-color level 4 TS card for exactly 3 and grants Jamming", async () => {
    expect(digivolutionRequirementsFor(DRAGOMON)).toContainEqual({
      level: 4,
      traits: ["TS"],
      cost: 3,
      isAlternate: true,
    });

    const legal = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-011", as: "offColorTs" }],
          hand: [{ card: DRAGOMON, as: "dragomonCard" }],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    legal.state.memory = 3;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("offColorTs").permanentId,
        instanceId: legal.inst("dragomonCard").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("offColorTs").topCard.cardId === DRAGOMON);
    expect(legal.state.memory).toBe(0);
    expect(observe(legal.engine).hasKeyword(legal.perm("offColorTs"), "Jamming")).toBe(true);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-037", as: "plainLv4" }], hand: [{ card: DRAGOMON, as: "card" }] },
    });
    invalid.state.memory = 3;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("plainLv4").permanentId,
        instanceId: invalid.inst("card").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(invalid.state.memory).toBe(3);
  });

  it("ordinary-digivolves from black non-TS Lv.4 for 3 and rejects a wrong-color source", async () => {
    const ordinary = setupEngine({
      0: { battleArea: [{ card: "BT10-061", as: "blackBase" }], hand: [{ card: DRAGOMON, as: "dragomon" }] },
    });
    ordinary.state.memory = 4;
    expect(
      ordinary.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: ordinary.perm("blackBase").permanentId,
        instanceId: ordinary.inst("dragomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => ordinary.perm("blackBase").topCard?.cardId === DRAGOMON);
    expect(ordinary.state.memory).toBe(1);

    const wrongColor = setupEngine({
      0: { battleArea: [{ card: "BT1-015", as: "redBase" }], hand: [{ card: DRAGOMON, as: "dragomon" }] },
    });
    wrongColor.state.memory = 4;
    expect(
      wrongColor.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrongColor.perm("redBase").permanentId,
        instanceId: wrongColor.inst("dragomon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

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
      // The clause is a Modal ("play a [TS] Digimon" / "use a [TS] Option"); option 0 is the
      // play branch this case asserts, and without an answer the resolution never returns.
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 0 },
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

  it("publicly playing Dragomon from hand opens the same On Play clause", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: DRAGOMON, as: "dragomon" },
            { card: TS_CARD, as: "payload" },
          ],
          battleArea: [{ card: LINK_CARD, as: "host", linked: [{ card: LINK_CARD, as: "linkCard" }] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 0 },
    );
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dragomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => inArea(s.state.players[0] as PlayerState, TS_CARD));

    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("linkCard").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("payload").instanceId)).toBe(false);
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
      // The clause is a Modal ("play a [TS] Digimon" / "use a [TS] Option"); option 0 is the
      // play branch this case asserts, and without an answer the resolution never returns.
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 0 },
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

  it("uses a cost-5 TS Option for free after paying the link cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: DRAGOMON, as: "dragomon" },
            { card: LINK_CARD, as: "host", linked: [{ card: LINK_CARD, as: "linkCost" }] },
          ],
          hand: [{ card: "BT25-093", as: "option" }],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferOptionIndex: 1,
      },
    );
    const optionId = s.inst("option").instanceId;
    const linkCostId = s.inst("linkCost").instanceId;
    const memoryBefore = s.state.memory;

    await s.ready();
    await fireTiming(s, EffectTiming.OnPlay, {});
    await settle(() => !s.state.players[0]!.hand.some((card) => card.instanceId === optionId));

    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === linkCostId)).toBe(true);
    expect(
      s.state.players[0]!.trash.some((card) => card.instanceId === optionId) ||
        s.state.players[0]!.battleArea.some((permanent) =>
          permanent.linked.some((card) => card.instanceId === optionId),
        ),
    ).toBe(true);
  });

  it("does not grant the free play when the selected link-card cost fails to move", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: DRAGOMON, as: "dragomon" },
            { card: LINK_CARD, as: "host", linked: [{ card: LINK_CARD, as: "linkCard" }] },
          ],
          hand: [TS_CARD],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 0 },
    );
    const primitives = (s.engine as unknown as { primitives: { trash: (...args: unknown[]) => Promise<never[]> } })
      .primitives;
    primitives.trash = async () => [];

    await s.ready();
    await fireTiming(s, EffectTiming.OnPlay, {});

    expect(s.perm("host").linked).toHaveLength(1);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === TS_CARD)).toBe(true);
    expect(inArea(s.state.players[0]!, TS_CARD)).toBe(false);
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
              card: "BT10-068",
              dp: 4000,
              as: "host",
              under: [{ card: DRAGOMON }], // the inherited source card
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

    const fx = (s.engine as unknown as { primitives: { deletePermanent(ids: string[]): Promise<number> } }).primitives;
    await fx.deletePermanent([hostId]);
    await settle(() => s.perm("host").linked.length === 0);

    expect(p0.battleArea.some((perm) => perm.permanentId === hostId)).toBe(true); // survived
    expect(s.perm("host").linked.length).toBe(0); // the host's own link card paid the cost
    expect(p0.trash.some((c) => c.instanceId === linkCardId)).toBe(true); // -> owner trash
  });

  it("the inherited replacement cannot pay with another Digimon's link card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-068", as: "host", under: [DRAGOMON] },
            { card: LINK_CARD, as: "other", linked: [{ card: LINK_CARD, as: "otherLink" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("host").permanentId;
    await s.ready();
    const deleted = await (
      s.engine as unknown as { primitives: { deletePermanent(ids: string[]): Promise<number> } }
    ).primitives.deletePermanent([hostId]);

    expect(deleted).toBe(1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
    expect(s.perm("other").linked).toHaveLength(1);
  });
});
