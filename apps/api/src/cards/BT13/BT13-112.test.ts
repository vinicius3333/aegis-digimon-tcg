import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT13-112.js";

describe("BT13-112 Omnimon", () => {
  it("has complete compiled coverage and no residual gaps", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.length).toBeGreaterThan(0);
  });

  it("loads the compiled implementation into a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-112", as: "card" }] } });
    await s.ready();
    expect(s.perm("card").topCard?.cardId).toBe("BT13-112");
  });

  it("offers the printed modal choice and can delete any opposing Digimon", async () => {
    const onPlay = compiled.effects.find((entry) => entry.trigger === "OnPlay");
    expect(onPlay?.actions[0]).toMatchObject({
      kind: "Modal",
      optional: true,
      choose: 1,
      options: [
        [{ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } }],
        [expect.objectContaining({ kind: "PlayWithoutCost", bindResultAs: "playedRoyalKnights" })],
      ],
    });

    const s = setupEngine(
      { 0: { hand: [{ card: "BT13-112", as: "omnimon" }] }, 1: { battleArea: [{ card: "BT1-009", as: "target" }] } },
      { autoAcceptOptional: true, autoChooseOption: true, preferOptionIndex: 0, autoSelectCards: true },
    );
    s.state.memory = 14;
    const targetId = s.perm("target").topCard!.instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("omnimon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === targetId));
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === targetId)).toBe(false);
  });

  it("plays one of each distinct Royal Knight name from breeding, then trashes the breeding Digimon and grants Rush", async () => {
    const s = setupEngine(
      { 0: {
        hand: [{ card: "BT13-112", as: "omnimon" }],
        breeding: { card: "BT13-007", as: "drasil", under: ["BT13-040", "BT13-111", "BT13-040"] },
      } },
      { autoAcceptOptional: true, autoChooseOption: true, preferOptionIndex: 1, autoSelectCards: true },
    );
    s.state.memory = 14;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("omnimon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-111"));

    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT13-007")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT13-040")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT13-111")).toBe(true);
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "BT13-040").length).toBe(1);
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "BT13-111").length).toBe(1);
    for (const permanent of s.state.players[0]!.battleArea) {
      expect(observe(s.engine).hasKeyword(permanent, "Rush")).toBe(true);
    }
  });

  it("allows declining the optional modal effect", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT13-112", as: "omnimon" }] }, 1: { battleArea: [{ card: "BT1-009", as: "target" }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 14;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("omnimon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-112"));
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT1-009")).toBe(true);
  });

  it("fires the same modal when legally digivolving from a level-6 red Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-111", as: "base" }], hand: [{ card: "BT13-112", as: "omnimon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, preferOptionIndex: 0, autoSelectCards: true },
    );
    s.state.memory = 4;
    const targetId = s.perm("target").topCard!.instanceId;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("omnimon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT13-112");

    expect(s.perm("base").stack.some((card) => card.cardId === "BT13-111")).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === targetId)).toBe(true);
  });
});
