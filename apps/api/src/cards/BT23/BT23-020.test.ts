import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-020.js";

describe("BT23-020 Seadramon", () => {
  it("declares Alliance", () => {
    expect(getCardDefinition("BT23-020")).toMatchObject({
      cardId: "BT23-020",
      nameEn: "Seadramon",
      colors: ["Blue", "Purple"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [
        { color: "Blue", level: 3, memoryCost: 3 },
        { color: "Purple", level: 3, memoryCost: 3 },
      ],
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Aquatic", "Hudie", "CS"],
    });
    const staticEffect = compiled.effects.find((entry) => entry.trigger === "Static") as any;
    expect(staticEffect.keywords).toEqual([{ keyword: "Alliance", raw: "＜Alliance＞" }]);
  });

  it("once per turn draws only when this Digimon suspends", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      sourceFilter: { isSelfRef: true },
      actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
    });
  });

  it("draws once when Seadramon suspends and ignores another Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT23-020", as: "seadramon" },
          { card: "BT23-017", as: "other" },
        ],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSuspended", { subjectPermanentId: s.perm("other").permanentId });
    expect(s.state.players[0]!.hand).toHaveLength(0);
    await advance(s.engine).fireSubTrigger("whenSuspended", { subjectPermanentId: s.perm("seadramon").permanentId });
    expect(s.state.players[0]!.hand).toHaveLength(1);
    await advance(s.engine).fireSubTrigger("whenSuspended", { subjectPermanentId: s.perm("seadramon").permanentId });
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("exposes Alliance on Seadramon itself but not when it is only a source", async () => {
    const main = setupEngine({ 0: { battleArea: [{ card: "BT23-020", as: "seadramon" }] } });
    await main.ready();
    expect(observe(main.engine).hasKeyword(main.perm("seadramon"), "Alliance")).toBe(true);

    const inherited = setupEngine({ 0: { battleArea: [{ card: "BT23-035", as: "host", under: ["BT23-020"] }] } });
    await inherited.ready();
    expect(observe(inherited.engine).hasKeyword(inherited.perm("host"), "Alliance")).toBe(false);
  });
});
