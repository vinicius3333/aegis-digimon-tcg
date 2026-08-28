import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";
import { compiled } from "./BT15-086.js";

describe("BT15-086", () => {
  it("matches the catalog identity and keeps the direct module full and residual-free", () => {
    expect(getCardDefinition("BT15-086")).toMatchObject({
      nameEn: "Marvin Jackson",
      colors: ["Black"],
      kinds: ["Tamer"],
      playCost: 3,
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("plays itself from security, gains memory by trashing a Machine/Cyborg/SoC card, and Mind Links to a matching Digimon", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [{ kind: "GainMemory", amount: 1, cost: { kind: "trash" }, optional: true }],
    });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "Main", actions: [{ kind: "MindLink" }] });
  });
  it("grants inherited Jamming/Blocker and can play Marvin Jackson from its stack", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [{ kind: "Aura" }, { kind: "Aura" }],
    });
    expect(compiled.effects?.[4]).toMatchObject({
      trigger: "EndOfAllTurns",
      isInherited: true,
      actions: [{ kind: "PlayWithoutCost", fromOwnDigivolutionStack: true, payCost: false, optional: true }],
    });
  });

  it("naturally Mind Links Marvin to a matching Digimon through the public Main intent", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT15-086", as: "marvin" },
          { card: "BT14-056", as: "socHost" },
        ],
      },
    });
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.ready();
    const [effect] = observe(s.engine).activatableEffects(s.perm("marvin")) as { effectKey: string }[];

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("marvin").topCard.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("socHost").stack.some((card) => card.cardId === "BT15-086"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT15-086")).toBe(false);
    expect(s.perm("socHost").stack.map((card) => card.cardId)).toContain("BT15-086");
  });

  it("naturally grants inherited keywords and plays Marvin from the stack at turn end", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-056", as: "socHost", under: ["BT15-086"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("socHost"), "Jamming")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("socHost"), "Blocker")).toBe(true);

    await advance(s.engine).runTurn(0);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT15-086"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT15-086")).toBe(true);
    expect(s.perm("socHost").stack.some((card) => card.cardId === "BT15-086")).toBe(false);
  });

  it("naturally plays itself from security during an opponent's attack", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT15-086", as: "marvin" }] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT15-086"));

    expect(s.state.players[0]!.security).toHaveLength(0);
  });
});
