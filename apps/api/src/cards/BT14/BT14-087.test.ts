import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-087.js";
import { Phase } from "@aegis/shared";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("BT14-087", () => {
  it("grants memory, Mind Link, and inherited Alliance/Blocker", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [{ kind: "GainMemory", amount: 1 }],
    });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "Main", actions: [{ kind: "MindLink" }] });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [{ kind: "Aura" }, { kind: "Aura" }],
    });
  });

  it("plays Eiji from its digivolution cards and plays itself from security", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "EndOfAllTurns",
      isInherited: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
    expect(compiled.effects?.[4]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
    expect(compiled.effects?.[3]?.actions[0]).toMatchObject({ fromOwnDigivolutionStack: true });
  });

  it("naturally gains start-main memory when the opponent has a Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT14-087", as: "eiji" }], hand: ["BT1-009"] },
      1: { battleArea: [{ card: "BT14-058", as: "opponent" }] },
    });
    await s.ready();
    s.state.memory = 3;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.memory === 4);
    expect(s.state.memory).toBe(4);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("naturally Mind Links Eiji under an eligible Dark Animal Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-074", as: "loogarmon" },
            { card: "BT14-058", as: "unrelated" },
          ],
          hand: [{ card: "BT14-087", as: "eiji" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("eiji").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-087"));
    const eiji = s.state.players[0]!.battleArea.find((perm) => perm.topCard?.cardId === "BT14-087")!;
    const effects = observe(s.engine).activatableEffects(eiji) as Array<{ effectKey: string }>;
    expect(effects.length).toBeGreaterThan(0);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: eiji.topCard!.instanceId,
        effectKey: effects[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-087"));
    expect(s.perm("loogarmon").stack.some((card) => card.cardId === "BT14-087")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("loogarmon"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("loogarmon"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("unrelated"), "Alliance")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("unrelated"), "Blocker")).toBe(false);
  });

  it("naturally plays Eiji from this host's own stack at end of all turns", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT14-074", as: "loogarmon", under: ["BT14-087"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const turn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Main);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-087")).toBe(true);
  });

  it("plays itself from security through a natural security check", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-071", as: "attacker" }] },
        1: { security: [{ card: "BT14-087", as: "securityEiji" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-087"));
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-087")).toBe(true);
  });
});
