import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-017.js";

describe("BT11-017 Marsmon", () => {
  it("matches the catalog and carries every complete printed contract", () => {
    expect(getCardDefinition("BT11-017")).toMatchObject({
      cardId: "BT11-017",
      nameEn: "Marsmon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [{ color: "Red", level: 5, memoryCost: 4 }],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Shaman", "Olympos XII"],
    });
    expect(compiled).toMatchObject({
      effects: [
        { trigger: "Static", keywords: [{ keyword: "Raid" }] },
        { trigger: "WhenDigivolving", keywords: [{ keyword: "Blitz" }] },
        {
          trigger: "YourTurn",
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenAttackTargetSwitched",
              actions: [{ kind: "Unsuspend" }, { kind: "GainMemory", amount: 1, scaling: { unit: "cards" } }],
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("evolves for 4 and has Raid plus When Digivolving Blitz", async () => {
    const evolution = setupEngine({
      0: { battleArea: [{ card: "BT11-015", as: "base" }], hand: [{ card: "BT11-017", as: "mars" }] },
    });
    evolution.state.memory = 6;
    expect(
      evolution.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: evolution.perm("base").permanentId,
        instanceId: evolution.inst("mars").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => evolution.perm("base").topCard.cardId === "BT11-017");
    expect(evolution.state.memory).toBe(2);

    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-017", as: "marsmon" }] } });

    await advance(s.engine).recompute();
    expect(observe(s.engine).hasKeyword(s.perm("marsmon"), "Raid")).toBe(true);

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("marsmon"));
    expect(observe(s.engine).hasKeyword(s.perm("marsmon"), "Blitz")).toBe(true);
  });

  it("Q2062: unsuspends and gains memory once when an attack target switches", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-017", as: "marsmon", suspended: true }, "BT1-085", "BT12-092"],
      },
    });
    s.state.memory = 0;

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("marsmon").permanentId,
    });
    expect(s.perm("marsmon").isSuspended).toBe(false);
    expect(s.state.memory).toBe(2);

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("marsmon").permanentId,
    });
    expect(s.state.memory).toBe(2);
  });

  it("also reacts to another friendly Digimon's switch, but not on the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT11-017", as: "marsmon", suspended: true },
          { card: "BT11-010", as: "attacker" },
          { card: "BT1-085", as: "tamer" },
        ],
      },
    });
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    expect(s.perm("marsmon").isSuspended).toBe(false);
    expect(s.state.memory).toBe(1);

    const opponentTurn = setupEngine({
      0: { battleArea: [{ card: "BT11-017", as: "marsmon", suspended: true }, "BT1-085"] },
    });
    opponentTurn.state.turnSeat = 1;
    await advance(opponentTurn.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: opponentTurn.perm("marsmon").permanentId,
    });
    expect(opponentTurn.perm("marsmon").isSuspended).toBe(true);
    expect(opponentTurn.state.memory).toBe(0);
  });
});
