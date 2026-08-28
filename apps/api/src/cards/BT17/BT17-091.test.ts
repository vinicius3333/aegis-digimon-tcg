import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-091.js";
import "./index.js";

describe("BT17-091 Cracker Fang", () => {
  it("models Security, start-of-turn memory, Mind Link, and the Rule name", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Security",
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "StartOfYourTurn",
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Main",
      keywords: [{ keyword: "Mind Link" }],
      actions: [
        {
          kind: "MindLink",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
        },
      ],
    });
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "Rule",
      actions: [{ kind: "GrantStatic", grant: "name", tokens: ["Eiji Nagasumi"] }],
    });
  });

  it("grants Alliance and Blocker only to the inherited host with Dark Animal or SoC", () => {
    expect(compiled.effects?.[4]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "Aura",
          effect: { kind: "keyword", keyword: { keyword: "Alliance" } },
          while: { kind: "selfHasTrait" },
        },
        { kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Blocker" } }, while: { kind: "selfHasTrait" } },
      ],
    });
  });

  it("plays an Eiji Nagasumi from the digivolution cards at End of All Turns", () => {
    expect(compiled.effects?.[5]).toMatchObject({
      trigger: "EndOfAllTurns",
      isInherited: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
          target: { filter: { nameOrTrait: [{ tokens: ["Eiji Nagasumi", "Cracker Fang"], match: "name" }] } },
        },
      ],
    });
  });

  it("naturally Mind Links under a Dark Animal/SoC Digimon and grants both inherited keywords", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-069", under: ["BT17-067"], as: "host" },
            { card: "BT17-077", as: "unrelated" },
          ],
          hand: [{ card: "BT17-091", as: "crackerFang" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("crackerFang").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT17-091"));
    const crackerFang = s.state.players[0]!.battleArea.find((perm) => perm.topCard?.cardId === "BT17-091")!;
    const [effect] = observe(s.engine).activatableEffects(crackerFang) as Array<{ effectKey: string }>;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: crackerFang.topCard!.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.some((card) => card.cardId === "BT17-091"));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT17-091")).toBe(false);
    expect(s.perm("host").stack.some((card) => card.cardId === "BT17-091")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("unrelated"), "Alliance")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("unrelated"), "Blocker")).toBe(false);
  });

  it("does not Mind Link to a matching Digimon that already has a Tamer in its stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-069", under: ["BT17-067", "BT14-087"], as: "host" }],
          hand: [{ card: "BT17-091", as: "crackerFang" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("crackerFang").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT17-091"));
    const crackerFang = s.state.players[0]!.battleArea.find((perm) => perm.topCard?.cardId === "BT17-091")!;
    expect(observe(s.engine).activatableEffects(crackerFang)).toHaveLength(0);
    expect(s.perm("host").stack.some((card) => card.cardId === "BT17-091")).toBe(false);
  });

  it("naturally plays itself from the host stack at End of All Turns", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-069", under: ["BT17-067", "BT17-091"], as: "host" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);

    const turn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Main);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-091"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-091")).toBe(true);
    expect(s.perm("host").stack.some((card) => card.cardId === "BT17-091")).toBe(false);
  });

  it("naturally plays itself from Security during an opponent attack", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT17-091", as: "securityCrackerFang" }] },
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
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT17-091"));
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT17-091")).toBe(true);
  });
});
