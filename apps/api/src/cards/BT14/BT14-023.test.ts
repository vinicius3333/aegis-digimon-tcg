import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-023.js";

describe("BT14-023", () => {
  it("trashes two opposing sources on digivolution", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "TrashDigivolution", amount: 2 }));
  it("restricts an opposing Digimon with no more sources than this one from attacking", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking" && !entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Restrict", restriction: "attack", duration: "untilOpponentTurnEnd", target: { filter: { digivolutionCardsCompareToSource: "lte" } } }] }));
  it("inherits the same once-per-turn attack restriction", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Restrict", restriction: "attack" }] }));

  it("trashes two opposing sources when digivolving", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT14-020", as: "base" }], hand: [{ card: "BT14-023", as: "ikkakumon" }] },
      1: { battleArea: [{ card: "BT1-015", as: "target", under: ["BT1-001", "BT1-002"] }] },
    }, { autoSelectCards: true });
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("ikkakumon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.length >= 2);
    expect(s.state.players[1]!.trash.filter((card) => ["BT1-001", "BT1-002"].includes(card.cardId))).toHaveLength(2);
  });
});
