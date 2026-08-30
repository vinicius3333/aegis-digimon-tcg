import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-081.js";
import "./index.js";

describe("BT17-081 Tai Kamiya & Matt Ishida", () => {
  it("matches the catalog identity and printed clauses", () => {
    expect(getCardDefinition("BT17-081")).toMatchObject({
      nameEn: "Tai Kamiya & Matt Ishida",
      colors: ["Red", "Blue"],
      kinds: ["Tamer"],
      playCost: 4,
      effectText: expect.stringContaining("When one of your Digimon is played or digivolves"),
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
  });

  it("triggers on both a Digimon being played and a Digimon digivolving", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          fireCondition: { kind: "anyOf", conditions: [{ kind: "youHave" }, { kind: "youHave" }] },
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
        },
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          fireCondition: { kind: "anyOf", conditions: [{ kind: "youHave" }, { kind: "youHave" }] },
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
        },
      ],
    });
  });

  it("suspends this Tamer and independently gains memory for Greymon and Garurumon", () => {
    for (const action of compiled.effects?.[0]?.actions ?? []) {
      expect(action).toMatchObject({
        cost: { kind: "suspend", target: { isSelf: true } },
        actions: [
          { kind: "GainMemory", amount: 1, condition: { kind: "youHave" } },
          { kind: "GainMemory", amount: 1, condition: { kind: "youHave" } },
        ],
      });
    }
  });

  it("once per turn attacks the player with an unsuspended Omnimon-named Digimon", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "EndOfYourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Attack",
          attackPlayer: true,
          optional: true,
          target: { filter: { nameOrTrait: [{ tokens: ["Omnimon"], match: "name" }], suspended: false } },
        },
      ],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
  });

  it("naturally suspends and gains two memory when a neutral Digimon is played with both names present", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-081", as: "tamer" },
            { card: "BT1-015", as: "greymon" },
            { card: "BT1-036", as: "garurumon" },
          ],
          hand: [{ card: "BT1-009", as: "played" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;

    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("tamer").isSuspended && s.state.memory === 5);

    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.memory).toBe(5);
    assertNoLoudGap(s);
  });

  it("naturally suspends and gains only the Garurumon memory when a neutral Digimon digivolves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-081", as: "tamer" },
            { card: "BT3-007", as: "base" },
            { card: "BT1-036", as: "garurumon" },
          ],
          hand: [{ card: "BT1-014", as: "evolver" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;

    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").isSuspended && s.state.memory === 4);

    expect(s.perm("base").topCard?.cardId).toBe("BT1-014");
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.memory).toBe(4);
    assertNoLoudGap(s);
  });

  it("does not suspend or gain memory when neither named Digimon is present", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT17-081", as: "tamer" }], hand: [{ card: "BT1-009", as: "played" }] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;

    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 3 && s.state.players[0]!.hand.length === 0);

    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.state.memory).toBe(3);
    assertNoLoudGap(s);
  });

  it("honors declining the suspend cost after a natural Digimon play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-081", as: "tamer" },
            { card: "BT1-015", as: "greymon" },
            { card: "BT1-036", as: "garurumon" },
          ],
          hand: [{ card: "BT1-009", as: "played" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;

    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 3 && s.state.players[0]!.hand.length === 0);

    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.state.memory).toBe(3);
    assertNoLoudGap(s);
  });

  it("naturally attacks an opponent player at end of turn with an unsuspended Omnimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-081", as: "tamer" },
            { card: "BT5-086", as: "omnimon" },
          ],
        },
        1: { security: [{ card: "BT1-090", as: "security" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    await s.ready();
    await advance(s.engine).runTurn(0);
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.perm("omnimon").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT5-086")).toBe(true);
    assertNoLoudGap(s);
  });

  it("does not attack at end of turn when every Omnimon-named Digimon is suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-081", as: "tamer" },
            { card: "BT5-086", as: "omnimon", suspended: true },
          ],
        },
        1: { security: [{ card: "BT1-090", as: "security" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.suspend([s.perm("omnimon").permanentId]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.perm("omnimon").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("naturally plays itself from security without paying its cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT5-086", as: "attacker" }], security: ["BT1-090"] },
        1: { security: [{ card: "BT17-081", as: "securityTamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const instanceId = s.inst("securityTamer").instanceId;

    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId),
    );

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId)).toBe(true);
    expect(s.state.players[1]!.security.some((card) => card.instanceId === instanceId)).toBe(false);
    assertNoLoudGap(s);
  });
});
