import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-059.js";
import "../index.js";

describe("BT21-059 Timemon", () => {
  it("preserves Blocker, App Fusion, and Appmon Link requirements", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] }),
    );
    expect(compiled.appFusionRequirement).toEqual([{ names: ["Watchmon", "Savemon", "Calendamon"], cost: 0 }]);
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 2 }]);
  });

  it("de-digivolves one opponent Digimon once per turn when linked", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn");

    expect(effect).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn" });
    expect(effect?.actions).toEqual([
      {
        kind: "SubTrigger",
        event: "whenLinked",
        sourceFilter: { isSelfRef: true },
        actions: [
          {
            kind: "DeDigivolve",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            amount: 1,
          },
        ],
      },
    ]);
    expect(compiled.appFusionRequirement).toEqual([{ names: ["Watchmon", "Savemon", "Calendamon"], cost: 0 }]);
  });

  it("de-digivolves one opposing Digimon when this linked card links", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "WhenLinking",
        isLinked: true,
        actions: [
          {
            kind: "DeDigivolve",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            amount: 1,
          },
        ],
      }),
    );
  });

  it("links for 2, grants 3000 DP, and resolves its linked De-Digivolve", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host" }],
          hand: [{ card: "BT21-059", as: "timemon" }],
        },
        1: { battleArea: [{ card: "BT21-045", as: "opponent", under: ["BT21-042", "BT21-044"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const baseDp = s.perm("host").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("timemon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponent").topCard.cardId === "BT21-044");

    expect(s.state.memory).toBe(1);
    expect(s.perm("host").currentDP).toBe(baseDp + 3000);
  });

  it("de-digivolves once when Timemon itself receives a real link card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-059", as: "timemon" }],
          hand: [{ card: "BT21-053", as: "watchmon" }],
        },
        1: { battleArea: [{ card: "BT21-045", as: "opponent", under: ["BT21-042", "BT21-044"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("watchmon").instanceId,
        targetPermanentId: s.perm("timemon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponent").topCard.cardId === "BT21-044");

    expect(s.state.memory).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("timemon"), "Blocker")).toBe(true);
  });
});
