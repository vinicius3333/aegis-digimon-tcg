import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT15-087.js";

describe("BT15-087", () => {
  it("matches the catalog identity and keeps the direct module full and residual-free", () => {
    expect(getCardDefinition("BT15-087")).toMatchObject({
      nameEn: "Shuu Yulin",
      colors: ["Black"],
      kinds: ["Tamer"],
      playCost: 4,
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("uses compiled IR for its security, memory, and Mind Link clauses", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Security", isSecurity: true });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "StartOfYourTurn", actions: [{ kind: "SetMemory", value: 3 }] });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "Main", actions: [{ kind: "MindLink" }] });
  });
  it("gives qualifying inherited hosts Alliance and Reboot, then can play Shuu Yulin", () => {
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "AllTurns", isInherited: true, actions: [{ kind: "Aura" }, { kind: "Aura" }] });
    expect(compiled.effects?.[3]?.actions[0]?.effect).toMatchObject({
      kind: "keyword",
      keyword: { keyword: "Alliance" },
    });
    expect(compiled.effects?.[4]).toMatchObject({ trigger: "EndOfAllTurns", isInherited: true, actions: [{ kind: "PlayWithoutCost", fromOwnDigivolutionStack: true, payCost: false }] });
  });

  it("naturally Mind Links Shuu to a matching Digimon through the public Main intent", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT15-087", as: "shuu" },
          { card: "BT14-056", as: "policeHost" },
        ],
      },
    });
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.ready();
    const [effect] = observe(s.engine).activatableEffects(s.perm("shuu")) as { effectKey: string }[];

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("shuu").topCard.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("policeHost").stack.some((card) => card.cardId === "BT15-087"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT15-087")).toBe(false);
    expect(s.perm("policeHost").stack.map((card) => card.cardId)).toContain("BT15-087");
  });

  it("naturally grants Alliance/Reboot and plays Shuu from the stack at turn end", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-056", as: "policeHost", under: ["BT15-087"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("policeHost"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("policeHost"), "Reboot")).toBe(true);

    await advance(s.engine).runTurn(0);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT15-087"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT15-087")).toBe(true);
    expect(s.perm("policeHost").stack.some((card) => card.cardId === "BT15-087")).toBe(false);
  });

  it("naturally plays itself from security during an opponent's attack", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT15-087", as: "shuu" }] },
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
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT15-087"));

    expect(s.state.players[0]!.security).toHaveLength(0);
  });
});
