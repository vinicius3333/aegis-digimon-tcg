import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-098.js";
import "./index.js";

describe("BT17-098 Hacker Pride", () => {
  it("reveals Pulsemon-text cards and places the Option in the battle area", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Main",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [{ to: "hand", count: 1, filter: { nameOrTrait: [{ tokens: ["Pulsemon"], match: "text" }] } }],
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
  });

  it("uses Delay to place only the selected Digimon's top card into Security", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Main",
      keywords: [{ keyword: "Delay" }],
      actions: [
        {
          kind: "GainMemory",
          amount: 2,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "place",
            targetIsPermanent: true,
            detachPermanentTop: true,
            destination: "security",
            position: "top",
            target: {
              count: 1,
              filter: {
                levelComparison: { op: "gte", value: 4 },
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Pulsemon"], match: "text" }],
              },
            },
          },
        },
      ],
    });
  });

  it("preserves the same reveal-and-place sequence in Security", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "RevealAdd" }, { kind: "PlaceInBattleAreaSelf" }],
    });
  });

  it("adds a Pulsemon-text card and places itself through the public Main flow", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT17-036"],
          hand: [{ card: "BT17-098", as: "option" }],
          deck: [{ card: "BT17-069", as: "match" }, "BT1-001", "BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    const optionId = s.inst("option").instanceId;
    const matchId = s.inst("match").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === matchId)).toBe(true);
  });

  it("naturally activates Delay to place the selected host's top card into Security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-098", as: "option" },
            { card: "BT17-036", as: "pulseHost", under: ["BT17-080"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.perm("option").placedByEffect = true;
    await s.ready();
    s.state.turnCount += 1;
    s.state.turnSeat = 0;
    s.state.memory = 0;
    const topId = s.perm("pulseHost").topCard!.instanceId;
    const effects = observe(s.engine).activatableEffects(s.perm("option")) as Array<{
      effectKey: string;
      description?: string;
    }>;
    const delay = effects[0];
    expect(delay).toBeDefined();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("option").instanceId,
        effectKey: delay!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === topId));

    expect(s.state.players[0]!.security.some((card) => card.instanceId === topId)).toBe(true);
    expect(s.perm("pulseHost").topCard?.cardId).toBe("BT17-080");
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });

  it("naturally reveals the same Pulsemon-text search and places itself from Security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT17-098", as: "securityOption" }],
          deck: [{ card: "BT17-069", as: "match" }, "BT1-001", "BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoSelectCards: true },
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
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-098") &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("match").instanceId),
    );

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("match").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-098")).toBe(true);
  });
});
