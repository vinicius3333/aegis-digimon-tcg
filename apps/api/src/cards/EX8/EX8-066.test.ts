import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition, PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX8-066.js";
import "./index.js";

describe("EX8-066", () => {
  it("matches the committed catalog identity and every printed clause", () => {
    expect(getCardDefinition("EX8-066")).toMatchObject({
      cardId: "EX8-066",
      nameEn: "Suzune Kazuki",
      colors: ["Blue"],
      kinds: ["Tamer"],
      playCost: 3,
      dp: 0,
      evoCosts: [],
      forms: ["-"],
      attributes: ["-"],
      types: ["LIBERATOR"],
      effectText: expect.stringContaining("gain 1 memory"),
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(getCardDefinition("EX8-066")?.inheritedEffectText).toBeUndefined();
  });

  it("registers the printed start-main memory gain", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase")).toMatchObject({
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: { kind: "opponentHas", filter: { controllerDefault: "opponent", kind: ["Digimon"] } },
        },
      ],
    });
  });
  it("registers the All Turns Ice-Snow play and digivolve watcher", () => {
    const actions = compiled.effects.find((entry) => entry.trigger === "AllTurns")?.actions ?? [];
    expect(actions).toHaveLength(2);
    for (const event of ["whenPlayed", "whenOneOfYoursDigivolves"] as const) {
      expect(actions).toContainEqual({
        kind: "SubTrigger",
        event,
        sourceFilter: {
          controller: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Ice-Snow"], match: "trait" }],
        },
        actions: [
          {
            kind: "TrashDigivolution",
            target: {
              filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" },
              count: 1,
            },
            amount: 1,
            cost: {
              kind: "suspend",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              raw: "by suspending this Tamer",
            },
            optional: true,
            abortOnDecline: true,
          },
        ],
      });
    }
  });
  it("registers the printed security play effect", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          payCost: false,
        },
      ],
    });
  });
  it("plays the exact security Tamer into the battle area without cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
      1: { security: [{ card: "EX8-066", as: "securityCard" }] },
    });
    const instanceId = s.inst("securityCard").instanceId;
    const memoryBeforeSecurityEffect = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      (s.state.players[1] as PlayerState).battleArea.some((permanent) => permanent.topCard.cardId === "EX8-066"),
    );
    expect(
      (s.state.players[1] as PlayerState).battleArea.some((permanent) => permanent.topCard.instanceId === instanceId),
    ).toBe(true);
    expect((s.state.players[1] as PlayerState).security.some((card) => card.instanceId === instanceId)).toBe(false);
    expect(s.state.memory).toBe(memoryBeforeSecurityEffect);
  });
  it("suspends to trash an opponent's digivolution card when an Ice-Snow Digimon is played", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-066", as: "tamer" }], hand: [{ card: "EX8-019", as: "ice" }] },
        1: { battleArea: [{ card: "AD1-001", as: "opponent", under: ["BT1-010"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const stackedInstanceId = s.perm("opponent").stack[0]!.instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ice").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("tamer").isSuspended && s.perm("opponent").stack.length === 0);

    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.perm("opponent").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === stackedInstanceId)).toBe(true);
  });
  it("gains memory only with an opposing Digimon and triggers on a real Ice-Snow evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-066", as: "tamer" },
            { card: "EX8-019", as: "iceBase" },
          ],
          hand: [{ card: "EX8-022", as: "iceEvolution" }],
        },
        1: {
          battleArea: [{ card: "EX8-064", as: "opponent", under: ["EX8-057", "BT10-009", "EX8-060", "EX8-062"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("tamer"));
    expect(s.state.memory).toBe(1);
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("iceBase").permanentId,
        instanceId: s.inst("iceEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").isSuspended && s.perm("opponent").stack.length === 1);
    expect(s.perm("opponent").stack).toHaveLength(1);

    const noOpponent = setupEngine({ 0: { battleArea: [{ card: "EX8-066", as: "tamer" }] } });
    await advance(noOpponent.engine).fire(EffectTiming.StartOfYourMainPhase, noOpponent.perm("tamer"));
    expect(noOpponent.state.memory).toBe(0);
  });

  it("may refuse the Ice-Snow play trigger without suspending or trashing a source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-066", as: "tamer" }], hand: [{ card: "EX8-019", as: "ice" }] },
      1: { battleArea: [{ card: "AD1-001", as: "opponent", under: ["BT1-010"] }] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ice").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.perm("opponent").stack).toHaveLength(1);
  });
});
