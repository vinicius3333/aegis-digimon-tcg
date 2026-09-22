import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../ST19/ST19-07.js";
import "../ST19/ST19-10.js";
import "./ST20-14.js";

describe("ST20-14 Our Courage United", () => {
  it("draws two cards and places itself in the battle area through its public Main effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "AD1-004", as: "blackDigimon" }],
        hand: [{ card: "ST20-14", as: "option" }],
        deck: [
          { card: "BT1-001", as: "drawnOne" },
          { card: "BT1-002", as: "drawnTwo" },
        ],
      },
    });
    s.state.memory = 10;
    const optionId = s.inst("option").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === optionId));
    const option = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === optionId)!.topCard;
    await advance(s.engine).fireForInstance(EffectTiming.OnDeclaration, option);
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawnTwo").instanceId));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("drawnOne").instanceId, s.inst("drawnTwo").instanceId]),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === optionId)).toBe(true);
  });

  it("places itself in the battle area when revealed from Security without activating Main", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "ST20-14", as: "securityOption", faceUp: true }],
        deck: [{ card: "BT1-001", as: "untouched" }],
      },
    });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("securityOption").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("securityOption").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.hand).not.toContainEqual(
      expect.objectContaining({ instanceId: s.inst("untouched").instanceId }),
    );
    expect(s.state.memory).toBe(0);
  });

  it("opens its ＜Delay＞ window when one of your level-5-or-higher Digimon would leave play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST20-11", as: "level5" }],
          hand: [
            { card: "ST20-14", as: "option" },
            { card: "ST20-02", as: "target" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.placeOptionAsPermanent(s.inst("option").instanceId);
    const option = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === s.inst("option").instanceId)!;
    const leavingInstanceId = s.perm("level5").topCard.instanceId;
    // "[All Turns] When any of your level 5 or higher Digimon would leave the battle area,
    // ＜Delay＞" is ONE clause: the leave attempt opens the window there, gated only by §16-17-3
    // ("not the turn this card entered play").
    expect(observe(s.engine).activatableEffects(option)).toHaveLength(0);
    s.state.turnCount += 1;
    await advance(s.engine).recompute();
    expect(await advance(s.engine).verb.deletePermanent([s.perm("level5").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === leavingInstanceId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === leavingInstanceId)).toBe(true);
    await settle();
    // §16-17-1: accepting the window pays its cost by trashing this card from the battle area.
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });

  it("does not arm Delay when Armor Purge replaces the qualifying leave attempt", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST19-10", under: ["ST19-07"], as: "armoredLevel5" }],
          hand: [{ card: "ST20-14", as: "option" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.placeOptionAsPermanent(s.inst("option").instanceId);
    const option = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === s.inst("option").instanceId)!;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("armoredLevel5").permanentId], "byEffect")).toBe(0);
    expect(s.perm("armoredLevel5").topCard.cardId).toBe("ST19-07");
    s.state.turnCount += 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).activatableEffects(option)).toHaveLength(0);
  });

  it("resolves its ＜Delay＞ window to play an Adventure Digimon from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST20-11", as: "level5" }],
          hand: [
            { card: "ST20-14", as: "option" },
            { card: "ST20-02", as: "target" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.placeOptionAsPermanent(s.inst("option").instanceId);
    s.state.turnCount += 1;
    await advance(s.engine).recompute();
    await advance(s.engine).verb.deletePermanent([s.perm("level5").permanentId!], "byEffect");
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("target").instanceId),
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("target").instanceId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });

  it("can decline its ＜Delay＞ window without playing the eligible Adventure Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST20-11", as: "level5" }],
          hand: [
            { card: "ST20-14", as: "option" },
            { card: "ST20-02", as: "target" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.placeOptionAsPermanent(s.inst("option").instanceId);
    s.state.turnCount += 1;
    await advance(s.engine).recompute();
    await advance(s.engine).verb.deletePermanent([s.perm("level5").permanentId!], "byEffect");
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));
    // KB EX5-069 Q3675 states the general ＜Delay＞ rule: declining keeps the card in play.
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("target").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("option").instanceId)).toBe(true);
  });
});
