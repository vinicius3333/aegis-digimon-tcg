import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-111.js";
import "../BT18/BT18-034.js";
import "../BT19/BT19-077.js";
import "../EX10/EX10-013.js";
import "../EX6/EX6-018.js";

describe("BT7-111 Lucemon: Chaos Mode", () => {
  it("uses an exact Lucemon source for the alternate hand evolution", () => {
    expect(runtimeCompiledCard("BT7-111")?.digivolutionRequirement).toEqual([
      {
        namesExact: ["Lucemon"],
        cost: 7,
        isAlternate: true,
        sourceZones: ["hand"],
      },
    ]);
  });

  it("deletes an opponent Tamer on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT7-111", as: "source" }] },
        1: {
          battleArea: [{ card: "BT7-085", as: "targetTamer" }],
        },
      },
      { autoSelectCards: true },
    );
    const opponent = s.state.players[1] as PlayerState;
    s.state.memory = 14;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => opponent.battleArea.length === 0);
    expect(opponent.trash.some((c) => c.cardId === "BT7-085")).toBe(true);
  });
});

describe("BT7-111 Lucemon: Chaos Mode — KB Q&A rulings", () => {
  it("activates its delete both when played and when digivolved into (Q1678)", async () => {
    const played = setupEngine(
      {
        0: { hand: [{ card: "BT7-111", as: "chaosMode" }] },
        1: { battleArea: [{ card: "BT7-085", as: "tamer" }] },
      },
      { autoSelectCards: true },
    );
    played.state.memory = 14;
    await played.ready();
    expect(played.engine.applyIntent(0, { type: "playCard", instanceId: played.inst("chaosMode").instanceId })).toEqual(
      { ok: true },
    );
    await settle(() => played.state.players[1]!.battleArea.length === 0);
    expect(played.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT7-085"]);

    const digivolved = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-115", as: "lucemon" }],
          hand: [{ card: "BT7-111", as: "chaosMode" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-063", as: "levelSix" }] },
      },
      { autoSelectCards: true },
    );
    digivolved.state.memory = 7;
    await digivolved.ready();
    expect(
      digivolved.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: digivolved.perm("lucemon").permanentId,
        instanceId: digivolved.inst("chaosMode").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => digivolved.state.players[1]!.battleArea.length === 0);
    expect(digivolved.perm("lucemon").topCard.cardId).toBe("BT7-111");
    expect(digivolved.state.memory).toBe(0);
    expect(digivolved.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-063"]);
  });

  it("lets an effect that digivolves one of your Digimon use the [Lucemon] hand alternate (Q1679)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-077", as: "calumon" },
            { card: "BT1-010", as: "notLucemon" },
            { card: "BT4-115", as: "lucemon" },
          ],
          hand: [{ card: "BT7-111", as: "chaosMode" }],
          deck: ["BT1-011", "BT1-012"],
        },
        1: { battleArea: [{ card: "BT7-085", as: "tamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 5;
    await s.ready();
    preferred.push(s.perm("notLucemon").topCard.instanceId, s.inst("chaosMode").instanceId);

    const [entry] = JSON.parse(s.perm("calumon").activatableEffectsJson ?? "[]") as { effectKey: string }[];
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("calumon").topCard.instanceId,
        effectKey: entry!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("lucemon").topCard.cardId === "BT7-111");
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("notLucemon").topCard.cardId).toBe("BT1-010");
    expect(s.perm("lucemon").topCard.instanceId).toBe(s.inst("chaosMode").instanceId);
    expect(s.perm("lucemon").stack.map(({ cardId }) => cardId)).toEqual(["BT4-115"]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT7-085"]);
  });

  it("cannot be digivolved into from the trash by BT18-034 Lucemon's [End of Your Turn] effect (Q4999)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-034", as: "lucemon" },
            { card: "BT1-063", as: "levelSix" },
          ],
          trash: [
            { card: "BT7-111", as: "illegalChaosMode" },
            { card: "BT18-082", as: "legalChaosMode" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 3;
    s.state.turnSeat = 0;
    await s.ready();
    preferred.push(s.inst("illegalChaosMode").instanceId);

    await advance(s.engine).runTurn(0);

    expect(s.perm("lucemon").topCard.instanceId).toBe(s.inst("legalChaosMode").instanceId);
    expect(
      s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("illegalChaosMode").instanceId),
    ).toBe(true);
  });

  it("cannot be digivolved into from the trash by EX6-018 Lucemon's [End of Your Turn] effect (Q5002)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-018", as: "lucemon" },
            { card: "EX6-029", as: "levelSix" },
          ],
          trash: [
            { card: "BT7-111", as: "illegalChaosMode" },
            { card: "EX6-054", as: "legalChaosMode" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 3;
    s.state.turnSeat = 0;
    await s.ready();
    preferred.push(s.inst("illegalChaosMode").instanceId);

    await advance(s.engine).runTurn(0);

    expect(s.perm("lucemon").topCard.instanceId).toBe(s.inst("legalChaosMode").instanceId);
    expect(
      s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("illegalChaosMode").instanceId),
    ).toBe(true);
  });

  it("cannot be digivolved into from the trash by EX10-013 Lucemon's [End of Your Turn] effect (Q5041)", async () => {
    const preferred: string[] = [];
    const lucemonTextCosts = ["BT18-034", "BT4-115", "EX6-018", "BT19-043", "EX10-004"];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-013", as: "lucemon" }],
          trash: [
            ...lucemonTextCosts.map((card, index) => ({ card, as: `cost${index}` })),
            { card: "EX10-052", as: "legalChaosMode" },
            { card: "BT7-111", as: "illegalChaosMode" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 3;
    s.state.turnSeat = 0;
    await s.ready();
    preferred.push(
      ...lucemonTextCosts.map((_, index) => s.inst(`cost${index}`).instanceId),
      s.inst("illegalChaosMode").instanceId,
    );

    await advance(s.engine).runTurn(0);

    expect(s.perm("lucemon").topCard.instanceId).toBe(s.inst("legalChaosMode").instanceId);
    expect(
      s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("illegalChaosMode").instanceId),
    ).toBe(true);
  });
});
