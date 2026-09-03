import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-091.js";
import "../index.js";

describe("BT16-091", () => {
  it("plays Aquilamon or Gatomon and DNA digivolves in the main phase", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Main" });
    expect(compiled.effects?.[0]?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
    });
    expect(compiled.effects?.[0]?.actions?.[1]).toMatchObject({
      kind: "DnaDigivolve",
      payCost: true,
      optional: true,
      bindResultAs: "bt16091DnaResult",
    });
  });

  it("grants Security Attack +1 and attacks with the DNA result", () => {
    expect(compiled.effects?.[0]?.actions?.[2]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "SecurityAttack", amount: 1 },
      duration: "forTheTurn",
      optional: true,
    });
    expect(compiled.effects?.[0]?.actions?.[3]).toMatchObject({
      kind: "Attack",
      attackPlayer: true,
      condition: { kind: "ifThisEffectActed" },
    });
  });

  it("plays Hawkmon or Salamon from hand/trash and returns itself from security", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false, optional: true },
        { kind: "AddToHandSelf" },
      ],
    });
  });

  it("DNA digivolves two existing Digimon and performs the paired attack choice", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-070", as: "purpleMaterial" },
            { card: "BT8-010", as: "redMaterial" },
            { card: "BT1-087", as: "yellowSource" },
          ],
          hand: [
            { card: "BT16-091", as: "option" },
            { card: "BT16-077", as: "result" },
          ],
        },
        1: { security: [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-077") &&
        s.events.some((event) => event.kind === "attackDeclared"),
    );

    const result = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT16-077");
    expect(result).toBeDefined();
    expect(observe(s.engine).keywordAmount(result!, "SecurityAttack")).toBe(1);
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });
});
