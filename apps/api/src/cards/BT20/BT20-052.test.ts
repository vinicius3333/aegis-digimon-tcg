import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-052.js";
import "./index.js";

describe("BT20-052 Oblivimon", () => {
  it("plays from security at the end of the opponent's turn and flips the next face-down opposing security card on DNA digivolving", () => {
    expect(compiled.effects.find((effect) => effect.isSecurity)).toMatchObject({
      trigger: "EndOfOpponentsTurn",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
    expect(compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [{ kind: "SecurityManipulation", op: "flipFaceUp", controller: "opponent" }],
    });
  });

  it("may place this Digimon's top card face-up at security bottom after a face-up check", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "YourTurn" && !effect.isInherited)).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenCheckedFaceUpSecurity",
          actions: [
            {
              kind: "SecurityManipulation",
              op: "addBottom",
              controller: "mine",
              faceUp: true,
              detachPermanentTop: true,
              optional: true,
              source: { filter: { isSelfRef: true }, isSelf: true },
            },
          ],
        },
      ],
    });
  });

  it("prevents switching this Digimon's attack target as an inherited effect", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "YourTurn",
      actions: [{ kind: "Restrict", restriction: "attackTargetChange", duration: "permanent" }],
    });
  });

  it("plays itself free from face-up security at the end of the opponent's turn", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT20-052", as: "oblivimon", faceUp: true }] } });
    await s.ready();
    s.state.turnSeat = 1;
    await advance(s.engine).fireForInstance(EffectTiming.OnEndTurn, s.inst("oblivimon"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT20-052"));
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("uses the Cyborg route for 3 and flips the next face-down security card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-050", as: "base" }], hand: [{ card: "BT20-052", as: "oblivimon" }] },
      1: { security: [{ card: "BT1-009", faceUp: true }, "BT1-010", "BT1-011"] },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("oblivimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT20-052");
    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.security.map((card) => card.faceUp)).toEqual([true, true, false]);
  });

  it("may place its top card face-up at security bottom after a face-up check", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-052", under: ["BT20-050"], as: "oblivimon" }] },
        1: { security: [{ card: "BT20-047", faceUp: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("oblivimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.cardId === "BT20-052"));
    expect(s.state.players[0]!.security.at(-1)).toMatchObject({ cardId: "BT20-052", faceUp: true });
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toContain("BT20-050");
  });

  it("does not place its top card when the security check is face-down", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-052", under: ["BT20-050"], as: "oblivimon" }] },
        1: { security: [{ card: "BT20-047", as: "faceDown" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("oblivimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-052")).toBe(true);
  });

  it("grants the inherited target-change lock only on its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-053", under: ["BT20-052"], as: "host" },
          { card: "BT20-052", as: "top" },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).isRestricted(s.perm("host"), "attackTargetChange")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("top"), "attackTargetChange")).toBe(false);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).isRestricted(s.perm("host"), "attackTargetChange")).toBe(false);
  });
});
