import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { advance } from "#api/engine/testkit/advance";
import { assertNoLoudGap, setupEngine, settle } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import { compiled } from "./BT27-037.js";
import "#api/cards/index";

type Session = ReturnType<typeof setupEngine>;

const cardId = "BT27-037";
const shockPlasma = "BT24-092";
const sevenCodeLink = "BT26-010";
const gaiaForce = "ST1-16";
const redSource = "BT1-010";
const blackMachineLevel3 = "BT2-052";
const blueTsLevel3 = "BT24-019";
const yellowLevel3 = "BT1-045";
const redLevel3 = "BT1-009";
const vanillaLevel5 = "BT1-020";

function linkFromHand(s: Session, link: string, host: string) {
  expect(
    s.engine.applyIntent(0, {
      type: "linkCard",
      instanceId: s.inst(link).instanceId,
      targetPermanentId: s.perm(host).permanentId,
    }),
  ).toEqual({ ok: true });
}

async function deleteWithOpponentGaiaForce(s: Session) {
  const optionId = s.inst("gaiaForce").instanceId;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
  await settle(
    () =>
      s.state.pendingDecision === undefined &&
      s.state.players[0]!.trash.some(({ instanceId }) => instanceId === optionId),
  );
}

describe("BT27-037 Guardromon", () => {
  it("matches the printed card and compiles every clause", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Guardromon",
      colors: ["Yellow", "Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [
        { color: "Yellow", level: 3, memoryCost: 3 },
        { color: "Black", level: 3, memoryCost: 3 },
      ],
      forms: ["Champion"],
      attributes: ["Free"],
      types: ["Machine", "Iliad", "TS"],
      rarity: "C",
    });
    expect(digivolutionRequirementsFor(cardId)).toContainEqual({
      level: 3,
      traits: ["Machine", "TS"],
      cost: 2,
      isAlternate: true,
    });
    expect(compiled.keywords).toEqual([{ keyword: "Detach", raw: "＜Detach ([TS] trait)＞" }]);
    expect(compiled.effects.map((effect) => [effect.trigger, effect.frequency, effect.isInherited])).toEqual([
      ["AllTurns", "OncePerTurn", undefined],
      ["Static", undefined, true],
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it.each([
    ["[Machine]", blackMachineLevel3],
    ["[TS]", blueTsLevel3],
  ])("digivolves from a level 3 %s trait Digimon for 2 memory", async (_trait, source) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: source, as: "source" }],
        hand: [{ card: cardId, as: "guardromon" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("guardromon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === cardId);

    expect(s.state.memory).toBe(3);
  });

  it("uses the printed yellow cost from a plain yellow level 3 and rejects the alternate cost from other traits", async () => {
    const yellow = setupEngine({
      0: { battleArea: [{ card: yellowLevel3, as: "source" }], hand: [{ card: cardId, as: "guardromon" }] },
    });
    yellow.state.memory = 5;
    await yellow.ready();
    expect(
      yellow.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: yellow.perm("source").permanentId,
        instanceId: yellow.inst("guardromon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => yellow.perm("source").topCard.cardId === cardId);
    expect(yellow.state.memory).toBe(2);

    const red = setupEngine({
      0: { battleArea: [{ card: redLevel3, as: "source" }], hand: [{ card: cardId, as: "guardromon" }] },
    });
    red.state.memory = 5;
    await red.ready();
    expect(
      red.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: red.perm("source").permanentId,
        instanceId: red.inst("guardromon").instanceId,
        useAlternateCost: true,
      }),
    ).toMatchObject({ ok: false });
    expect(red.perm("source").topCard.cardId).toBe(redLevel3);
  });

  it("draws 1 when it or another of your Digimon gets linked, once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "guardromon" },
            { card: blueTsLevel3, as: "ally" },
          ],
          hand: [
            { card: shockPlasma, as: "firstLink" },
            { card: shockPlasma, as: "secondLink" },
          ],
          deck: [
            { card: "BT1-009", as: "firstDraw" },
            { card: "BT1-009", as: "secondDraw" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    linkFromHand(s, "firstLink", "ally");
    await settle(() => s.perm("ally").linked.length === 1 && s.state.pendingDecision === undefined);
    const handAfterFirst = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
    expect(handAfterFirst).toEqual([s.inst("secondLink").instanceId, s.inst("firstDraw").instanceId]);

    linkFromHand(s, "secondLink", "guardromon");
    await settle(() => s.perm("guardromon").linked.length === 1 && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("firstDraw").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("does not draw when an opponent's Digimon gets linked", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: blueTsLevel3, as: "host" }], hand: [{ card: shockPlasma, as: "link" }] },
        1: { battleArea: [{ card: cardId, as: "guardromon" }], deck: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    linkFromHand(s, "link", "host");
    await settle(() => s.perm("host").linked.length === 1 && s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.deck).toHaveLength(1);
  });

  it("printed Detach trashes a [TS] link so the opponent's Option does not delete it", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: redSource }], hand: [{ card: gaiaForce, as: "gaiaForce" }] },
        1: { battleArea: [{ card: cardId, as: "guardromon", linked: [{ card: shockPlasma, as: "tsLink" }] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    await deleteWithOpponentGaiaForce(s);

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("guardromon").permanentId,
    ]);
    expect(s.perm("guardromon").linked).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("tsLink").instanceId]);
    assertNoLoudGap(s);
  });

  it("printed Detach cannot pay with a link that lacks the [TS] trait", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: redSource }], hand: [{ card: gaiaForce, as: "gaiaForce" }] },
        1: {
          battleArea: [{ card: cardId, as: "guardromon", linked: [{ card: sevenCodeLink, as: "sevenCode" }] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    await deleteWithOpponentGaiaForce(s);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ cardId: trashed }) => trashed).sort()).toEqual(
      [cardId, sevenCodeLink].sort(),
    );
  });

  it("printed Detach does not apply when its controller's own effect deletes it", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: cardId, as: "guardromon", linked: [{ card: shockPlasma, as: "tsLink" }] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const guardromonId = s.perm("guardromon").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([guardromonId], "byEffect")).toBe(1);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId: trashed }) => trashed).sort()).toEqual(
      [cardId, shockPlasma].sort(),
    );
  });

  it.each([
    ["trashes a [TS] link so its host survives", shockPlasma, true],
    ["cannot pay with a link that lacks the [TS] trait", sevenCodeLink, false],
  ])("inherited Detach %s against the opponent's Option", async (_label, link, survives) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: redSource }], hand: [{ card: gaiaForce, as: "gaiaForce" }] },
        1: {
          battleArea: [
            { card: vanillaLevel5, as: "host", under: [{ card: cardId }], linked: [{ card: link, as: "link" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const hostId = s.perm("host").permanentId;
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Detach")).toBe(true);

    await deleteWithOpponentGaiaForce(s);

    const remaining = s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId);
    expect(remaining).toEqual(survives ? [hostId] : []);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("link").instanceId);
    assertNoLoudGap(s);
  });
});
