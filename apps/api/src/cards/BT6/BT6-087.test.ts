import { EffectTiming, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-087.js";

describe("BT6-087 Tai Kamiya", () => {
  it("gains 1 memory and draws 1 when Agumon moves from breeding", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-087", as: "tai" }],
        breeding: { card: "BT1-010", as: "agumon" },
        deck: [{ card: "BT1-001", as: "drawn" }],
      },
    });
    s.state.phase = Phase.Breeding;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("agumon").permanentId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.memory === 1 && s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId),
    );

    expect(s.state.memory).toBe(1);
  });

  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT6-087", as: "security", faceUp: true }] } });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT6-087")).toBe(true);
  });

  it("digivolves Agumon into Bond of Bravery and trashes 2 security", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-010", as: "agumon" },
            { card: "BT6-087", as: "tai" },
          ],
          hand: [{ card: "BT6-018", as: "bond" }],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("agumon").topCard!.instanceId);
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("tai").topCard!.instanceId,
        effectKey: "BT6-087/main-digivolve-bond-of-bravery",
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("agumon").topCard?.cardId === "BT6-018" &&
        s.state.players[0]!.security.length === 1 &&
        observe(s.engine).subscriptions("endOfTurn").length > 0,
    );

    expect(s.perm("agumon").topCard?.cardId).toBe("BT6-018");
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.memory).toBe(2);

    const bondInstanceId = s.perm("agumon").topCard.instanceId;
    await advance(s.engine).fireSubTrigger("endOfTurn");
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === bondInstanceId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === bondInstanceId)).toBe(true);
  });

  it("keeps the red requirement while ignoring level", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-033", as: "yellowAgumon" },
          { card: "BT6-087", as: "tai" },
        ],
        hand: [{ card: "BT6-018", as: "bond" }],
        security: ["BT1-001", "BT1-002"],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("tai").topCard.instanceId,
        effectKey: "BT6-087/main-digivolve-bond-of-bravery",
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("Q1472 trashes the only security and keeps the Bond at end of turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-010", as: "agumon" },
            { card: "BT6-087", as: "tai" },
          ],
          hand: [{ card: "BT6-018", as: "bond" }],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("tai").topCard.instanceId,
        effectKey: "BT6-087/main-digivolve-bond-of-bravery",
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("agumon").topCard.cardId === "BT6-018" && s.state.players[0]!.security.length === 0);

    expect(observe(s.engine).subscriptions("endOfTurn")).toHaveLength(0);
    await advance(s.engine).fireSubTrigger("endOfTurn");
    expect(s.perm("agumon").topCard.cardId).toBe("BT6-018");
  });
});
