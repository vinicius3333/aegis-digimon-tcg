import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_086 } from "./BT24-086.js";
import "../index.js";

describe("BT24-086 The Crossroad Witch", () => {
  it("mind-links to the correct traits and scopes the inherited play to this stack", () => {
    const allTurns = BT24_086.effects?.find((entry) => entry.trigger === "AllTurns" && !entry.isInherited);
    for (const action of allTurns?.actions ?? []) {
      expect(action).toMatchObject({
        kind: "SubTrigger",
        event: expect.stringMatching(/whenPlayed|whenOneOfYoursDigivolves/),
        actions: [
          {
            kind: "MindLink",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["X Antibody", "DigiPolice", "SEEKERS"], match: "trait" }],
              },
            },
          },
        ],
      });
    }
    const inherited = BT24_086.effects?.find((entry) => entry.trigger === "EndOfAllTurns");
    expect(inherited?.actions?.[0]).toMatchObject({
      from: ["digivolutionCards"],
      fromOwnDigivolutionStack: true,
      target: {
        filter: { nameOrTrait: [{ tokens: ["Shuu Yulin"], match: "nameExact" }] },
      },
    });
    expect((inherited?.actions?.[0] as any)?.target?.filter?.nameOrTrait).toEqual([
      { tokens: ["Shuu Yulin"], match: "nameExact" },
    ]);
  });

  it("self-scopes both inherited keywords to a qualifying host", () => {
    const inherited = BT24_086.effects.find((entry) => entry.trigger === "AllTurns" && entry.isInherited);
    expect(inherited?.actions).toEqual([
      expect.objectContaining({
        kind: "Aura",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        effect: { kind: "keyword", keyword: expect.objectContaining({ keyword: "Alliance" }) },
        while: {
          kind: "selfHasTrait",
          filter: { nameOrTrait: [{ tokens: ["X Antibody", "DigiPolice", "SEEKERS"], match: "trait" }] },
        },
      }),
      expect.objectContaining({
        kind: "Aura",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        effect: { kind: "keyword", keyword: expect.objectContaining({ keyword: "Reboot" }) },
        while: {
          kind: "selfHasTrait",
          filter: { nameOrTrait: [{ tokens: ["X Antibody", "DigiPolice", "SEEKERS"], match: "trait" }] },
        },
      }),
    ]);
  });

  it.each(["whenPlayed", "whenOneOfYoursDigivolves"] as const)(
    "Mind Links to the qualifying Digimon after %s",
    async (event) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT24-086", as: "witch" },
              { card: "BT13-063", as: "target" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      const witchId = s.perm("witch").permanentId;
      await s.ready();

      await advance(s.engine).fireSubTrigger(event, { subjectPermanentId: s.perm("target").permanentId });

      expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(witchId);
      expect(s.perm("target").stack.some((card) => card.cardId === "BT24-086")).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm("target"), "Alliance")).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm("target"), "Reboot")).toBe(true);
    },
  );

  it("does not grant inherited keywords to a neighboring qualifying Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "plainHost", under: ["BT24-086"] },
          { card: "BT13-063", as: "neighbor" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("plainHost"), "Alliance")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("neighbor"), "Alliance")).toBe(false);
  });

  it("plays itself from its host's digivolution cards at end of all turns (Q5674)", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-063", as: "host", under: [{ card: "BT15-087", as: "witch" }] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.EndOfAllTurns, s.perm("host"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("witch").instanceId),
    );

    expect(s.perm("host").stack.map((card) => card.instanceId)).not.toContain(s.inst("witch").instanceId);
  });

  it("gains memory only while the opponent has a Digimon", async () => {
    const withOpponent = setupEngine({
      0: { battleArea: [{ card: "BT24-086", as: "witch" }] },
      1: { battleArea: ["BT1-009"] },
    });
    withOpponent.state.memory = 2;
    await withOpponent.ready();
    await advance(withOpponent.engine).fire(EffectTiming.StartOfYourMainPhase, withOpponent.perm("witch"));
    expect(withOpponent.state.memory).toBe(3);

    const withoutOpponent = setupEngine({ 0: { battleArea: [{ card: "BT24-086", as: "witch" }] } });
    withoutOpponent.state.memory = 2;
    await withoutOpponent.ready();
    await advance(withoutOpponent.engine).fire(EffectTiming.StartOfYourMainPhase, withoutOpponent.perm("witch"));
    expect(withoutOpponent.state.memory).toBe(2);
  });

  it("naturally mind-links after a qualifying Digimon is played", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT24-086", as: "witch" }], hand: [{ card: "BT13-063", as: "target" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("target").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").stack.some((card) => card.instanceId === s.inst("witch").instanceId));
    expect(s.perm("target").stack.map((card) => card.cardId)).toContain("BT24-086");
  });

  it("plays itself from security without paying the cost", async () => {
    expect(BT24_086.effects?.[0]).toMatchObject({ trigger: "Security", isSecurity: true });
    const s = setupEngine({ 0: { security: [{ card: "BT24-086", as: "witch" }] } });
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("witch"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("witch").instanceId),
    );
  });
});
