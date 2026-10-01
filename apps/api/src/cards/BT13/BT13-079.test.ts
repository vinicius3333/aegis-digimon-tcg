import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-079.js";
import "../BT10/BT10-078.js";
import "../BT2/BT2-073.js";
import "../BT21/BT21-010.js";
import "../ST1/ST1-10.js";
import "../ST1/ST1-16.js";

describe("BT13-079 Falcomon", () => {
  it("grants Retaliation to one purple Digimon until the opponent's turn ends", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "GainKeyword",
      target: { filter: { controller: "mine", kind: ["Digimon"], colors: ["Purple"] }, count: 1 },
      keyword: { keyword: "Retaliation", raw: "＜Retaliation＞" },
      duration: "untilOpponentTurnEnd",
    });
  });

  it("lets the opponent trash a card when this card is deleted outside battle", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions?.[0]).toMatchObject({
      kind: "Trash",
      chooser: "opponent",
      target: { filter: { controller: "opponent", zone: "hand" }, count: 1 },
      condition: {
        kind: "not",
        condition: { kind: "triggerRemovalCause", removalCause: "byBattle" },
        raw: "deleted outside of a battle",
      },
    });
  });

  it("trashes an opposing hand card when deleted outside battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT2-073", as: "host", under: ["BT13-079"] }] },
        1: {
          battleArea: [{ card: "ST1-10", as: "phoenix" }],
          hand: [
            { card: "ST1-16", as: "gaia" },
            { card: "BT1-009", as: "discard" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("host").permanentId;
    const gaiaId = s.inst("gaia").instanceId;
    const discardId = s.inst("discard").instanceId;
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: gaiaId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.every((permanent) => permanent.permanentId !== hostId) &&
        s.state.players[1]!.trash.some((card) => card.instanceId === discardId),
    );

    expect(s.state.players[1]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([gaiaId, discardId]),
    );
    expect(s.state.memory).toBe(2);
  });

  it("[Supplemental] grants Retaliation to a real own purple Digimon on play", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-079", as: "falcomon" },
            { card: "BT13-080", as: "purpleTarget" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("purpleTarget").permanentId, s.perm("purpleTarget").topCard!.instanceId);
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("falcomon"));

    expect(observe(s.engine).hasKeyword(s.perm("purpleTarget"), "Retaliation")).toBe(true);
  });

  it("grants Retaliation through a real Falcomon play", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-080", as: "purpleTarget" }],
          hand: [{ card: "BT13-079", as: "falcomon" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("purpleTarget").permanentId, s.perm("purpleTarget").topCard!.instanceId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("falcomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("purpleTarget"), "Retaliation"));
    expect(observe(s.engine).hasKeyword(s.perm("purpleTarget"), "Retaliation")).toBe(true);
  });

  it("does not trash from hand when the inherited host is deleted in battle", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT2-073", as: "host", under: ["BT13-079"] }] }, 1: { hand: ["BT1-009"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byBattle");

    expect(s.state.players[1]!.hand).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });
});

describe("BT13-079 Falcomon — KB Q&A rulings", () => {
  it("lets the opponent choose which hand card its inherited effect trashes (Q2321)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-073", as: "host", under: ["BT13-079"] }] },
      1: {
        hand: [
          { card: "BT1-009", as: "kept" },
          { card: "ST1-16", as: "chosen" },
        ],
      },
    });
    await s.ready();

    const deletion = advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.state.pendingDecision!;
    expect(decision.seat).toBe(1);
    const chosenId = s.inst("chosen").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [chosenId] },
      }).ok,
    ).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [chosenId] },
      }),
    ).toEqual({ ok: true });
    await deletion;
    await settle();

    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([chosenId]);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual([s.inst("kept").instanceId]);
  });

  it("trashes from the opponent's hand when its Digimon is deleted by a battled Digimon's Retaliation (Q2322)", async () => {
    const attackRetaliator = async (defenderHasRetaliation: boolean, attackerDP: number) => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "BT2-073", as: "attacker", dp: attackerDP, under: ["BT13-079"] }] },
          1: {
            battleArea: [
              {
                card: "BT10-078",
                as: "defender",
                dp: 4000,
                suspended: true,
                under: defenderHasRetaliation ? ["BT21-010"] : [],
              },
            ],
            hand: ["BT1-001"],
          },
        },
        { autoSelectCards: true, autoDeclineOptional: true },
      );
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
      await settle();
      return s;
    };

    const retaliated = await attackRetaliator(true, 9000);
    expect(retaliated.state.players[0]!.battleArea).toHaveLength(0);
    expect(retaliated.state.players[1]!.battleArea).toHaveLength(0);
    expect(retaliated.state.players[1]!.hand).toHaveLength(0);

    const lostBattle = await attackRetaliator(false, 2000);
    expect(lostBattle.state.players[0]!.battleArea).toHaveLength(0);
    expect(lostBattle.state.players[1]!.battleArea).toHaveLength(1);
    expect(lostBattle.state.players[1]!.hand).toHaveLength(1);
  });
});
