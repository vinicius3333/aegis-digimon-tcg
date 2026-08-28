import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-096.js";
import "./index.js";

describe("BT17-096 Crimson Savior", () => {
  it("keeps the Main play clause and exposes Gallantmon digivolution as Delay", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Main",
      actions: [{ kind: "PlayWithoutCost" }, { kind: "PlaceInBattleAreaSelf" }],
    });
    expect(compiled.effects?.[0]?.actions?.[1]).not.toHaveProperty("optional");
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Main",
      keywords: [{ keyword: "Delay" }],
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          payCost: false,
          into: { nameOrTrait: [{ tokens: ["Gallantmon"], match: "name" }] },
        },
      ],
    });
  });

  it("grants Delay only when an opponent plays a level 5 or higher Digimon", () => {
    expect(compiled.effects?.[2]?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "gte", value: 5 } },
      actions: [{ kind: "GainKeyword", keyword: { keyword: "Delay" }, duration: "permanent" }],
    });
  });

  it("activates the Main effect from Security", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }],
    });
  });

  it("places itself in the battle area after declining the optional play", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["BT17-007"], hand: [{ card: "BT17-096", as: "option" }] } },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;
    const optionId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId)).toBe(true);
  });

  it("naturally plays a Guilmon or Takato from trash before entering the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT17-007"],
          hand: [{ card: "BT17-096", as: "option" }],
          trash: [{ card: "BT17-008", as: "guilmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-096") &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-008"),
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-096")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-008")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("guilmon").instanceId)).toBe(false);
  });

  it("naturally arms and activates Delay after an opponent level 5 or higher Digimon is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-096", as: "option" },
            { card: "BT17-013", as: "warGrowlmon" },
          ],
          hand: [{ card: "BT17-016", as: "gallantmon" }],
        },
        1: {
          hand: [{ card: "BT17-013", as: "opponentLevel5" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnCount += 1;
    s.state.turnSeat = 1;
    s.state.memory = 10;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentLevel5").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("option"), "Delay"));

    expect(observe(s.engine).hasKeyword(s.perm("option"), "Delay")).toBe(true);
    s.state.turnSeat = 0;
    const effects = observe(s.engine).activatableEffects(s.perm("option")) as Array<{
      effectKey: string;
      description?: string;
    }>;
    const delay = effects.find((effect) => String(effect.description).toLowerCase().includes("delay"));
    expect(delay).toBeDefined();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("option").instanceId,
        effectKey: delay!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("warGrowlmon").topCard?.cardId === "BT17-016");

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
    expect(s.perm("warGrowlmon").topCard?.cardId).toBe("BT17-016");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("gallantmon").instanceId)).toBe(false);
  });

  it("naturally activates the Main effect when revealed from Security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT17-096", as: "securityOption" }],
          hand: [{ card: "BT17-008", as: "guilmon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-096") &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-008"),
    );

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-096")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-008")).toBe(true);
  });
});
