import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

const CARD_ID = "BT25-083";

describe("BT25-083 LadyDevimon", () => {
  it("legally alternate-digivolves for 3 from an off-color level 4 with the TS trait", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT24-022", as: "blueTs" }], hand: [{ card: CARD_ID, as: "lady" }] } },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueTs").permanentId,
        instanceId: s.inst("lady").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("blueTs").topCard.instanceId === s.inst("lady").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("publicly ordinary-digivolves from purple level 4 for 3 and rejects a blue source on that route", async () => {
    const legal = setupEngine({
      0: { battleArea: [{ card: "BT25-081", as: "purpleBase" }], hand: [{ card: CARD_ID, as: "lady" }] },
    });
    legal.state.memory = 3;
    await legal.ready();
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("purpleBase").permanentId,
        instanceId: legal.inst("lady").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("purpleBase").topCard?.cardId === CARD_ID);
    expect(legal.state.memory).toBe(0);
    expect(legal.perm("purpleBase").stack.map((card) => card.cardId)).toEqual(["BT25-081"]);

    const wrongColor = setupEngine({
      0: { battleArea: [{ card: "AD1-010", as: "blueSource" }], hand: [{ card: CARD_ID, as: "lady" }] },
    });
    wrongColor.state.memory = 3;
    await wrongColor.ready();
    expect(
      wrongColor.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrongColor.perm("blueSource").permanentId,
        instanceId: wrongColor.inst("lady").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(wrongColor.perm("blueSource").topCard.cardId).toBe("AD1-010");
    expect(wrongColor.state.memory).toBe(3);
  });

  it("places a Three Musketeers trait card from trash at the true bottom, then draws", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "lady", under: [{ card: "BT25-081", as: "oldBottom" }] }],
          trash: [{ card: "BT25-085", as: "musketeer" }],
          deck: [{ card: "AD1-002", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("lady"));
    expect(s.perm("lady").stack.map((card) => card.instanceId)).toEqual([
      s.inst("musketeer").instanceId,
      s.inst("oldBottom").instanceId,
    ]);
    expect(s.perm("lady").stack[0]!.faceUp).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
  });

  it("declining the placement leaves every zone unchanged and does not draw", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "lady" }],
          hand: [{ card: "BT25-085", as: "musketeer" }],
          deck: [{ card: "AD1-002", as: "top" }],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("lady"));
    expect(s.perm("lady").stack.some((card) => card.instanceId === s.inst("musketeer").instanceId)).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("musketeer").instanceId]);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("top").instanceId);
  });

  it("Q6395 trashes and uses the same physical dual Option from sources, paying cost minus 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "lady" },
            { card: "BT25-081", as: "other" },
          ],
          hand: [{ card: "BT25-085", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    await advance(s.engine).verb.placeUnder(s.perm("other").permanentId, [s.inst("option").instanceId]);
    // Use the attack window so this proof isolates the source-use effect. In the
    // When Digivolving window LadyDevimon's independent place-and-draw effect is
    // simultaneous and may legally put the used card back under a Digimon afterward.
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("lady"), {
      attackerPermanentId: s.perm("lady").permanentId,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(s.state.memory).toBe(2);
    expect(s.perm("other").stack.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(false);
    expect(s.state.players[0]!.trash.filter((card) => card.instanceId === s.inst("option").instanceId)).toHaveLength(1);
  });

  it("Q6394 offers both simultaneous When Digivolving effects to the controller for ordering", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "lady", under: [{ card: "BT25-081", as: "base" }] }],
          hand: [{ card: "BT25-085", as: "sourceOption" }, { card: "BT25-085", as: "placementCard" }],
          deck: ["AD1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );
    await s.ready();
    await advance(s.engine).verb.placeUnder(s.perm("lady").permanentId, [s.inst("sourceOption").instanceId]);
    const resolving = advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("lady"));
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const pending = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === pending.decisionId)!.req;
    const keys = request.options?.triggerKeys ?? [];
    expect(keys).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`${CARD_ID}/when-digivolving-place-draw`),
        expect.stringContaining(`${CARD_ID}/trash-source-use-option`),
      ]),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "orderTriggers", order: [keys[0]!] },
      }),
    ).toEqual({ ok: true });
    await resolving;
  });

  it("shares one physical Once Per Turn between When Digivolving and When Attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: CARD_ID,
              as: "lady",
              under: [
                { card: "BT25-081", as: "base" },
              ],
            },
          ],
          hand: [{ card: "BT25-085", as: "first" }, { card: "BT25-085", as: "second" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    await advance(s.engine).verb.placeUnder(s.perm("lady").permanentId, [s.inst("first").instanceId, s.inst("second").instanceId]);
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("lady"));
    const sourcesAfterFirst = s.perm("lady").stack.map((card) => card.instanceId);
    const memoryAfterFirst = s.state.memory;
    expect(memoryAfterFirst).toBeLessThan(10);
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("lady"), {
      attackerPermanentId: s.perm("lady").permanentId,
    });
    expect(s.perm("lady").stack.map((card) => card.instanceId)).toEqual(sourcesAfterFirst);
    expect(s.state.memory).toBe(memoryAfterFirst);
  });

  it("inherited On Deletion plays a level 4 card whose full text contains Three Musketeers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-084", as: "host", under: [{ card: CARD_ID, as: "ladySource" }] }],
          trash: [{ card: "EX7-043", as: "textMatch" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("textMatch").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("textMatch").instanceId)).toBe(
      true,
    );
    expect(s.state.memory).toBe(0);
  });
});
