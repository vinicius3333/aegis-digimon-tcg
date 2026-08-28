import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-063.js";
import "../index.js";

describe("BT16-063", () => {
  it("grants Angel and models Partition", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Partition" }],
      actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Angel"] }],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Partition" }],
    });
  });

  it("gains immunity and places an opposing low-level security Digimon into security during DNA digivolution", () => {
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "GrantStatic",
      grant: "immuneToOpponentDigimonEffects",
      duration: "untilOpponentTurnEnd",
    });
    expect(compiled.effects?.[1]?.actions?.[1]).toMatchObject({
      kind: "SecurityManipulation",
      op: "placeAsSecurity",
      from: ["battleArea"],
      toTop: false,
      condition: { kind: "isDnaDigivolving" },
      source: { filter: { zone: "battleArea" } },
    });
  });

  it("naturally DNA digivolves and places a level-3 opponent into security using either security count", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-061", as: "blackMaterial" },
            { card: "BT10-035", as: "yellowMaterial" },
          ],
          hand: [{ card: "BT16-063", as: "shakkou" }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [
          s.perm("blackMaterial").permanentId,
          s.perm("yellowMaterial").permanentId,
        ],
        instanceId: s.inst("shakkou").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-063"));

    const shakkou = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT16-063");
    expect(shakkou?.isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.security[0]?.cardId).toBe("BT1-009");
  });
});
