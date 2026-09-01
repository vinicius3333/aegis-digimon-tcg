import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT23-087.js";
import { compiled } from "./BT23-098.js";

describe("BT23-098 Unique Emblem: Soul Banquet", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-098")).toMatchObject({
      cardId: "BT23-098",
      nameEn: "Unique Emblem: Soul Banquet",
      colors: ["Purple"],
      kinds: ["Option"],
      playCost: 3,
      types: ["LIBERATOR"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("pays Delay and evolves a Ghost only into a Ghost/LIBERATOR card with cost reduced by 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-098", as: "option" },
            { card: "BT23-087", as: "violet" },
            { card: "BT23-061", as: "naturalGhost" },
            { card: "BT23-061", as: "delayGhost" },
          ],
          hand: [
            { card: "BT20-068", as: "naturalEvolver" },
            { card: "BT20-068", as: "delayEvolver" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    s.perm("option").placedByEffect = true;
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("naturalGhost").permanentId,
        instanceId: s.inst("naturalEvolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.perm("naturalGhost").topCard?.cardId).toBe("BT20-068");
    expect(s.perm("delayGhost").topCard?.cardId).toBe("BT20-068");
    expect(s.perm("violet").isSuspended).toBe(true);
    expect(s.state.memory).toBe(3);
  });

  it("does not pay Delay when the only hand evolution is Ghost without LIBERATOR", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-098", as: "option" },
            { card: "BT23-087", as: "violet" },
            { card: "BT23-061", as: "naturalGhost" },
            { card: "BT23-061", as: "delayGhost" },
          ],
          hand: [
            { card: "BT20-068", as: "naturalEvolver" },
            { card: "BT11-078", as: "ghostOnly" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    s.perm("option").placedByEffect = true;
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("naturalGhost").permanentId,
        instanceId: s.inst("naturalEvolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("naturalGhost").topCard?.cardId === "BT20-068");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(s.perm("delayGhost").topCard?.cardId).toBe("BT23-061");
    expect(s.perm("violet").isSuspended).toBe(true);
  });

  it("ignores an opponent-controlled Violet Inboots suspension", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT23-098", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT23-087", as: "violet" },
            { card: "BT23-061", as: "naturalGhost" },
          ],
          hand: [{ card: "BT20-068", as: "naturalEvolver" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    s.perm("option").placedByEffect = true;
    s.state.turnSeat = 1;
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("naturalGhost").permanentId,
        instanceId: s.inst("naturalEvolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("violet").isSuspended);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(false);
  });

  it("places itself after the optional Ghostmon/Violet Inboots play", () => {
    const main = compiled.effects.find((effect) => effect.trigger === "Main") as any;
    expect(main.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand", "trash"], optional: true });
    expect(main.actions[0].abortOnDecline).toBeUndefined();
    expect(main.actions[1]).toMatchObject({ kind: "PlaceInBattleAreaSelf" });
  });

  it("activates Delay when Violet Inboots suspends and carries the Ghost/LIBERATOR digivolution", () => {
    const turn = compiled.effects.find((effect) => effect.trigger === "YourTurn") as any;
    const digivolve = turn.actions[0].actions[0];
    expect(turn.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenSuspended" });
    expect(turn.keywords).toEqual([{ keyword: "Delay", raw: "＜Delay＞" }]);
    expect(digivolve).toMatchObject({ kind: "Digivolve", reduceCost: 3, from: ["hand"], optional: true });
    expect(digivolve.into.and).toEqual([
      { nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }] },
      { nameOrTrait: [{ tokens: ["LIBERATOR"], match: "trait" }] },
    ]);
  });

  it("routes Security through the complete Main effect", () => {
    const security = compiled.effects.find((effect) => effect.trigger === "Security") as any;
    expect(security.actions).toEqual([{ kind: "ActivateMain" }]);
  });
});
