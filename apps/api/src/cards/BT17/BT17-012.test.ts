import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-012.js";

describe("BT17-012", () => {
  it("can digivolve onto a red Tamer as level 3 and has Raid", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", actions: [{ kind: "Digivolve", asLevel: 3 }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Raid" }] });
  });

  it("may digivolve while attacking into a Hybrid for 1 less", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [{ kind: "Digivolve", from: ["hand"], reduceCost: 1, optional: true }],
    });
  });

  it("has inherited permanent DP", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }],
    });
  });

  it("applies inherited DP only during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT17-013", as: "host", under: ["BT17-012"] }] } });
    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(7000);
    s.state.turnSeat = 0;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(9000);
  });

  it("digivolves from an attack into a legal Hybrid for one less memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-012", as: "burning" }],
          hand: [{ card: "BT17-014", as: "aldamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const burningPermanentId = s.perm("burning").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: burningPermanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.permanentId === burningPermanentId && permanent.topCard?.cardId === "BT17-014",
        ),
    );

    expect(s.state.memory).toBe(2);
    expect(s.perm("burning").stack.map(({ cardId }) => cardId)).toContain("BT17-012");
  });

  it("publishes Raid through the shared keyword runtime", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT17-012", as: "burning" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("burning"), "Raid")).toBe(true);
  });
});
