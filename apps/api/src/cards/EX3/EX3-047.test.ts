import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX3-047.js";
import "./EX3-048.js";
import "./EX3-049.js";
import "./EX3-065.js";

describe("EX3-047 Jazamon", () => {
  it.each([
    ["black", "EX3-002"],
    ["red", "BT1-001"],
  ])("has the official metadata and digivolves from a %s level 2 for 0", async (_color, baseCardId) => {
    expect(getCardDefinition("EX3-047")).toMatchObject({
      cardId: "EX3-047",
      nameEn: "Jazamon",
      colors: ["Black"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [
        { color: "Black", level: 2, memoryCost: 0 },
        { color: "Red", level: 2, memoryCost: 0 },
      ],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Bird Dragon"],
      rarity: "U",
    });
    const s = setupEngine({
      0: {
        breeding: { card: baseCardId, as: "base" },
        hand: [{ card: "EX3-047", as: "jazamon" }],
        deck: ["BT1-002"],
      },
    });
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("jazamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX3-047");

    expect(s.state.memory).toBe(1);
    expect(s.perm("base").topCard.cardId).toBe("EX3-047");
  });

  it("gains 1 memory when its controller plays Hina Kurihara during their turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-047", as: "jazamon" }],
        hand: [{ card: "EX3-065", as: "hina" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hina").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);

    expect(s.state.memory).toBe(1);
    expect(s.events.some(({ kind }) => kind === "memoryChanged")).toBe(true);
  });

  it("is once per turn even when two Hina Kurihara are played", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-047", as: "jazamon" }],
        hand: [
          { card: "EX3-065", as: "firstHina" },
          { card: "EX3-065", as: "secondHina" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstHina").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 8);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondHina").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "EX3-065").length === 2,
    );

    expect(s.state.memory).toBe(5);
  });

  it("resets its once-per-turn use on the controller's next turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-047", as: "jazamon" }],
        hand: [
          { card: "EX3-065", as: "firstHina" },
          { card: "EX3-065", as: "secondHina" },
        ],
        deck: ["BT1-001", "BT1-002", "BT1-003"],
      },
      1: { deck: ["BT1-004", "BT1-005", "BT1-006"] },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstHina").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 8);
    const firstTurnCount = s.state.turnCount;
    await advance(s.engine).runTurn(0);
    expect(s.state.turnCount).toBeGreaterThan(firstTurnCount);
    expect(s.state.turnSeat).toBe(0);
    s.state.phase = Phase.Main;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondHina").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 8);

    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "EX3-065")).toHaveLength(2);
  });

  it("lets two Jazamon copies trigger independently from one Hina play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-047", as: "firstJazamon" },
          { card: "EX3-047", as: "secondJazamon" },
        ],
        hand: [{ card: "EX3-065", as: "hina" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hina").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory === 2);

    expect(s.state.memory).toBe(2);
  });

  it("does not trigger from the opponent's Hina play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX3-047", as: "jazamon" }] },
      1: { hand: [{ card: "EX3-065", as: "opponentHina" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentHina").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-065"));

    expect(s.state.memory).toBe(0);
  });

  it("Bird Dragon family: its inherited effect gives +1000 DP to Jazardmon, which has an On Play effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX3-048", under: ["EX3-047"], as: "jazardmon" }] },
    });
    await s.ready();

    expect(s.perm("jazardmon").currentDP).toBe(5000);
  });

  it("does not grant inherited DP to a live top card without an On Play effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX3-049", under: ["EX3-047"], as: "host" }] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(4000);
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(4000);
  });
});
