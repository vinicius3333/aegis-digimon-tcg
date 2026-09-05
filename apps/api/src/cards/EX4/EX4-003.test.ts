import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-003.js";
import "../index.js";

describe("EX4-003 Tsunomon", () => {
  it("draws once per turn when another one of your Digimon digivolves", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenOneOfYoursDigivolves",
      sourceFilter: { controllerDefault: "mine", excludeSelf: true, kind: ["Digimon"] },
      actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
    });
  });

  it("draws when a different own Digimon digivolves", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-010", "BT1-011"],
        battleArea: [
          { card: "BT1-009", as: "host", under: ["EX4-003"] },
          { card: "BT1-009", as: "otherBase" },
        ],
        hand: [{ card: "AD1-001", as: "evolving" }],
      },
    });
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.None, s.perm("host"));
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("otherBase").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("does not draw when only the host carrying Tsunomon digivolves", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-010", "BT1-011"],
        battleArea: [{ card: "BT1-009", as: "host", under: ["EX4-003"] }],
        hand: [{ card: "AD1-001", as: "evolving" }],
      },
    });
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.None, s.perm("host"));
    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("host").permanentId,
      instanceId: s.inst("evolving").instanceId,
    });
    expect(result).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "AD1-001");
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("draws only once when multiple other Digimon digivolve in the same turn", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        battleArea: [
          { card: "BT1-009", as: "host", under: ["EX4-003"] },
          { card: "BT1-009", as: "firstBase" },
          { card: "BT1-009", as: "secondBase" },
        ],
        hand: [
          { card: "AD1-001", as: "firstEvolution" },
          { card: "AD1-001", as: "secondEvolution" },
        ],
      },
    });
    s.state.turnSeat = 0;
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("firstBase").permanentId,
        instanceId: s.inst("firstEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("firstBase").topCard?.cardId === "AD1-001");

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("secondBase").permanentId,
        instanceId: s.inst("secondEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("secondBase").topCard?.cardId === "AD1-001");

    expect(s.state.players[0]!.hand).toHaveLength(3);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
