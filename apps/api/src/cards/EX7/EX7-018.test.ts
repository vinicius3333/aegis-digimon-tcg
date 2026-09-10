import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-018.js";
import "../index.js";
import "../BT1/BT1-039.js";

const FILLER = ["BT1-009", "BT1-011", "BT1-012", "BT1-013", "BT1-014"];
const SECURITY = ["BT1-013", "BT1-014", "BT1-013"];

describe("EX7-018 Gekomon", () => {
  it("matches the catalog, alternate evolution route, and compiled clauses", () => {
    expect(getCardDefinition("EX7-018")).toMatchObject({
      cardId: "EX7-018",
      nameEn: "Gekomon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Amphibian", "NSp"],
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
      effectText: "[Digivolve]Lv.3 w/[NSp]\u00a0trait: Cost 2 \n\n[On Play] [When Digivolving] ＜Draw 1＞.",
      inheritedEffectText: "＜Jamming＞.",
    });
    expect(digivolutionRequirementsFor("EX7-018")).toEqual([{ level: 3, traits: ["NSp"], cost: 2, isAlternate: true }]);
    expect(compiled.effects).toEqual([
      { trigger: "OnPlay", actions: [{ kind: "Draw", controller: "mine", amount: 1 }] },
      { trigger: "WhenDigivolving", actions: [{ kind: "Draw", controller: "mine", amount: 1 }] },
      {
        trigger: "Static",
        actions: [],
        isInherited: true,
        keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }],
      },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("publicly draws exactly one card on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX7-018", as: "geko" }],
          deck: [
            { card: "BT1-009", as: "drawn" },
            { card: "BT1-011", as: "rest" },
          ],
          security: SECURITY,
        },
        1: { deck: [...FILLER], security: SECURITY },
      },
      { autoChooseOption: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("geko").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.perm("geko").topCard?.instanceId).toBe(s.inst("geko").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("rest").instanceId]);
    expect(s.state.memory).toBe(6);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("legally alternate-digivolves from an NSp Lv.3 for 2, draws twice, and preserves the source stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX7-015", as: "source" }],
        hand: [{ card: "EX7-018", as: "geko" }],
        deck: [
          { card: "BT1-009", as: "evolutionDraw" },
          { card: "BT1-011", as: "printedDraw" },
          { card: "BT1-012", as: "rest" },
        ],
        security: SECURITY,
      },
      1: { deck: [...FILLER], security: SECURITY },
    });
    s.state.memory = 4;
    await s.ready();
    const sourceId = s.inst("source").instanceId;
    const gekoId = s.inst("geko").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: gekoId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.instanceId === gekoId);

    expect(s.perm("source").topCard?.cardId).toBe("EX7-018");
    expect(s.perm("source").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("evolutionDraw").instanceId, s.inst("printedDraw").instanceId]),
    );
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("rest").instanceId]);
    expect(s.state.memory).toBe(2);
    expect(
      s.events.some((event) => event.kind === "digivolved" && "mechanic" in event && event.mechanic === "alternate"),
    ).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("surfaces inherited Jamming after a second public evolution puts Gekomon under the new top card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX7-015", as: "source" }],
        hand: [
          { card: "EX7-018", as: "geko" },
          { card: "EX7-022", as: "levelFive" },
        ],
        deck: [
          { card: "BT1-009", as: "drawn" },
          { card: "BT1-011", as: "printedDraw" },
          { card: "BT1-012", as: "secondEvolutionDraw" },
        ],
        security: SECURITY,
      },
      1: { deck: [...FILLER], security: SECURITY },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("geko").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.instanceId === s.inst("geko").instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Jamming")).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("levelFive").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.instanceId === s.inst("levelFive").instanceId);

    expect(observe(s.engine).hasKeyword(s.perm("source"), "Jamming")).toBe(true);
    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["EX7-015", "EX7-018"]);
  });

  it("refuses an illegal Red Lv.3 source without paying, stacking, or drawing", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "illegalSource" }],
        hand: [{ card: "EX7-018", as: "geko" }],
        deck: [
          { card: "BT1-009", as: "drawn" },
          { card: "BT1-011", as: "rest" },
        ],
        security: SECURITY,
      },
      1: { deck: [...FILLER], security: SECURITY },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("illegalSource").permanentId,
        instanceId: s.inst("geko").instanceId,
        useAlternateCost: true,
      }).ok,
    ).toBe(false);
    expect(s.perm("illegalSource").topCard?.cardId).toBe("BT1-009");
    expect(s.perm("illegalSource").stack).toHaveLength(0);
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("geko").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("drawn").instanceId,
      s.inst("rest").instanceId,
    ]);
  });

  it("keeps inherited Jamming on a real host stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX7-018"] }], security: SECURITY },
      1: { deck: [...FILLER], security: SECURITY },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX7-018"]);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
