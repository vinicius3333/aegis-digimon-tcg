import type { PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { drainMicrotasks, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT4-087.js";

describe("BT4-087 Anubismon", () => {
  it("plays a level 3 Digimon from trash for free and gives that Digimon Rush", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-085", as: "base", under: ["BT4-081"] }],
          hand: [{ card: "BT4-087", as: "evolving" }],
          trash: [{ card: "BT10-071", as: "played" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      const played = player.battleArea.find(
        (permanent) => permanent.topCard.instanceId === s.inst("played").instanceId,
      );
      return played !== undefined && observe(s.engine).hasKeyword(played, "Rush");
    });
    const played = player.battleArea.find((permanent) => permanent.topCard.instanceId === s.inst("played").instanceId)!;
    expect(observe(s.engine).hasKeyword(played, "Rush")).toBe(true);
  });

  it("keeps Rush after that trash-played Digimon digivolves this turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-085", as: "base", under: ["BT4-081"] }],
          hand: [
            { card: "BT4-087", as: "anubismon" },
            { card: "BT4-081", as: "evolving" },
          ],
          trash: [{ card: "BT10-071", as: "played" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("anubismon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      player.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("played").instanceId),
    );
    const played = player.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === s.inst("played").instanceId,
    )!;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: played.permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => played.topCard?.cardId === "BT4-081");

    expect(observe(s.engine).hasKeyword(played, "Rush")).toBe(true);
  });
});

describe("BT4-087 Anubismon — KB Q&A rulings", () => {
  const digivolveIntoAnubismonFromTrash = async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-085", as: "base", under: ["BT4-081"] }],
          hand: [
            { card: "BT4-087", as: "anubismon" },
            { card: "BT4-081", as: "devimon" },
          ],
          trash: [{ card: "BT10-071", as: "revived" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("anubismon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      player.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("revived").instanceId),
    );
    await drainMicrotasks();
    const revived = player.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === s.inst("revived").instanceId,
    )!;
    return { s, revived };
  };

  const attackPlayer = (s: EngineSetup, attackerPermanentId: string) =>
    s.engine.applyIntent(0, { type: "attack", attackerPermanentId, target: { kind: "player" } });

  it("gives <Rush> to the Digimon its own [When Digivolving] effect plays from the trash (Q1233)", async () => {
    const { s, revived } = await digivolveIntoAnubismonFromTrash();

    expect(observe(s.engine).hasKeyword(revived, "Rush")).toBe(true);
    expect(attackPlayer(s, revived.permanentId)).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);

    const fromHand = setupEngine({
      0: {
        battleArea: [{ card: "BT4-087", as: "anubismon", under: ["BT4-085"] }],
        hand: [{ card: "BT10-071", as: "fromHand" }],
      },
      1: { security: ["BT1-009"] },
    });
    fromHand.state.memory = 3;
    expect(
      fromHand.engine.applyIntent(0, { type: "playCard", instanceId: fromHand.inst("fromHand").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => fromHand.state.players[0]!.battleArea.length === 2);
    const playedFromHand = fromHand.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.cardId === "BT10-071",
    )!;
    expect(observe(fromHand.engine).hasKeyword(playedFromHand, "Rush")).toBe(false);
    expect(attackPlayer(fromHand, playedFromHand.permanentId).ok).toBe(false);
  });

  it("keeps <Rush> after the trash-played Digimon digivolves, so it can still attack that turn (Q1234)", async () => {
    const { s, revived } = await digivolveIntoAnubismonFromTrash();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: revived.permanentId,
        instanceId: s.inst("devimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => revived.topCard?.cardId === "BT4-081");

    expect(observe(s.engine).hasKeyword(revived, "Rush")).toBe(true);
    expect(attackPlayer(s, revived.permanentId)).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);

    const fromHand = setupEngine({
      0: {
        battleArea: [{ card: "BT4-087", as: "anubismon", under: ["BT4-085"] }],
        hand: [
          { card: "BT10-071", as: "fromHand" },
          { card: "BT4-081", as: "devimon" },
        ],
      },
      1: { security: ["BT1-009"] },
    });
    fromHand.state.memory = 5;
    expect(
      fromHand.engine.applyIntent(0, { type: "playCard", instanceId: fromHand.inst("fromHand").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => fromHand.state.players[0]!.battleArea.length === 2);
    const playedFromHand = fromHand.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.cardId === "BT10-071",
    )!;
    expect(
      fromHand.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: playedFromHand.permanentId,
        instanceId: fromHand.inst("devimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => playedFromHand.topCard?.cardId === "BT4-081");

    expect(observe(fromHand.engine).hasKeyword(playedFromHand, "Rush")).toBe(false);
    expect(attackPlayer(fromHand, playedFromHand.permanentId).ok).toBe(false);
  });
});
