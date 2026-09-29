import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT6-097.js";

describe("BT6-097 Howling Memory Boost!", () => {
  it("places itself in the battle area from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT6-097", as: "security", faceUp: true }] } });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT6-097")).toBe(true);
  });

  it("trashes 2 bottom sources, restricts a source-less Digimon, and places itself", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT6-019"], hand: [{ card: "BT6-097", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "restricted" },
            { card: "BT6-020", as: "stripped", under: ["BT6-021", "BT6-022"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const stripped = s.perm("stripped");
    const restricted = s.perm("restricted");
    const optionId = s.inst("option").instanceId;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));

    expect(stripped.stack).toHaveLength(0);
    expect(observe(s.engine).isRestricted(restricted, "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(restricted, "block")).toBe(true);
  });

  it("Delay trashes the placed Option and gains 2 memory on a later turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT6-019"], hand: [{ card: "BT6-097", as: "option" }] },
        1: { battleArea: [{ card: "BT1-009", under: ["BT1-001", "BT1-002"] }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    const optionId = s.inst("option").instanceId;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));
    const optionPermanent = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === optionId,
    )!;
    s.state.turnCount += 1;
    s.state.memory = 3;
    await s.ready();
    const effects = observe(s.engine).activatableEffects(optionPermanent) as Array<{ effectKey: string }>;

    expect(effects).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: optionId, effectKey: effects[0]!.effectKey }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 5);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
  });
});

describe("BT6-097 Howling Memory Boost! — KB Q&A rulings", () => {
  it("keeps a restricted Digimon unable to attack or block after it gains a digivolution card (Q1483)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT6-019"],
          hand: [{ card: "BT6-097", as: "option" }],
          security: ["BT1-010", "BT1-011"],
          deck: ["BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "restricted" },
            { card: "BT1-064", as: "bystander" },
          ],
          hand: [{ card: "BT1-015", as: "greymon" }],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("restricted").topCard.instanceId);
    const optionId = s.inst("option").instanceId;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));

    expect(s.perm("restricted").stack).toHaveLength(0);
    expect(observe(s.engine).isRestricted(s.perm("restricted"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("bystander"), "attack")).toBe(false);

    void s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("restricted").permanentId,
        instanceId: s.inst("greymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("restricted").topCard.instanceId === s.inst("greymon").instanceId);

    expect(s.perm("restricted").stack).toHaveLength(1);
    expect(observe(s.engine).isRestricted(s.perm("restricted"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("restricted"), "block")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("restricted").permanentId,
        target: { kind: "player" },
      }),
    ).toMatchObject({ ok: false });
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("bystander").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("may restrict a different source-less Digimon than the one it trashed sources from (Q1484)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: ["BT6-019"], hand: [{ card: "BT6-097", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT6-020", as: "stripped", under: ["BT6-021", "BT6-022"] },
            { card: "BT1-009", as: "other" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("other").topCard.instanceId);
    const optionId = s.inst("option").instanceId;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));

    const restrictChoice = s.decisions.find(({ req }) => req.kind === "chooseTargets");
    expect(restrictChoice?.req.options).toMatchObject({
      candidateInstanceIds: expect.arrayContaining([s.perm("stripped").permanentId, s.perm("other").permanentId]),
    });
    expect(s.perm("stripped").stack).toHaveLength(0);
    expect(observe(s.engine).isRestricted(s.perm("other"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("other"), "block")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("stripped"), "attack")).toBe(false);
  });
});
