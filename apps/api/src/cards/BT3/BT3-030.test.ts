import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT3-030.js";

describe("BT3-030 Leopardmon", () => {
  it("matches official metadata and registers fully covered IR", () => {
    expect(getCardDefinition("BT3-030")).toMatchObject({
      nameEn: "Leopardmon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 6,
      effectText: expect.stringContaining("level 4 or lower digivolution card"),
    });
    expect(compiled).toEqual(getCompiledCard("BT3-030"));
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "WhenDigivolving",
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["digivolutionCards"],
            payCost: false,
            optional: true,
            target: {
              count: 1,
              filter: {
                zone: "digivolutionCards",
                controller: "mine",
                kind: ["Digimon"],
                levelComparison: { op: "lte", value: 4 },
              },
            },
          },
        ],
      },
      {
        trigger: "YourTurn",
        actions: [
          {
            kind: "GainKeyword",
            duration: "forTheTurn",
            whileMatchesTargetFilter: true,
            keyword: { keyword: "Jamming", raw: "＜Jamming＞" },
            target: {
              count: "all",
              filter: { controller: "mine", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
            },
          },
        ],
      },
    ]);
  });

  it("offers eligible cards across own digivolution stacks and plays the chosen card for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-027", as: "ally", under: [{ card: "AD1-010", as: "allyLv4" }] },
            { card: "BT1-038", as: "base", under: [{ card: "AD1-010", as: "ownLv4" }] },
            { card: "BT3-029", as: "tooHighHost", under: [{ card: "BT1-038", as: "ownLv5" }] },
          ],
          hand: [{ card: "BT3-030", as: "leopardmon" }],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("leopardmon").instanceId,
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.decisions.at(-1)!.req;
    expect(new Set(decision.options?.candidateInstanceIds)).toEqual(
      new Set([s.inst("allyLv4").instanceId, s.inst("ownLv4").instanceId]),
    );

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("ownLv4").instanceId] },
      }),
    ).toEqual({ ok: true });

    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("ownLv4").instanceId),
    );
    expect(s.state.memory).toBe(6);
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Jamming")).toBe(true);
  });

  it("allows declining the optional When Digivolving effect (Q1064)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-038", as: "base", under: [{ card: "AD1-010", as: "lv4" }] }],
          hand: [{ card: "BT3-030", as: "leopardmon" }],
        },
      },
      { autoAcceptOptional: false },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("leopardmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT3-030"));

    expect(s.perm("base").stack.some((card) => card.instanceId === s.inst("lv4").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("removes granted Jamming when its recipient digivolves above level 4 (Q1066)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-038", as: "leopardBase" },
            { card: "BT1-037", as: "recipient" },
          ],
          hand: [
            { card: "BT3-030", as: "leopardmon" },
            { card: "BT1-038", as: "level5" },
          ],
        },
      },
      { autoAcceptOptional: false },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("leopardBase").permanentId,
        instanceId: s.inst("leopardmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("recipient"), "Jamming"));
    expect(observe(s.engine).hasKeyword(s.perm("recipient"), "Jamming")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("recipient").permanentId,
        instanceId: s.inst("level5").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("recipient").topCard?.cardId === "BT1-038");
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("recipient"), "Jamming")).toBe(false);
  });
});
