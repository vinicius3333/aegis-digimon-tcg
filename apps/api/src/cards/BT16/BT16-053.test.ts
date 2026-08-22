import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-053.js";
import "../index.js";

describe("BT16-053", () => {
  it("models Barrier", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Barrier" }] });
  });

  it("prevents an opposing Digimon from attacking players on play and digivolution", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "Restrict", restriction: "attackPlayers", duration: "untilOpponentTurnEnd" }],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "Restrict", restriction: "attackPlayers", duration: "untilOpponentTurnEnd" }],
    });
  });

  it("has inherited permanent DP", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }],
    });
  });

  it("restricts an opponent Digimon from attacking players on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT16-053", as: "ankylomon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ankylomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("opponent"), "attackPlayers"));

    expect(observe(s.engine).isRestricted(s.perm("opponent"), "attackPlayers")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("ankylomon"), "Barrier")).toBe(true);
  });
});
