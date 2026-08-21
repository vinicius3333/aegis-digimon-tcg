import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX4-020.js";
import "../index.js";

describe("EX4-020 MetalGreymon", () => {
  it("gains Rush and trashes up to two opposing Digimon while DigiXrosing", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([{ kind: "GainKeyword", keyword: { keyword: "Rush" } }, { kind: "TrashDigivolution", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 }, amount: 2, fromTop: false, condition: { kind: "digiXrosCount", minimum: 1 } }]);
  });
  it("restricts an opposing low-stack Digimon from attacking until opponent turn end", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({ isInherited: true, actions: [{ kind: "Restrict", restriction: "attack", duration: "untilOpponentTurnEnd", target: { filter: { controller: "opponent", kind: ["Digimon"], digivolutionCardsAtMost: 3 } } }] });
  });

  it("grants Rush and trashes two sources from one opposing Digimon while DigiXrosing", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX4-020", as: "host", under: ["BT4-009"] }] }, 1: { battleArea: [{ card: "BT4-009", as: "target", under: ["BT1-009", "BT1-010", "BT1-011"] }] } }, { autoSelectCards: true });
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("host"), { digiXrosMaterialCount: 1 });
    await settle(() => s.perm("target").stack.length === 1);

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Rush")).toBe(true);
    expect(s.perm("target").stack).toHaveLength(1);
  });
});
