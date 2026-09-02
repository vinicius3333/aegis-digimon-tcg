import { digiXrosRequirementFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-086.js";
describe("BT11-086 Mervamon", () => {
  it("maps catalog facts and every printed effect to IR", () => {
    expect(getCardDefinition("BT11-086")).toMatchObject({
      cardId: "BT11-086",
      colors: ["Purple"],
      level: 6,
      playCost: 11,
      dp: 12000,
      types: ["Shaman", "Xros Heart"],
    });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "Static",
        actions: [{ kind: "Replacement", additionalEffects: [{ kind: "AllowDigiXrosMaterialsFromTrash" }] }],
      },
      { trigger: "OnPlay", actions: [{ kind: "PlayWithoutCost", from: ["trash"] }] },
      { trigger: "WhenDigivolving", actions: [{ kind: "PlayWithoutCost", from: ["trash"] }] },
      {
        trigger: "AllTurns",
        actions: [
          { kind: "GainKeyword", keyword: { keyword: "Rush" } },
          { kind: "GainKeyword", keyword: { keyword: "Blocker" } },
        ],
      },
    ]);
  });

  it("DigiXroses with a Xros Heart card from trash and plays 2 eligible Digimon", async () => {
    expect(digiXrosRequirementFor("BT11-086")).toEqual([
      {
        materials: [{ traits: ["Xros Heart"] }],
        count: 3,
      },
    ]);
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT11-086", as: "merva" }],
          trash: [
            { card: "BT10-008", as: "material" },
            { card: "BT11-079", as: "purple-one" },
            { card: "BT2-074", as: "purple-two" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("merva").instanceId,
        digiXros: { materialInstanceIds: [s.inst("material").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 3);

    expect(s.state.memory).toBe(2);
    const playedMerva = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === "BT11-086")!;
    expect(playedMerva.stack.map(({ instanceId }) => instanceId)).toContain(s.inst("material").instanceId);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(
      expect.arrayContaining(["BT11-086", "BT11-079", "BT2-074"]),
    );
  });

  it("requires exactly 2 eligible cards after DigiXros when 2 or more are available (Q2111)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT11-086", as: "merva" }],
          trash: [
            { card: "BT10-008", as: "material" },
            { card: "BT11-079", as: "purple-one" },
            { card: "BT2-074", as: "purple-two" },
            { card: "BT2-074", as: "purple-three" },
          ],
        },
      },
      {},
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("merva").instanceId,
        digiXros: { materialInstanceIds: [s.inst("material").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "selectCards"));

    const request = s.decisions.findLast(({ req }) => req.kind === "selectCards")!.req;
    expect(request).toMatchObject({ kind: "selectCards", options: { min: 2, max: 2 } });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: request.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("purple-one").instanceId] },
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.pendingDecision?.decisionId).toBe(request.decisionId);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: request.decisionId,
        response: {
          kind: "selectCards",
          instanceIds: [s.inst("purple-one").instanceId, s.inst("purple-two").instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 3);
  });

  it("plays the only eligible card after DigiXros when fewer than 2 are available (Q2111)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT11-086", as: "merva" }],
          trash: [
            { card: "BT10-008", as: "material" },
            { card: "BT11-079", as: "only-eligible" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("merva").instanceId,
        digiXros: { materialInstanceIds: [s.inst("material").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(
      expect.arrayContaining(["BT11-086", "BT11-079"]),
    );
  });

  it("grants Rush and Blocker to Xros Heart Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT11-086", as: "merva" },
          { card: "BT10-008", as: "xros" },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("xros"), "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("xros"), "Blocker")).toBe(true);
  });

  it("also grants Rush and Blocker to allied Retaliation holders but not unrelated Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT11-086", as: "merva" },
          { card: "BT11-079", as: "retaliation" },
          { card: "BT1-009", as: "plain" },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("retaliation"), "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("retaliation"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("plain"), "Rush")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("plain"), "Blocker")).toBe(false);
  });
});
