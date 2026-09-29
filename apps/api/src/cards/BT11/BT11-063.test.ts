import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-063.js";
import "../BT14/BT14-039.js";
import "../BT15/BT15-035.js";
import "../ST19/ST19-13.js";

describe("BT11-063 Geremon", () => {
  it("maps the catalog facts, Numemon rule, and optional draw cost to IR", () => {
    expect(getCardDefinition("BT11-063")).toMatchObject({
      cardId: "BT11-063",
      colors: ["Black"],
      level: 4,
      playCost: 3,
      dp: 2000,
      types: ["Mollusk"],
    });
    expect(compiled.effects).toMatchObject([
      { trigger: "Rule", actions: [{ kind: "GrantStatic", grant: "name", tokens: ["Numemon"] }] },
      { trigger: "OnPlay", actions: [{ kind: "Draw", amount: 2, optional: true }] },
    ]);
  });

  it("is also treated as Numemon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-063", as: "geremon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).grantedNames(s.perm("geremon"))).toContain("numemon");
  });
  it("trashes an eligible named card to draw 2 on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT11-063", as: "geremon" },
            { card: "BT11-063", as: "discard" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("geremon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("discard").instanceId);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-010"]);
  });

  it("does not draw when no eligible card can be trashed", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT11-063", as: "geremon" }],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("geremon").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("may decline even when an eligible card is available", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT11-063", as: "geremon" },
            { card: "BT2-056", as: "eligible" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("geremon").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("eligible").instanceId);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });
});

describe("BT11-063 Geremon — KB Q&A rulings", () => {
  it("can be placed from trash by ShinMonzaemon as a card with [Numemon] in its name, like BT15-035 (Q861)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST19-13", as: "shinMonzaemon" }],
          trash: [
            { card: "BT1-009", as: "nonNumemon" },
            { card: "BT15-035", as: "yellowGeremon" },
            { card: "BT11-063", as: "geremon" },
          ],
          deck: ["BT1-010"],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declineDigiXros: true, preferInstanceIds },
    );
    s.state.memory = 20;
    const geremonId = s.inst("geremon").instanceId;
    preferInstanceIds.push(geremonId);
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shinMonzaemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 2);
    await settle();

    const trashPick = s.decisions.find(
      ({ req }) =>
        (req.kind === "selectCards" || req.kind === "chooseTargets") &&
        (req.options?.candidateInstanceIds ?? []).includes(geremonId),
    );
    expect(trashPick?.req.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([geremonId, s.inst("yellowGeremon").instanceId]),
    );
    expect(trashPick?.req.options?.candidateInstanceIds).not.toContain(s.inst("nonNumemon").instanceId);
    const shinMonzaemon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === "ST19-13")!;
    expect(shinMonzaemon.stack[0]?.instanceId).toBe(geremonId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("nonNumemon").instanceId, s.inst("yellowGeremon").instanceId]),
    );
  });

  it("is always treated as also having the [Numemon] name, so it digivolves via a [Numemon] requirement (Q2097)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT11-063", as: "geremon" },
          { card: "BT11-064", as: "nonNumemon" },
        ],
        hand: [
          { card: "BT14-039", as: "monzaemon" },
          { card: "BT14-039", as: "secondMonzaemon" },
        ],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(observe(s.engine).effectiveNames(s.perm("geremon"))).toEqual(expect.arrayContaining(["geremon", "numemon"]));
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("nonNumemon").permanentId,
        instanceId: s.inst("secondMonzaemon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("geremon").permanentId,
        instanceId: s.inst("monzaemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("geremon").topCard.cardId === "BT14-039");

    expect(s.state.memory).toBe(2);
  });
});
