import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
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
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-009", as: "host" },
            { card: "BT21-045", as: "ownOther", under: ["BT21-042"] },
          ],
          hand: [{ card: "BT21-059", as: "timemon" }],
        },
        1: {
          battleArea: [
            { card: "BT21-045", as: "opponent", under: ["BT21-042", "BT21-044"] },
            { card: "BT21-045", as: "otherOpponent", under: ["BT21-042"] },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("opponent").topCard.instanceId);
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
    expect(s.perm("opponent").topCard.cardId).toBe("BT21-044");
    expect(s.perm("opponent").stack.map((card) => card.cardId)).toEqual(["BT21-042"]);
    expect(s.perm("otherOpponent").topCard.cardId).toBe("BT21-045");
    expect(s.perm("ownOther").topCard.cardId).toBe("BT21-045");
  });

  it("refuses the paid link requirement for a non-Appmon card without spending memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-009", as: "host" }],
        hand: [{ card: "BT1-009", as: "nonAppmon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("nonAppmon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("nonAppmon").instanceId)).toBe(true);
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

  it("does not repeat Timemon's Your Turn linked trigger on a second public link", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-059", as: "timemon" }],
          hand: [
            { card: "BT21-053", as: "watchmon" },
            { card: "BT21-041", as: "calendamon" },
          ],
        },
        1: { battleArea: [{ card: "BT21-045", as: "opponent", under: ["BT21-042", "BT21-044"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("watchmon").instanceId,
        targetPermanentId: s.perm("timemon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponent").topCard.cardId === "BT21-044");
    expect(s.state.memory).toBe(4);

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("calendamon").instanceId,
        targetPermanentId: s.perm("timemon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("timemon").linked.some((card) => card.cardId === "BT21-041"));
    expect(s.perm("opponent").topCard.cardId).toBe("BT21-044");
    expect(s.state.memory).toBe(3);
  });

  it("App Fuses the two available distinct recipe names through the production verb", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-053", as: "watchmon", linked: [{ card: "BT21-041", as: "calendamon" }] }],
          hand: [{ card: "BT21-059", as: "timemon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();

    const fused = await advance(s.engine).verb.appFuseInto(
      s.perm("watchmon").permanentId,
      s.inst("timemon").instanceId,
    );
    expect(fused?.topCard.cardId).toBe("BT21-059");
    await settle(() => s.perm("watchmon").topCard.cardId === "BT21-059");
    expect(s.perm("watchmon").topCard.cardId).toBe("BT21-059");
  });
});
