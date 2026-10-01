import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT10-057.js";
describe("BT10-057 Bloomlordmon", () => {
  it("matches its catalog and exact scaling IR", () => {
    const d = getCardDefinition("BT10-057")!;
    expect([d.colors, d.level, d.playCost, d.dp]).toEqual([["Green"], 6, 12, 12000]);
    expect(d.evoCosts).toEqual([{ color: "Green", level: 5, memoryCost: 4 }]);
    expect([d.forms, d.attributes, d.types]).toEqual([["Mega"], ["Vaccine"], ["Fairy"]]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toHaveLength(2);
    expect(compiled.effects.map(({ trigger }) => trigger)).toEqual(["WhenDigivolving", "YourTurn"]);
  });

  it("gains memory for suspended Vegetation/Plant/Fairy Digimon, then unsuspends and gains Piercing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-071", as: "toSuspend" },
            { card: "BT10-046", as: "alreadySuspended", suspended: true },
            { card: "AD1-011", as: "base", suspended: true },
          ],
          hand: [{ card: "BT10-057", as: "evolving" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.perm("base").isSuspended &&
        observe(s.engine).hasPierce(s.perm("base")) &&
        [...s.perm("base").keywords].includes("Piercing"),
    );
    expect(s.state.memory).toBe(3);
    expect(s.perm("toSuspend").isSuspended).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("base"))).toBe(true);
    expect([...s.perm("base").keywords]).toContain("Piercing");
  });

  it("does not publish conditional Piercing to the UI before gaining 2 memory", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-057", as: "bloom" }] } });

    await s.engine.recomputeContinuousEffects();

    expect([...s.perm("bloom").keywords]).not.toContain("Piercing");
  });

  it("stays suspended and gains no Piercing when only BloomLordmon itself qualifies", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-011", as: "base", suspended: true }],
          hand: [{ card: "BT10-057", as: "evolving" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);

    expect(s.perm("base").isSuspended).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("base"))).toBe(false);
    expect([...s.perm("base").keywords]).not.toContain("Piercing");
  });

  it("scales +2000 DP and Security Attack for every 2 suspended Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-057", as: "bloom", suspended: true },
          { card: "BT10-043", suspended: true },
          { card: "BT10-046", suspended: true },
          { card: "BT10-047", suspended: true },
        ],
      },
    });

    await s.engine.recomputeContinuousEffects();

    expect(s.perm("bloom").currentDP).toBe(16000);
    expect(observe(s.engine).keywordAmount(s.perm("bloom"), "SecurityAttack")).toBe(2);
    expect([...s.perm("bloom").keywords]).toContain("SecurityAttack");
  });

  it("does not retain the Your Turn scaling during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-057", as: "bloom", suspended: true },
          { card: "BT10-043", suspended: true },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("bloom").currentDP).toBe(12000);
    expect(observe(s.engine).keywordAmount(s.perm("bloom"), "SecurityAttack")).toBe(0);
  });
});

describe("BT10-057 Bloomlordmon — KB Q&A rulings", () => {
  it("may suspend itself with [When Digivolving], gain 2 memory, then unsuspend and gain Piercing (Q1980)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-011", as: "base" },
            { card: "BT10-046", as: "suspendedVegetation", suspended: true },
            { card: "BT1-009", as: "unsuspendedBystander" },
          ],
          hand: [{ card: "BT10-057", as: "evolving" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("base").permanentId, s.inst("evolving").instanceId);
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.memory === 2);

    const suspendChoice = s.decisions.find(({ req }) =>
      req.options?.candidateInstanceIds?.includes(s.perm("unsuspendedBystander").permanentId),
    );
    expect(suspendChoice?.req.options?.candidateInstanceIds).toContain(s.perm("base").permanentId);
    expect(s.state.memory).toBe(2);
    expect(s.perm("base").topCard.cardId).toBe("BT10-057");
    expect(s.perm("base").isSuspended).toBe(false);
    expect(s.perm("unsuspendedBystander").isSuspended).toBe(false);
    expect(observe(s.engine).hasPierce(s.perm("base"))).toBe(true);
  });

  it("gains +4000 DP and Security Attack +2 with 4 suspended Digimon (Q1981)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-057", as: "bloom" },
          { card: "BT10-043", suspended: true },
          { card: "BT10-046", suspended: true },
          { card: "BT10-047", suspended: true },
          { card: "BT1-009", as: "fourth", suspended: true },
        ],
      },
    });

    await s.engine.recomputeContinuousEffects();
    expect(s.perm("bloom").currentDP).toBe(16000);
    expect(observe(s.engine).keywordAmount(s.perm("bloom"), "SecurityAttack")).toBe(2);

    s.perm("fourth").isSuspended = false;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("bloom").currentDP).toBe(14000);
    expect(observe(s.engine).keywordAmount(s.perm("bloom"), "SecurityAttack")).toBe(1);
  });

  it("counts itself as a suspended Digimon for its [Your Turn] effect (Q1982)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-057", as: "bloom", suspended: true },
          { card: "BT1-009", suspended: true },
        ],
      },
    });

    await s.engine.recomputeContinuousEffects();
    expect(s.perm("bloom").currentDP).toBe(14000);
    expect(observe(s.engine).keywordAmount(s.perm("bloom"), "SecurityAttack")).toBe(1);

    s.perm("bloom").isSuspended = false;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("bloom").currentDP).toBe(12000);
    expect(observe(s.engine).keywordAmount(s.perm("bloom"), "SecurityAttack")).toBe(0);
  });
});
