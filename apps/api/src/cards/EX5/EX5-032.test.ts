import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-032.js";
import "../index.js";

describe("EX5-032 LoaderLeomon", () => {
  it("has Fortitude and reduces opposing Digimon by 3000 on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toMatchObject([
      { keyword: "Fortitude" },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "ModifyDP",
      amount: -3000,
      duration: "untilOpponentTurnEnd",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "ModifyDP",
      amount: -3000,
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
  });
  it("inherits Blocker while it has Leomon in its name on the opponent's turn", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true } },
          effect: { kind: "keyword", keyword: { keyword: "Blocker" } },
          while: { kind: "selfHasNameContaining", names: ["Leomon"] },
        },
      ],
    });
  });

  it("reduces an opposing Digimon by 3000 when played", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX5-032", as: "loaderLeomon" }] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 5000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("loaderLeomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 2000);

    expect(s.perm("target").currentDP).toBe(2000);
  });

  it("reduces an opposing Digimon by 3000 when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX5-030", as: "base" }], hand: [{ card: "EX5-032", as: "loaderLeomon" }] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 5000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("loaderLeomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 2000);

    expect(s.perm("target").currentDP).toBe(2000);
  });

  it("grants inherited Blocker only to a Leomon-name host on the opponent's turn", async () => {
    const matching = setupEngine({ 0: { battleArea: [{ card: "EX5-049", as: "matching", under: ["EX5-032"] }] } });
    matching.state.turnSeat = 1;
    await matching.ready();
    expect(observe(matching.engine).hasKeyword(matching.perm("matching"), "Blocker")).toBe(true);

    const nonMatching = setupEngine({
      0: { battleArea: [{ card: "BT1-036", as: "nonMatching", under: ["EX5-032"] }] },
    });
    nonMatching.state.turnSeat = 1;
    await nonMatching.ready();
    expect(observe(nonMatching.engine).hasKeyword(nonMatching.perm("nonMatching"), "Blocker")).toBe(false);
  });
});
