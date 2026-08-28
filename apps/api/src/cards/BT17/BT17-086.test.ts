import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-086.js";
import "./index.js";

describe("BT17-086 Leon Alexander", () => {
  it("matches the immutable catalog identity and preserves full IR coverage", () => {
    expect(getCardDefinition("BT17-086")).toMatchObject({
      nameEn: "Leon Alexander",
      colors: ["Yellow"],
      kinds: ["Tamer"],
      playCost: 3,
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("plays from Security and gains memory when a Pulsemon-text Digimon exists", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Security",
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: { kind: "youHave", filter: { nameOrTrait: [{ tokens: ["Pulsemon"], match: "text" }] } },
        },
      ],
    });
  });

  it("Mind Links to a Pulsemon-text Digimon only when no Tamer is already in its stack", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Main",
      keywords: [{ keyword: "Mind Link" }],
      actions: [
        {
          kind: "PlaceUnder",
          target: { filter: { nameOrTrait: [{ tokens: ["Pulsemon"], match: "text" }] } },
          underFilter: { isSelfRef: true, position: "bottom", condition: { noTamerInDigivolution: true } },
        },
      ],
    });
  });

  it("grants inherited Blocker and Barrier, then can play Leon from the stack", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        { kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Blocker" } } },
        { kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Barrier" } } },
      ],
    });
    expect(compiled.effects?.[4]).toMatchObject({
      trigger: "EndOfAllTurns",
      isInherited: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
          target: { filter: { hostFilter: { isSelfRef: true } } },
        },
      ],
    });
  });

  it("naturally gains memory at the start of the main phase for a Pulsemon-text Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT17-030", as: "pulsemon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).runTurn(0);

    expect(s.state.memory).toBe(1);
  });

  it("naturally Mind Links Leon to a Pulsemon-text Digimon through the public Main intent", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT17-086", as: "leon" },
          { card: "BT17-030", as: "pulsemon" },
        ],
      },
    });
    s.state.turnSeat = 0;
    await s.ready();
    const [effect] = observe(s.engine).activatableEffects(s.perm("leon")) as { effectKey: string }[];
    const leonId = s.inst("leon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("leon").topCard.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("pulsemon").stack.some((card) => card.instanceId === leonId));

    expect(s.perm("pulsemon").stack.map((card) => card.instanceId)).toEqual([leonId]);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === leonId)).toBe(false);
  });

  it("does not Mind Link to a Pulsemon-text Digimon that already has a Tamer in its stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT17-086", as: "leon" },
          { card: "BT17-030", as: "pulsemon", under: ["BT1-087"] },
        ],
      },
    });
    s.state.turnSeat = 0;
    await s.ready();

    expect(observe(s.engine).activatableEffects(s.perm("leon"))).toHaveLength(0);
    expect(s.perm("pulsemon").stack.map((card) => card.cardId)).toEqual(["BT1-087"]);
  });

  it("naturally grants inherited Blocker and Barrier only while the top card has Pulsemon in its text", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT17-030", as: "matching", under: ["BT17-086"] },
          { card: "BT1-009", as: "nonMatching", under: ["BT17-086"] },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("matching"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("matching"), "Barrier")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("nonMatching"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("nonMatching"), "Barrier")).toBe(false);
  });

  it("naturally plays Leon from the hosting Digimon's stack at end of all turns", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-030", as: "host", under: ["BT17-086"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    await advance(s.engine).runTurn(0);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT17-086"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT17-086")).toBe(true);
    expect(s.perm("host").stack.some((card) => card.cardId === "BT17-086")).toBe(false);
  });

  it("naturally plays itself from Security during an opponent's attack", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT17-086", as: "leon" }] },
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
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT17-086"));

    expect(s.state.players[0]!.security).toHaveLength(0);
  });
});
