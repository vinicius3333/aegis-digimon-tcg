import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-086.js";
import { Phase } from "@aegis/shared";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT14-086", () => {
  it("grants memory and Mind Links to the printed Numemon/Monzaemon/DigiPolice targets", () => {
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

  it("plays itself from security and Satsuki from its digivolution cards", () => {
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
    expect(compiled.effects?.[2]?.actions).toEqual([
      expect.objectContaining({ kind: "Aura", target: { filter: { isSelfRef: true }, isSelf: true } }),
      expect.objectContaining({ kind: "Aura", target: { filter: { isSelfRef: true }, isSelf: true } }),
    ]);
    expect(compiled.effects?.[3]?.actions[0]).toMatchObject({ fromOwnDigivolutionStack: true });
  });

  it("naturally gains start-main memory when the opponent has a Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT14-086", as: "satsuki" }] },
      1: { battleArea: [{ card: "BT14-058", as: "opponent" }] },
    });
    await s.ready();
    s.state.memory = 3;
    const turn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Main && s.state.memory === 4);
    expect(s.state.memory).toBe(4);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
  });

  it("naturally Mind Links Satsuki under an eligible Numemon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-058", as: "numemon" }], hand: [{ card: "BT14-086", as: "satsuki" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("satsuki").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-086"));
    const satsuki = s.state.players[0]!.battleArea.find((perm) => perm.topCard?.cardId === "BT14-086")!;
    const effects = observe(s.engine).activatableEffects(satsuki) as Array<{ effectKey: string }>;
    expect(effects.length).toBeGreaterThan(0);
    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: satsuki.topCard!.instanceId, effectKey: effects[0]!.effectKey })).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-086"));
    expect(s.perm("numemon").stack.some((card) => card.cardId === "BT14-086")).toBe(true);
  });

  it("naturally plays Satsuki from this host's own stack at end of all turns", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT14-058", as: "numemon", under: ["BT14-086"] }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    const turn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Main);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-086")).toBe(true);
  });
});
