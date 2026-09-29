import { describe, it, expect } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import "./BT12-112.js";
import "./BT12-008.js";
import "../BT9/BT9-109.js";
import "../BT10/BT10-018.js";
import "../BT10/BT10-034.js";
import "../BT10/BT10-049.js";
import "../BT10/BT10-058.js";
import "../BT17/BT17-077.js";

const BT12_112 = "BT12-112";
const SHOUTMON = "BT12-008";

describe("BT12-112 ＜when played＞ cost reduction (place 1 [Shoutmon] → -1)", () => {
  it("registers the complete DigiXros and declarative replacement IR", async () => {
    const { runtimeCompiledCard } = await import("../../engine/effects/interpreter/compiledCards.js");
    const card = runtimeCompiledCard(BT12_112)!;
    expect(card.coverage).toBe("full");
    expect(card.residual).toEqual([]);
    expect(card.digiXrosRequirement).toEqual([
      {
        materials: [{ traits: ["Xros Heart", "Blue Flare", "BlueFlare"], differentCardNumbers: true }],
        count: "∞",
        costReduction: 1,
      },
    ]);
    const onPlay = card.effects.find((effect) => effect.trigger === "OnPlay");
    expect(onPlay?.actions).toEqual([
      expect.objectContaining({ kind: "Return", order: "any", returnDigivolutionCardsFirst: true }),
    ]);
    expect(card.effects.some((effect) => effect.trigger === "Static")).toBe(true);
    expect(card.effects.find((effect) => effect.trigger === "Static")?.actions).toEqual([
      expect.objectContaining({
        kind: "Replacement",
        actions: [
          expect.objectContaining({
            kind: "SelectBind",
            target: expect.objectContaining({
              filter: expect.objectContaining({
                controller: "mine",
                nameOrTrait: [{ tokens: ["Shoutmon"], match: "name" }],
              }),
            }),
          }),
          expect.anything(),
          expect.anything(),
        ],
      }),
    ]);
    const yourTurn = card.effects.find((effect) => effect.trigger === "YourTurn");
    expect(yourTurn?.actions).toEqual([
      expect.objectContaining({
        kind: "DisableSecurityEffect",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        sourceKind: "option",
        scope: "seat",
        duration: "forTheTurn",
      }),
    ]);
  });

  it("registers the printed On Play, opponent-action, and turn security-lock effects", () => {
    const module = getEffectModule(BT12_112);
    const source = { instanceId: "source-112", cardId: BT12_112, ownerSeat: 0, isOnBattleArea: () => true } as never;
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.BeforePayCost, source)).toHaveLength(0);
    expect(module!.effectsForTiming(EffectTiming.None, source)).toHaveLength(2);
  });

  it("accepts the minimum one-card DigiXros and charges one memory less", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: BT12_112, as: "x7" },
            { card: "BT12-008", as: "single-xros" },
          ],
        },
        1: { battleArea: [{ card: "BT12-008", as: "opponent-shoutmon" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 14;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("x7").instanceId,
        digiXros: { materialInstanceIds: [s.inst("single-xros").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === BT12_112) && s.state.memory === 0,
    );

    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.perm("x7").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("single-xros").instanceId]);
  });

  it("rejects two copies of the same card number as DigiXros materials", () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: BT12_112, as: "x7" },
          { card: "BT12-008", as: "first-copy" },
          { card: "BT12-008", as: "second-copy" },
        ],
      },
    });
    s.state.memory = 14;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("x7").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("first-copy").instanceId, s.inst("second-copy").instanceId],
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("x7").instanceId,
      s.inst("first-copy").instanceId,
      s.inst("second-copy").instanceId,
    ]);
  });

  it("plays at cost 14 (15 - 1), placing the [Shoutmon] as a digivolution card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: SHOUTMON, dp: 3000, as: "shoutmon", under: [{ card: "BT1-009", as: "source-stack" }] }],
          hand: [{ card: BT12_112, as: "card" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0];
    s.state.memory = 14;

    const res = s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId });
    expect(res).toEqual({ ok: true });

    const shoutmonPermanentId = s.perm("shoutmon").permanentId;
    const sourceStackId = s.inst("source-stack").instanceId;
    await settle(
      () => (p0?.battleArea.some((p) => p.topCard?.cardId === BT12_112) ?? false) && s.state.memory === 0,
      400,
    );

    const played = p0?.battleArea.find((p) => p.topCard?.cardId === BT12_112);
    expect(played).toBeDefined();
    expect(s.state.memory).toBe(0);
    expect(p0?.battleArea.some((p) => p.permanentId === shoutmonPermanentId)).toBe(false);
    expect(played?.stack.map((c) => c.cardId)).toEqual([SHOUTMON]);
    expect(s.state.players[0]?.trash.map(({ instanceId }) => instanceId)).toContain(sourceStackId);
  });

  it("declining the optional cost plays at the full cost (15), with the [Shoutmon] untouched", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: SHOUTMON, dp: 3000, as: "shoutmon", under: [{ card: "BT1-009", as: "source-stack" }] }],
          hand: [{ card: BT12_112, as: "card" }],
        },
      },
      { autoSelectCards: true },
    );
    const p0 = s.state.players[0];
    s.state.memory = 15;

    const res = s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId });
    expect(res).toEqual({ ok: true });

    const shoutmonPermanentId = s.perm("shoutmon").permanentId;
    const sourceStackId = s.inst("source-stack").instanceId;
    await settle(() => s.decisions.some((d) => d.req.kind === "optional"), 400);
    const prompt = s.decisions.find((d) => d.req.kind === "optional");
    if (prompt !== undefined) {
      s.engine.applyIntent(prompt.seat, {
        type: "respondDecision",
        decisionId: prompt.req.decisionId,
        response: { kind: "optional", accept: false },
      });
    }
    await settle(
      () => (p0?.battleArea.some((p) => p.topCard?.cardId === BT12_112) ?? false) && s.state.memory === 0,
      400,
    );

    const played = p0?.battleArea.find((p) => p.topCard?.cardId === BT12_112);
    expect(played).toBeDefined();
    expect(s.state.memory).toBe(0);
    expect(p0?.battleArea.some((p) => p.permanentId === shoutmonPermanentId)).toBe(true);
    expect(played?.stack.length ?? 0).toBe(0);
    expect(s.perm("shoutmon").stack.map(({ instanceId }) => instanceId)).toEqual([sourceStackId]);
  });

  it("returns an opponent's complete stack to the owner's deck bottom before its top card", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: BT12_112, as: "x7" }] },
        1: {
          deck: [{ card: "BT1-015", as: "sentinel" }],
          battleArea: [
            {
              card: "BT12-008",
              as: "opponent-host",
              under: [
                { card: "BT1-009", as: "bottom-source" },
                { card: "BT1-010", as: "upper-source" },
              ],
            },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: false },
    );
    s.state.memory = 15;
    const sentinelId = s.inst("sentinel").instanceId;
    const sourceIds = [s.inst("bottom-source").instanceId, s.inst("upper-source").instanceId];
    const hostId = s.perm("opponent-host").topCard!.instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("x7").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const orderDecision = s.state.pendingDecision;
    expect(orderDecision?.kind).toBe("orderCards");
    expect(JSON.parse(orderDecision!.payloadJson)).toMatchObject({
      candidateInstanceIds: sourceIds,
      visibleInstanceIds: sourceIds,
      orderDestination: "deckBottom",
    });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: orderDecision!.decisionId,
        response: { kind: "orderCards", order: [sourceIds[1]!, sourceIds[0]!] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === BT12_112),
    );

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      sentinelId,
      sourceIds[1]!,
      sourceIds[0]!,
      hostId,
    ]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });
});

it("suppresses opponent Option Security effects only for source-owner attackers", async () => {
  const s = setupEngine({
    0: {
      battleArea: [
        { card: BT12_112, as: "x7" },
        { card: "BT1-009", as: "owner-attacker" },
      ],
    },
    1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
  });
  await s.ready();
  const security = observe(s.engine);
  expect(security.suppressesSecurityEffect(s.perm("owner-attacker"), "BT12-101")).toBe(true);
  expect(security.suppressesSecurityEffect(s.perm("attacker"), "BT12-101")).toBe(false);
});

const X_ANTIBODY = "BT9-109";
const DORULUMON_XROS_HEART = "BT10-034";
const GAOSSMON_BLUE_FLARE = "BT10-018";
const BALLISTAMON_XROS_HEART = "BT10-049";
const MONITAMON_XROS_HEART = "BT10-058";
const AGUMON_NO_TRAIT = "BT1-009";

function playedX7(s: EngineSetup) {
  return s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === BT12_112);
}

async function settlePlayedX7(s: EngineSetup): Promise<void> {
  await settle(() => playedX7(s) !== undefined && s.state.pendingDecision === undefined, 400);
}

describe("BT12-112 Shoutmon X7: Superior Mode — KB Q&A rulings", () => {
  it("only places a [Shoutmon] from the battle area, never from hand, trash, or breeding area (Q2249)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: BT12_112, as: "x7" },
            { card: SHOUTMON, as: "hand-shoutmon" },
          ],
          trash: [{ card: SHOUTMON, as: "trash-shoutmon" }],
          breeding: { card: SHOUTMON, as: "breeding-shoutmon" },
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 15;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("x7").instanceId })).toEqual({ ok: true });
    await settlePlayedX7(s);

    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(false);
    expect(s.state.memory).toBe(0);
    expect(playedX7(s)!.stack).toHaveLength(0);
    const player = s.state.players[0]!;
    expect(player.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("hand-shoutmon").instanceId]);
    expect(player.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("trash-shoutmon").instanceId]);
    expect(player.breeding?.topCard?.instanceId).toBe(s.inst("breeding-shoutmon").instanceId);

    const control = setupEngine(
      {
        0: {
          battleArea: [{ card: SHOUTMON, as: "field-shoutmon" }],
          hand: [
            { card: BT12_112, as: "x7" },
            { card: SHOUTMON, as: "hand-shoutmon" },
          ],
          trash: [{ card: SHOUTMON, as: "trash-shoutmon" }],
          breeding: { card: SHOUTMON, as: "breeding-shoutmon" },
        },
      },
      { autoAcceptOptional: true },
    );
    control.state.memory = 14;
    const fieldShoutmonId = control.perm("field-shoutmon").topCard!.instanceId;

    expect(control.engine.applyIntent(0, { type: "playCard", instanceId: control.inst("x7").instanceId })).toEqual({
      ok: true,
    });
    await settlePlayedX7(control);

    expect(control.state.memory).toBe(0);
    expect(playedX7(control)!.stack.map(({ instanceId }) => instanceId)).toEqual([fieldShoutmonId]);
    const controlPlayer = control.state.players[0]!;
    expect(controlPlayer.hand.map(({ instanceId }) => instanceId)).toEqual([control.inst("hand-shoutmon").instanceId]);
    expect(controlPlayer.trash.map(({ instanceId }) => instanceId)).toEqual([
      control.inst("trash-shoutmon").instanceId,
    ]);
    expect(controlPlayer.breeding?.topCard?.instanceId).toBe(control.inst("breeding-shoutmon").instanceId);
  });

  it("trashes the digivolution cards of the [Shoutmon] it places under this Digimon (Q2250)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: SHOUTMON,
              as: "shoutmon",
              under: [
                { card: "BT1-001", as: "bottom-source" },
                { card: "BT1-009", as: "upper-source" },
              ],
            },
          ],
          hand: [{ card: BT12_112, as: "x7" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 14;
    const shoutmonCardId = s.perm("shoutmon").topCard!.instanceId;
    const sourceIds = [s.inst("bottom-source").instanceId, s.inst("upper-source").instanceId];

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("x7").instanceId })).toEqual({ ok: true });
    await settlePlayedX7(s);

    expect(s.state.memory).toBe(0);
    expect(playedX7(s)!.stack.map(({ instanceId }) => instanceId)).toEqual([shoutmonCardId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId).sort()).toEqual([...sourceIds].sort());
  });

  it.fails("still trashes a [X Antibody] under the placed [Shoutmon] by rule (Q2251)", async () => {
    const effectTrashControl = setupEngine({
      0: {
        battleArea: [
          {
            card: SHOUTMON,
            as: "shoutmon",
            under: [
              { card: AGUMON_NO_TRAIT, as: "other-source" },
              { card: X_ANTIBODY, as: "x-antibody" },
            ],
          },
        ],
      },
    });
    await effectTrashControl.ready();
    await advance(effectTrashControl.engine).verb.trashDigivolutionCards(
      effectTrashControl.perm("shoutmon").permanentId,
      [effectTrashControl.inst("other-source").instanceId, effectTrashControl.inst("x-antibody").instanceId],
      0,
    );
    expect(effectTrashControl.perm("shoutmon").stack.map(({ cardId }) => cardId)).toEqual([X_ANTIBODY]);

    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: SHOUTMON, as: "shoutmon", under: [{ card: X_ANTIBODY, as: "x-antibody" }] }],
          hand: [{ card: BT12_112, as: "x7" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 14;
    const shoutmonCardId = s.perm("shoutmon").topCard!.instanceId;
    const xAntibodyId = s.inst("x-antibody").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("x7").instanceId })).toEqual({ ok: true });
    await settlePlayedX7(s);

    expect(playedX7(s)!.stack.map(({ instanceId }) => instanceId)).toEqual([shoutmonCardId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([xAntibodyId]);
  });

  it("places the [Shoutmon] first, then DigiXros materials under that [Shoutmon] (Q2252)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: SHOUTMON, as: "shoutmon" }],
          hand: [
            { card: BT12_112, as: "x7" },
            { card: DORULUMON_XROS_HEART, as: "material" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 13;
    const shoutmonCardId = s.perm("shoutmon").topCard!.instanceId;
    const materialId = s.inst("material").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("x7").instanceId,
        digiXros: { materialInstanceIds: [materialId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional", 400);

    const prompt = s.state.pendingDecision!;
    expect(prompt.kind).toBe("optional");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(materialId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: prompt.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settlePlayedX7(s);

    expect(s.state.memory).toBe(0);
    expect(playedX7(s)!.stack.map(({ instanceId }) => instanceId)).toEqual([materialId, shoutmonCardId]);
  });

  it.fails("can DigiXros with the cards trashed from under the placed [Shoutmon] (Q2253)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: SHOUTMON,
              as: "shoutmon",
              under: [
                { card: DORULUMON_XROS_HEART, as: "xros-heart-source" },
                { card: GAOSSMON_BLUE_FLARE, as: "blue-flare-source" },
              ],
            },
          ],
          hand: [{ card: BT12_112, as: "x7" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;
    const shoutmonCardId = s.perm("shoutmon").topCard!.instanceId;
    const sourceIds = [s.inst("xros-heart-source").instanceId, s.inst("blue-flare-source").instanceId];

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("x7").instanceId,
        digiXros: { materialInstanceIds: sourceIds },
      }),
    ).toEqual({ ok: true });
    await settlePlayedX7(s);

    expect(s.state.memory).toBe(0);
    expect(playedX7(s)!.stack.map(({ instanceId }) => instanceId)).toEqual([...sourceIds, shoutmonCardId]);
    expect(s.state.players[0]!.trash).toEqual([]);
  });

  it("DigiXros accepts any number of [Xros Heart] or [Blue Flare] cards with different card numbers (Q2254)", async () => {
    const board = {
      0: {
        hand: [
          { card: BT12_112, as: "x7" },
          { card: DORULUMON_XROS_HEART, as: "dorulumon" },
          { card: GAOSSMON_BLUE_FLARE, as: "gaossmon" },
          { card: BALLISTAMON_XROS_HEART, as: "ballistamon" },
          { card: MONITAMON_XROS_HEART, as: "monitamon" },
          { card: MONITAMON_XROS_HEART, as: "second-monitamon" },
          { card: AGUMON_NO_TRAIT, as: "agumon" },
        ],
      },
    };
    const s = setupEngine(board, { autoSelectCards: true });
    s.state.memory = 11;
    const traitMaterials = ["dorulumon", "gaossmon", "ballistamon", "monitamon"].map(
      (alias) => s.inst(alias).instanceId,
    );

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("x7").instanceId,
        digiXros: { materialInstanceIds: [...traitMaterials, s.inst("agumon").instanceId] },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("x7").instanceId,
        digiXros: { materialInstanceIds: [...traitMaterials, s.inst("second-monitamon").instanceId] },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("x7").instanceId,
        digiXros: { materialInstanceIds: traitMaterials },
      }),
    ).toEqual({ ok: true });
    await settlePlayedX7(s);

    expect(s.state.memory).toBe(0);
    expect(
      playedX7(s)!
        .stack.map(({ instanceId }) => instanceId)
        .sort(),
    ).toEqual([...traitMaterials].sort());
  });
  it("does not treat placing 0 cards as DigiXros, so the play cost is not reduced (Q2255)", async () => {
    const s = setupEngine({ 0: { hand: [{ card: BT12_112, as: "x7" }] } }, { autoSelectCards: true });
    s.state.memory = 15;
    const x7Id = s.inst("x7").instanceId;

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: x7Id, digiXros: { materialInstanceIds: [] } }),
    ).toEqual({ ok: false, reason: "no-materials" });
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([x7Id]);
    expect(s.state.memory).toBe(15);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: x7Id })).toEqual({ ok: true });
    await settlePlayedX7(s);
    expect(s.state.memory).toBe(0);
    expect(playedX7(s)!.stack).toHaveLength(0);

    const control = setupEngine(
      {
        0: {
          hand: [
            { card: BT12_112, as: "x7" },
            { card: DORULUMON_XROS_HEART, as: "material" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    control.state.memory = 15;
    expect(
      control.engine.applyIntent(0, {
        type: "playCard",
        instanceId: control.inst("x7").instanceId,
        digiXros: { materialInstanceIds: [control.inst("material").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settlePlayedX7(control);
    expect(control.state.memory).toBe(1);
  });

  it("allows a DigiXros material with the same card number as the [Shoutmon] placed by the play effect (Q2256)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: SHOUTMON, as: "field-shoutmon" }],
          hand: [
            { card: BT12_112, as: "x7" },
            { card: SHOUTMON, as: "hand-shoutmon" },
            { card: SHOUTMON, as: "second-hand-shoutmon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 13;
    const x7Id = s.inst("x7").instanceId;
    const fieldShoutmonId = s.perm("field-shoutmon").topCard!.instanceId;
    const handShoutmonId = s.inst("hand-shoutmon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: x7Id,
        digiXros: { materialInstanceIds: [handShoutmonId, s.inst("second-hand-shoutmon").instanceId] },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: x7Id,
        digiXros: { materialInstanceIds: [handShoutmonId] },
      }),
    ).toEqual({ ok: true });
    await settlePlayedX7(s);

    expect(s.state.memory).toBe(0);
    expect(playedX7(s)!.stack.map(({ instanceId }) => instanceId)).toEqual([handShoutmonId, fieldShoutmonId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("counts this multicolor card as a white level 7 card returned by [Imperialdramon: Paladin Mode] (Q2848)", async () => {
    async function digivolveIntoPaladinWithTrash(trashCardId: string) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT8-032", as: "imperialdramon", under: [{ card: AGUMON_NO_TRAIT }] }],
            hand: [{ card: "BT17-077", as: "paladin" }],
            deck: [{ card: "BT1-010" }],
            trash: [{ card: trashCardId, as: "returned" }],
          },
        },
        { autoChooseOption: true, autoSelectCards: true },
      );
      s.state.memory = 9;
      await s.ready();
      const returnedId = s.inst("returned").instanceId;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("imperialdramon").permanentId,
          instanceId: s.inst("paladin").instanceId,
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.players[0]!.deck.some(({ instanceId }) => instanceId === returnedId) &&
          s.state.pendingDecision === undefined,
        400,
      );
      expect(s.state.players[0]!.trash).toHaveLength(0);
      return s.state.memory;
    }

    expect(await digivolveIntoPaladinWithTrash(BT12_112)).toBe(7);
    expect(await digivolveIntoPaladinWithTrash("BT12-057")).toBe(4);
  });
});
