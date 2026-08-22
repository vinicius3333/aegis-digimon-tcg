import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "./ST19-07.js";
import "./ST19-10.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";

describe("ST19-07 Tobucatmon", () => {
  it("has Jamming and inherited Barrier in the catalog", () => {
    expect(getCardDefinition("ST19-07")).toMatchObject({
      effectText: "＜Jamming＞.",
      inheritedEffectText: "＜Barrier＞.",
    });
  });

  it("installs both keyword behaviors on the real battle-area permanent", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST19-07", as: "tobu" },
          { card: "ST19-10", as: "host", under: ["ST19-07"] },
        ],
      },
      1: { battleArea: [] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("tobu"), "Jamming")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(true);
  });

  it("survives a stronger Security Digimon battle through Jamming", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST19-07", as: "tobu" }] },
      1: { security: ["BT1-081"] },
    });
    await s.ready();
    const tobucatmonId = s.perm("tobu").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: tobucatmonId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === tobucatmonId)).toBe(true);
  });
});
