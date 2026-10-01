import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./ST5-12.js";

describe("ST5-12 Machinedramon", () => {
  it("is fully represented as an up-to-two Reboot grant", () => {
    expect(runtimeCompiledCard("ST5-12")).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "WhenDigivolving",
          actions: [
            {
              kind: "GainKeyword",
              keyword: { keyword: "Reboot" },
              duration: "untilOpponentTurnEnd",
              target: { count: 2, upTo: true },
            },
          ],
        },
      ],
    });
  });

  it("gives up to 2 own Digimon Reboot when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST5-09", as: "base" },
            { card: "ST5-09", as: "other" },
          ],
          hand: [
            { card: "ST5-12", as: "evolving" },
            { card: "ST5-12", as: "otherEvolution" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        observe(s.engine).hasKeyword(s.perm("base"), "Reboot") &&
        observe(s.engine).hasKeyword(s.perm("other"), "Reboot"),
    );
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Reboot")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("other").permanentId,
        instanceId: s.inst("otherEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("other").topCard.instanceId === s.inst("otherEvolution").instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "Reboot")).toBe(true);
  });

  it("unsuspends a granted Reboot Digimon during the opponent's Active phase and expires after that turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST5-09", as: "base" },
            { card: "ST5-05", as: "target", suspended: true },
          ],
          hand: [{ card: "ST5-12", as: "evolving" }],
          deck: ["ST1-02", "ST1-02"],
        },
        1: { deck: ["ST5-03"] },
      },
      { autoSelectCards: true, preferInstanceIds: [] },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("target"), "Reboot"));
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Reboot")).toBe(true);
    expect(s.perm("target").isSuspended).toBe(true);
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(s.perm("target").isSuspended).toBe(false);
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Reboot")).toBe(false);
  });
});

describe("ST5-12 Machinedramon — KB Q&A rulings", () => {
  async function digivolveGrantingRebootTo(
    s: ReturnType<typeof setupEngine>,
    base: string,
    machinedramon: string,
    rebootTargets: string[],
  ): Promise<void> {
    const decisionsBefore = s.decisions.length;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm(base).permanentId,
        instanceId: s.inst(machinedramon).instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.slice(decisionsBefore).some(({ req }) => req.kind === "chooseTargets"));
    const { req } = s.decisions.slice(decisionsBefore).find((decision) => decision.req.kind === "chooseTargets")!;
    const candidates = req.options?.candidateInstanceIds ?? [];
    const chosen = rebootTargets.map((alias) => {
      const permanent = s.perm(alias);
      return candidates.find((id) => id === permanent.permanentId || id === permanent.topCard.instanceId)!;
    });
    expect(chosen.every((id) => id !== undefined)).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: req.decisionId,
        response: { kind: "chooseTargets", instanceIds: chosen },
      }),
    ).toEqual({ ok: true });
    await settle(() => rebootTargets.every((alias) => observe(s.engine).hasKeyword(s.perm(alias), "Reboot")));
  }

  it("can give Reboot to Machinedramon itself, which unsuspends in the opponent's unsuspend phase (Q667)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST5-10", as: "self", suspended: true },
          { card: "ST5-05", as: "bystander", suspended: true },
        ],
        hand: [{ card: "ST5-12", as: "machinedramon" }],
        deck: ["ST1-02", "ST1-02"],
      },
      1: { deck: ["ST5-03"] },
    });
    s.state.memory = 10;
    await s.ready();
    await digivolveGrantingRebootTo(s, "self", "machinedramon", ["self"]);
    expect(s.perm("self").topCard.cardId).toBe("ST5-12");
    expect(observe(s.engine).hasKeyword(s.perm("self"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("bystander"), "Reboot")).toBe(false);

    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(s.perm("self").isSuspended).toBe(false);
    expect(s.perm("bystander").isSuspended).toBe(true);
  });

  it("keeps the granted Reboot after the Digimon digivolves into a Digimon without Reboot (Q668)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST5-10", as: "base", suspended: true },
          { card: "ST5-05", as: "target", suspended: true },
        ],
        hand: [
          { card: "ST5-12", as: "machinedramon" },
          { card: "ST5-07", as: "jazardmon" },
        ],
        deck: ["ST1-02", "ST1-02"],
      },
      1: { deck: ["ST5-03"] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(getCardDefinition("ST5-07")?.effectText ?? "").not.toContain("Reboot");
    await digivolveGrantingRebootTo(s, "base", "machinedramon", ["target"]);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Reboot")).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("target").permanentId,
        instanceId: s.inst("jazardmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard.instanceId === s.inst("jazardmon").instanceId);
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Reboot")).toBe(true);

    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(s.perm("target").isSuspended).toBe(false);
    expect(s.perm("base").isSuspended).toBe(true);
  });
});
