import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-055.js";
import "./index.js";
import "../BT24/BT24-062.js";

describe("BT20-055 Invisimon", () => {
  it("plays from security at the end of the opponent's turn", () => {
    expect(compiled.effects.find((effect) => effect.isSecurity)).toMatchObject({
      trigger: "EndOfOpponentsTurn",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
  });

  it("de-digivolves, flips the next face-down security card, and deletes a Digimon with at most one digivolution card", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const actions = compiled.effects.find((effect) => effect.trigger === trigger)?.actions ?? [];
      expect(actions).toMatchObject([
        { kind: "DeDigivolve", amount: 2 },
        { kind: "SecurityManipulation", op: "flipFaceUp", controller: "opponent" },
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], digivolutionCardsAtMost: 1 }, count: 1 },
        },
      ]);
    }
  });

  it("optionally places this Digimon's top card face-up at the bottom after a face-up security check", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "YourTurn")).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenCheckedFaceUpSecurity",
          optional: true,
          actions: [
            {
              kind: "SecurityManipulation",
              op: "addBottom",
              controller: "mine",
              faceUp: true,
              detachPermanentTop: true,
              source: { filter: { isSelfRef: true }, isSelf: true },
            },
          ],
        },
      ],
    });
  });

  it("plays itself free from face-up security at the end of the opponent's turn", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT20-055", as: "invisimon", faceUp: true }] } });
    await s.ready();
    s.state.turnSeat = 1;
    await advance(s.engine).fireForInstance(EffectTiming.OnEndTurn, s.inst("invisimon"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT20-055"));
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("naturally plays from face-up security at the opponent's turn end", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT20-055", as: "invisimon", faceUp: true }] },
      1: { deck: ["BT20-001"] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT20-055"));
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT20-055")).toBe(true);
  });

  it("de-digivolves by 2, flips the next face-down card, then deletes at one source on both entries", async () => {
    for (const mode of ["play", "digivolve"] as const) {
      const s = setupEngine(
        {
          0: {
            ...(mode === "play" ? {} : { battleArea: [{ card: "BT20-054", as: "base" }] }),
            hand: [{ card: "BT20-055", as: "invisimon" }],
          },
          1: {
            battleArea: [{ card: "BT20-053", under: ["BT13-005", "BT20-048", "BT20-050"], as: "target" }],
            security: [{ card: "BT20-047", faceUp: true }, "BT20-047", "BT20-047"],
          },
        },
        { autoSelectCards: true },
      );
      s.state.memory = mode === "play" ? 10 : 3;
      const result =
        mode === "play"
          ? s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("invisimon").instanceId })
          : s.engine.applyIntent(0, {
              type: "digivolve",
              permanentId: s.perm("base").permanentId,
              instanceId: s.inst("invisimon").instanceId,
            });
      expect(result).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.battleArea.length === 0);
      expect(s.state.players[1]!.security.map((card) => card.faceUp)).toEqual([true, true, false]);
      expect(s.state.memory).toBe(mode === "play" ? -1 : 0);
    }
  });

  it("deletes only the opponent Digimon with at most one source remaining after De-Digivolve 2", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT20-055", as: "invisimon" }] },
        1: {
          battleArea: [
            { card: "BT20-056", as: "ineligible", under: ["BT13-005", "BT20-048", "BT20-050", "BT20-053"] },
            { card: "BT20-048", as: "eligible", under: ["BT13-005"] },
          ],
          security: ["BT20-047", "BT20-047", "BT20-047"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    await s.ready();
    const ineligibleId = s.perm("ineligible").permanentId;
    preferred.push(ineligibleId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("invisimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[1]!.battleArea.some((p) => p.permanentId === ineligibleId) &&
        s.state.players[1]!.battleArea.length === 1,
    );
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([ineligibleId]);
    expect(s.perm("ineligible").stack).toHaveLength(2);
    expect(s.perm("ineligible").topCard.cardId).toBe("BT20-050");
  });

  it("Q4388 may move Invisimon itself and lets a promoted Lv5 host resolve its End of Attack effect", async () => {
    for (const accept of [true, false]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT20-055", under: ["BT20-050", "BT24-062"], as: "invisimon" }],
          },
          1: { security: [{ card: "BT20-047", faceUp: true }] },
        },
        {
          autoAcceptOptional: accept,
          autoDeclineOptional: !accept,
          autoSelectCards: true,
        },
      );
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("invisimon").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.some((event) => event.kind === "combatResolved"));
      const placed = s.state.players[0]!.security.at(-1);
      expect(placed?.cardId).toBe(accept ? "BT20-055" : undefined);
      expect(placed?.faceUp).toBe(accept ? true : undefined);
      expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toContain(
        accept ? "BT24-062" : "BT20-055",
      );
      expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-050")).toBe(accept);
      expect(
        s.state.players[0]!.battleArea.find(
          (permanent) => permanent.topCard.cardId === (accept ? "BT24-062" : "BT20-055"),
        )!.stack.map((card) => card.cardId),
      ).toEqual(accept ? [] : ["BT20-050", "BT24-062"]);
    }
  });

  it("does not move its top card when an opponent checks a face-up security card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-055", under: ["BT20-050", "BT24-062"], as: "invisimon" }],
          security: [{ card: "BT1-010", faceUp: true }],
        },
        1: { battleArea: [{ card: "BT20-010", as: "attacker" }], security: ["BT1-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[0]!.security.map((card) => card.cardId)).not.toContain("BT20-055");
    expect(s.perm("invisimon").topCard.cardId).toBe("BT20-055");
  });
});
