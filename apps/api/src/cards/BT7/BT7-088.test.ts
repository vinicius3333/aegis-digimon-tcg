import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT7-088.js";
import "./BT7-029.js";
import "./BT7-036.js";
import "../BT19/BT19-077.js";

describe("BT7-088 Zoe Orimoto", () => {
  it("uses trait-substring matching for the security search", () => {
    expect(runtimeCompiledCard("BT7-088")?.effects[0]?.actions[0]).toMatchObject({
      selectionFilter: {
        nameOrTrait: [{ tokens: ["Hybrid", "Ten Warriors"], match: "traitContains" }],
      },
    });
  });

  it("gives Security Digimon +3000 DP from a host's sources on the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT7-038", as: "host", under: ["BT7-088"] }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).securityDp(0)).toBe(3000);
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });

  it("adds a matching security card to hand, then recovers from the deck", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT7-088", as: "zoe" }],
          security: [
            { card: "BT1-009", as: "nonMatchingSecurity" },
            { card: "BT7-030", as: "tenWarriorsSecurity" },
          ],
          deck: [{ card: "BT1-010", as: "recoveryCard" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const matchingId = s.inst("tenWarriorsSecurity").instanceId;
    const recoveryId = s.inst("recoveryCard").instanceId;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zoe").instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        player.hand.some((card) => card.instanceId === matchingId) &&
        player.security.some((card) => card.instanceId === recoveryId),
    );

    expect(player.hand.map((card) => card.instanceId)).toContain(matchingId);
    expect(player.security.map((card) => card.instanceId)).toContain(recoveryId);
    expect(player.deck).toHaveLength(0);
  });

  it("does not recover when the optional security search is declined", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT7-088", as: "zoe" }],
          security: [{ card: "BT7-030", as: "matchingSecurity" }],
          deck: [{ card: "BT1-010", as: "deckTop" }],
        },
      },
      { autoDeclineOptional: true },
    );
    const player = s.state.players[0] as PlayerState;
    const securityId = s.inst("matchingSecurity").instanceId;
    const deckId = s.inst("deckTop").instanceId;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zoe").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(player.security.map((card) => card.instanceId)).toEqual([securityId]);
    expect(player.deck.map((card) => card.instanceId)).toEqual([deckId]);
  });

  it("does not recover when security contains no Hybrid or Ten Warriors card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT7-088", as: "zoe" }],
          security: [{ card: "BT1-009", as: "nonMatchingSecurity" }],
          deck: [{ card: "BT1-010", as: "deckTop" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const securityId = s.inst("nonMatchingSecurity").instanceId;
    const deckId = s.inst("deckTop").instanceId;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zoe").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(player.security.map((card) => card.instanceId)).toEqual([securityId]);
    expect(player.deck.map((card) => card.instanceId)).toEqual([deckId]);
  });
});

describe("BT7-088 Zoe Orimoto — KB Q&A rulings", () => {
  it("cannot be digivolved into [MagnaGarurumon] by an effect that digivolves one of your Digimon (Q1663)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-077", as: "calumon" },
            { card: "BT7-088", as: "zoe" },
            { card: "BT1-042", as: "levelFiveBlue" },
            { card: "BT1-038", as: "otherLevelFiveBlue" },
          ],
          // Zephyrmon may digivolve onto a yellow Tamer by its own rule, so Zoe is a legal
          // digivolution base and only "a Tamer isn't one of your Digimon" can keep her out.
          hand: [
            { card: "BT7-029", as: "magnaGarurumon" },
            { card: "BT7-036", as: "zephyrmon" },
          ],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-013"],
        },
        1: { security: ["BT1-009", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    s.state.memory = 5;
    await s.ready();
    preferInstanceIds.push(s.perm("levelFiveBlue").permanentId, s.inst("magnaGarurumon").instanceId);

    const entries = JSON.parse(s.perm("calumon").activatableEffectsJson ?? "[]") as { effectKey: string }[];
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("calumon").topCard!.instanceId,
        effectKey: entries[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("levelFiveBlue").topCard?.cardId === "BT7-029");

    const digivolveTargets = s.decisions.find(({ req }) => req.options?.targetFate === "digivolve");
    expect(digivolveTargets?.req.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("levelFiveBlue").permanentId, s.perm("otherLevelFiveBlue").permanentId]),
    );
    expect(digivolveTargets?.req.options?.candidateInstanceIds).not.toContain(s.perm("zoe").permanentId);
    expect(s.perm("zoe").topCard?.cardId).toBe("BT7-088");
    expect(s.perm("zoe").stack).toHaveLength(0);
    expect(s.perm("levelFiveBlue").topCard?.cardId).toBe("BT7-029");

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("zoe").permanentId,
        instanceId: s.inst("zephyrmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("zoe").topCard?.cardId === "BT7-036");
  });
});
