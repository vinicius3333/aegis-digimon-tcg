import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-189.js";

describe("P-189 Dimetromon", () => {
  it("plays an optional LIBERATOR card costing 4 or less from hand or trash in Security", () => {
    expect(runtimeCompiledCard("P-189")!.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          optional: true,
          from: ["hand", "trash"],
          payCost: false,
          target: {
            count: 1,
            filter: { controller: "mine", playCostLte: 4, nameOrTrait: [{ tokens: ["LIBERATOR"], match: "trait" }] },
          },
        },
      ],
    });
  });

  it("actually plays a qualifying LIBERATOR from trash when revealed in Security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "P-189", as: "dimetromon" }, "BT1-090"],
          hand: [{ card: "BT1-001", as: "nonLiberator" }],
          trash: [{ card: "BT18-060", as: "liberator" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const liberated = s.inst("liberator").instanceId;
    await s.ready();
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === liberated));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === liberated)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === liberated)).toBe(false);
  });

  it("grants Progress and gains one memory once per turn when your opponent's security is removed", () => {
    const card = runtimeCompiledCard("P-189")!;
    expect(card.effects.flatMap((effect) => effect.keywords ?? [])).toEqual([
      { keyword: "Progress", raw: "＜Progress＞" },
    ]);
    expect(card.effects.find((effect) => effect.trigger === "YourTurn")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ event: "whenSecurityRemoved", actions: [{ kind: "GainMemory", amount: 1 }] }],
    });
  });

  it("exposes Progress on the live Dimetromon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-189", as: "dimetromon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("dimetromon"), "Progress")).toBe(true);
  });

  it("gains one memory once per turn when its host's attack removes opponent security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "host", under: [{ card: "P-189", as: "dimetromon" }] },
          { card: "BT1-009", as: "host2" },
        ],
      },
      1: { security: ["BT1-001", "BT1-001", "BT1-001"] },
    });
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.memory).toBe(1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host2").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.memory).toBe(1);
  });
});
