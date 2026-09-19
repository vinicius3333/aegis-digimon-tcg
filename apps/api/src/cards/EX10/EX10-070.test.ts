import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-070.js";
import "../index.js";

const CARD_ID = "EX10-070";

function delayBoard(options?: {
  material?: "trash" | "hand" | "none";
  opponentTrasher?: boolean;
  host?: "appmon" | "maquinamon";
}) {
  const material = options?.material ?? "trash";
  const host = options?.host ?? "appmon";
  const hostCard = host === "appmon" ? "EX10-029" : "EX11-027";
  const linkCard = host === "appmon" ? "BT24-053" : "EX11-027";
  return {
    0: {
      hand: [
        { card: CARD_ID, as: "option" },
        ...(options?.opponentTrasher === true ? [] : [{ card: "BT25-073", as: "dragomon" }]),
        ...(material === "hand" ? [{ card: "BT24-053", as: "material" }] : []),
      ],
      battleArea: [{ card: hostCard, as: "host", linked: [{ card: linkCard, as: "linkCard" }] }],
      trash: material === "trash" ? [{ card: "BT24-053", as: "material" }] : [],
      deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-009", "BT1-009"],
      security: ["BT1-013", "BT1-014"],
    },
    1: {
      hand: [...(options?.opponentTrasher === true ? [{ card: "BT25-073", as: "theirDragomon" }] : [])],
      battleArea:
        options?.opponentTrasher === true
          ? [{ card: "EX10-029", as: "theirHost", linked: [{ card: "BT24-053", as: "theirLinkCard" }] }]
          : [],
      deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-009", "BT1-009"],
      security: ["BT1-013", "BT1-014"],
    },
  };
}

function optionals(s: EngineSetup) {
  return s.decisions.filter(({ req }) => req.kind === "optional");
}

async function answerOptionals(s: EngineSetup, plan: boolean[]): Promise<void> {
  let handled = 0;
  for (const accept of plan) {
    await settle(() => optionals(s).length > handled);
    const pending = optionals(s)[handled];
    if (pending === undefined) return;
    handled += 1;
    s.engine.applyIntent(pending.seat, {
      type: "respondDecision",
      decisionId: pending.req.decisionId,
      response: { kind: "optional", accept },
    });
  }
}

async function playOption(s: EngineSetup): Promise<void> {
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === CARD_ID));
}

describe("EX10-070 God Grade Unleashed", () => {
  it("matches the catalog and compiles all four printed clauses", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      set: "EX10",
      nameEn: "God Grade Unleashed",
      colors: ["Black"],
      kinds: ["Option"],
      playCost: 2,
      dp: 0,
      evoCosts: [],
      forms: ["-"],
      attributes: ["-"],
      types: ["Appmon", "Leviathan"],
      securityEffectText: "[Security] Place this card in the battle area.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toHaveLength(4);
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Static",
          actions: [
            expect.objectContaining({
              kind: "WaiveColorRequirement",
              condition: expect.objectContaining({
                kind: "youHave",
                filter: expect.objectContaining({
                  kind: ["Digimon", "Tamer"],
                  nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
                }),
              }),
            }),
          ],
        }),
        expect.objectContaining({
          trigger: "Main",
          actions: [
            expect.objectContaining({ kind: "Draw", controller: "mine", amount: 1 }),
            expect.objectContaining({ kind: "PlaceInBattleAreaSelf" }),
          ],
        }),
        expect.objectContaining({
          trigger: "AllTurns",
          keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
          actions: [
            expect.objectContaining({
              kind: "SubTrigger",
              event: "whenLinkTrashed",
              sourceFilter: { controller: "mine", kind: ["Digimon"] },
              actions: [
                expect.objectContaining({
                  kind: "Link",
                  from: ["trash"],
                  payCost: false,
                  optional: true,
                  target: expect.objectContaining({
                    filter: expect.objectContaining({
                      controller: "mine",
                      zone: "trash",
                      kind: ["Digimon"],
                      nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
                    }),
                  }),
                  recipient: expect.objectContaining({ sourceRef: "triggerSubject", count: 1 }),
                }),
              ],
            }),
          ],
        }),
        expect.objectContaining({
          trigger: "Security",
          isSecurity: true,
          actions: [expect.objectContaining({ kind: "PlaceInBattleAreaSelf" })],
        }),
      ]),
    );
  });

  it("is refused as color-requirement-unmet with no [Appmon] and no Black permanent", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: CARD_ID, as: "option" }],
        battleArea: [{ card: "BT1-009", as: "plain" }],
        deck: ["BT1-013", "BT1-014"],
      },
    });
    await s.ready();
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual([CARD_ID]);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.memory).toBe(5);
  });

  it("plays off an [Appmon] DIGIMON of another colour, ignoring the Black requirement", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: CARD_ID, as: "option" }],
        battleArea: [{ card: "BT23-007", as: "appmon" }],
        deck: ["BT1-013", "BT1-014"],
      },
    });
    await s.ready();
    s.state.memory = 5;

    await playOption(s);

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === CARD_ID)).toBe(true);
  });

  it("plays off an [Appmon] TAMER of another colour ('a Digimon or Tamer')", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: CARD_ID, as: "option" }],
        battleArea: [{ card: "BT21-084", as: "appmonTamer" }],
        deck: ["BT1-013", "BT1-014"],
      },
    });
    await s.ready();
    s.state.memory = 5;

    await playOption(s);

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === CARD_ID)).toBe(true);
  });

  it("plays when the only [Appmon] Digimon is in the breeding area", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: CARD_ID, as: "option" }],
        breeding: { card: "BT26-084", as: "copipemon" },
        deck: ["BT1-013", "BT1-014"],
      },
    });
    await s.ready();
    s.state.memory = 5;

    await playOption(s);

    expect(s.state.players[0]!.breeding?.topCard.cardId).toBe("BT26-084");
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === CARD_ID)).toBe(true);
  });

  it("[Main] draws exactly the top card of deck, pays 2 memory and places itself in the battle area", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: CARD_ID, as: "option" }],
        battleArea: [{ card: "EX10-029", as: "appmon" }],
        deck: ["BT1-013", "BT1-014"],
      },
    });
    await s.ready();
    s.state.memory = 5;

    await playOption(s);
    await settle(() => false, 30);
    await s.ready();

    const p0 = s.state.players[0]!;
    expect(p0.hand.map(({ cardId }) => cardId)).toEqual(["BT1-013"]);
    expect(p0.deck.map(({ cardId }) => cardId)).toEqual(["BT1-014"]);
    expect(p0.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["EX10-029", CARD_ID]);
    expect(p0.trash).toHaveLength(0);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("§16-17-3: the ＜Delay＞ cannot be activated on the turn the Option entered the battle area", async () => {
    const s = setupEngine(delayBoard(), { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true });
    await s.ready();
    const p0 = s.state.players[0]!;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;

    await playOption(s);
    const linkCardId = s.inst("linkCard").instanceId;
    const materialId = s.inst("material").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dragomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => p0.trash.some(({ instanceId }) => instanceId === linkCardId));
    await settle(() => false, 60);
    await s.ready();

    expect(p0.battleArea.some(({ topCard }) => topCard?.cardId === CARD_ID)).toBe(true);
    expect(s.perm("host").linked).toHaveLength(0);
    expect(p0.trash.map(({ instanceId }) => instanceId)).toContain(materialId);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("on a later turn, activates the ＜Delay＞: trashes itself and free-links an [Appmon] from trash to that Digimon", async () => {
    const s = setupEngine(delayBoard(), { autoSelectCards: true, autoChooseOption: true });
    await s.ready();
    const p0 = s.state.players[0]!;
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    await playOption(s);
    const optionId = s.inst("option").instanceId;
    const linkCardId = s.inst("linkCard").instanceId;
    const materialId = s.inst("material").instanceId;
    advance(s.engine).endMainPhaseIfOpen(0);

    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(p0.battleArea.some(({ topCard }) => topCard?.instanceId === optionId)).toBe(true);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dragomon").instanceId })).toEqual({
      ok: true,
    });
    await answerOptionals(s, [true, true, true]);
    await settle(() => s.perm("host").linked.some(({ instanceId }) => instanceId === materialId));
    await settle(() => false, 60);
    await s.ready();

    expect(p0.battleArea.some(({ topCard }) => topCard?.instanceId === optionId)).toBe(false);
    expect(p0.trash.map(({ instanceId }) => instanceId)).toContain(optionId);
    expect(s.perm("host").linked.map(({ instanceId }) => instanceId)).toEqual([materialId]);
    expect(p0.trash.map(({ instanceId }) => instanceId)).not.toContain(materialId);
    expect(p0.trash.map(({ instanceId }) => instanceId)).toContain(linkCardId);
    expect(s.perm("host").topCard?.cardId).toBe("EX10-029");
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("activates once when Detach trashes a link during an opponent effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "source" }],
          hand: [{ card: "ST1-16", as: "gaiaForce" }],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "EX10-070", as: "delay" },
            { card: "BT26-019", as: "holder", linked: [{ card: "BT26-010", as: "paymentLink" }] },
          ],
          trash: [{ card: "BT24-053", as: "material" }],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gaiaForce").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.perm("holder").linked.some(({ instanceId }) => instanceId === s.inst("material").instanceId) &&
        s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("delay").instanceId),
    );

    expect(s.perm("holder").linked.map(({ instanceId }) => instanceId)).toEqual([s.inst("material").instanceId]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("paymentLink").instanceId, s.inst("delay").instanceId]),
    );
    expect(s.perm("holder").linked).toHaveLength(1);
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("declining the ＜Delay＞ leaves the Option on the field and links nothing", async () => {
    const s = setupEngine(delayBoard(), { autoSelectCards: true, autoChooseOption: true });
    await s.ready();
    const p0 = s.state.players[0]!;
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    await playOption(s);
    const optionId = s.inst("option").instanceId;
    const materialId = s.inst("material").instanceId;
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dragomon").instanceId })).toEqual({
      ok: true,
    });
    await answerOptionals(s, [true, false]);
    await settle(() => false, 60);
    await s.ready();

    expect(p0.battleArea.some(({ topCard }) => topCard?.instanceId === optionId)).toBe(true);
    expect(s.perm("host").linked).toHaveLength(0);
    expect(p0.trash.map(({ instanceId }) => instanceId)).toContain(materialId);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not offer the ＜Delay＞ when the only [Appmon] link material is in HAND, not the trash", async () => {
    const s = setupEngine(delayBoard({ material: "hand", host: "maquinamon" }), {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
    });
    await s.ready();
    const p0 = s.state.players[0]!;
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    await playOption(s);
    const optionId = s.inst("option").instanceId;
    const materialId = s.inst("material").instanceId;
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    const linkCardId = s.inst("linkCard").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dragomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => p0.trash.some(({ instanceId }) => instanceId === linkCardId));
    await settle(() => false, 60);
    await s.ready();

    expect(p0.battleArea.some(({ topCard }) => topCard?.instanceId === optionId)).toBe(true);
    expect(s.perm("host").linked).toHaveLength(0);
    expect(p0.hand.map(({ instanceId }) => instanceId)).toContain(materialId);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not offer the ＜Delay＞ when the trash holds no linkable [Appmon] Digimon card", async () => {
    const board = delayBoard({ material: "none", host: "maquinamon" });
    board[0].trash = [{ card: "BT1-009", as: "wrongMaterial" }];
    const s = setupEngine(board, { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true });
    await s.ready();
    const p0 = s.state.players[0]!;
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    await playOption(s);
    const optionId = s.inst("option").instanceId;
    const wrongMaterialId = s.inst("wrongMaterial").instanceId;
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    const linkCardId = s.inst("linkCard").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dragomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => p0.trash.some(({ instanceId }) => instanceId === linkCardId));
    await settle(() => false, 60);
    await s.ready();

    expect(p0.battleArea.some(({ topCard }) => topCard?.instanceId === optionId)).toBe(true);
    expect(s.perm("host").linked).toHaveLength(0);
    expect(p0.trash.map(({ instanceId }) => instanceId)).toContain(wrongMaterialId);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not arm for an OPPONENT's Digimon's link card ('any of YOUR Digimon's')", async () => {
    const s = setupEngine(delayBoard({ opponentTrasher: true }), {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
    });
    await s.ready();
    const p0 = s.state.players[0]!;
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    await playOption(s);
    const optionId = s.inst("option").instanceId;
    const materialId = s.inst("material").instanceId;
    advance(s.engine).endMainPhaseIfOpen(0);

    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;
    const theirLinkCardId = s.inst("theirLinkCard").instanceId;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("theirDragomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some(({ instanceId }) => instanceId === theirLinkCardId));
    await settle(() => false, 60);
    await s.ready();

    expect(p0.battleArea.some(({ topCard }) => topCard?.instanceId === optionId)).toBe(true);
    expect(p0.trash.map(({ instanceId }) => instanceId)).toContain(materialId);
    expect(s.perm("theirHost").linked).toHaveLength(0);
    expect(s.perm("host").linked.map(({ instanceId }) => instanceId)).toEqual([s.inst("linkCard").instanceId]);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q5184: a link card replaced by the link-limit rule sweep does not trigger the ＜Delay＞", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "option" },
            { card: "BT24-053", as: "secondLink" },
          ],
          battleArea: [{ card: "EX10-029", as: "host", linked: [{ card: "BT24-053", as: "firstLink" }] }],
          trash: [{ card: "BT24-053", as: "material" }],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-013", "BT1-014"],
        },
        1: {
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const p0 = s.state.players[0]!;
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    await playOption(s);
    const optionId = s.inst("option").instanceId;
    const materialId = s.inst("material").instanceId;
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    const firstLinkId = s.inst("firstLink").instanceId;
    const secondLinkId = s.inst("secondLink").instanceId;
    const optionalsBefore = optionals(s).length;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: secondLinkId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => p0.trash.some(({ instanceId }) => instanceId === firstLinkId));
    await settle(() => false, 60);
    await s.ready();

    expect(s.perm("host").linked.map(({ instanceId }) => instanceId)).toEqual([secondLinkId]);
    expect(p0.trash.map(({ instanceId }) => instanceId)).toContain(firstLinkId);
    expect(p0.battleArea.some(({ topCard }) => topCard?.instanceId === optionId)).toBe(true);
    expect(p0.trash.map(({ instanceId }) => instanceId)).toContain(materialId);
    expect(optionals(s)).toHaveLength(optionalsBefore);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q5184 (the printed case): an EFFECT link onto an already-linked Digimon does not trigger it", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "option" }],
          battleArea: [{ card: "BT25-070", as: "host", linked: [{ card: "BT24-053", as: "firstLink" }] }],
          trash: [{ card: "BT21-041", as: "effectMaterial" }],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-013", "BT1-014"],
        },
        1: {
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const p0 = s.state.players[0]!;
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    await playOption(s);
    const optionId = s.inst("option").instanceId;
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    const firstLinkId = s.inst("firstLink").instanceId;
    const effectMaterialId = s.inst("effectMaterial").instanceId;
    const optionalsBefore = optionals(s).length;

    const entry = observe(s.engine)
      .activatableEffects(s.perm("host"))
      .find(({ description }) => /link/i.test(description ?? ""));
    expect(entry, "BT25-070 offers its [Main] link ability").toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("host").topCard!.instanceId,
        effectKey: entry!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => p0.trash.some(({ instanceId }) => instanceId === firstLinkId));
    await settle(() => false, 60);
    await s.ready();

    expect(s.perm("host").linked.map(({ instanceId }) => instanceId)).toEqual([effectMaterialId]);
    expect(p0.trash.map(({ instanceId }) => instanceId)).toContain(firstLinkId);
    expect(p0.battleArea.some(({ topCard }) => topCard?.instanceId === optionId)).toBe(true);
    expect(optionals(s).length).toBe(optionalsBefore + 1);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[Security] places itself in the battle area on a real security check", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: { security: [{ card: CARD_ID, as: "option" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    const optionId = s.inst("option").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.instanceId === optionId));
    await settle(() => false, 60);
    await s.ready();

    const p1 = s.state.players[1]!;
    expect(p1.battleArea.map(({ topCard }) => topCard?.instanceId)).toEqual([optionId]);
    expect(p1.security).toHaveLength(0);
    expect(p1.trash.map(({ instanceId }) => instanceId)).not.toContain(optionId);
    expect(p1.deck).toHaveLength(0);
    expect(p1.hand).toHaveLength(0);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
