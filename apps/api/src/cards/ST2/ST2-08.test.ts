import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST2-08.js";

describe("ST2-08 WereGarurumon", () => {
  it("matches the inherited battle-area Security Attack contract", () => {
    const definition = getCardDefinition("ST2-08")!;
    const compiled = getCompiledCard("ST2-08")!;

    expect(definition.inheritedEffectText).toContain("Security Attack +1");
    expect(compiled.effects).toEqual([
      {
        trigger: "YourTurn",
        isInherited: true,
        actions: [
          {
            kind: "Aura",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            effect: {
              kind: "keyword",
              keyword: { keyword: "SecurityAttack", amount: 1, raw: "<Security Attack +1>" },
            },
            while: {
              kind: "opponentHas",
              filter: {
                zone: "battleArea",
                digivolutionCards: "none",
                controllerDefault: "opponent",
                kind: ["Digimon"],
              },
              raw: "your opponent has a battle-area Digimon with no digivolution cards",
            },
          },
        ],
      },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("gives its host Security Attack +1 while the opponent has a Digimon without sources", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST2-11", as: "host", under: ["ST2-08"] }] },
      1: { battleArea: ["ST1-03"] },
    });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });

  it("does not grant Security Attack +1 while every opposing Digimon has a source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST2-11", as: "host", under: ["ST2-08"] }] },
      1: { battleArea: [{ card: "ST1-03", under: ["ST1-04"] }] },
    });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(0);
  });

  it("does not count a source-less Digimon in the opponent's breeding area", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST2-11", as: "host", under: ["ST2-08"] }] },
      1: { breeding: "ST1-03" },
    });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(0);
  });
});
