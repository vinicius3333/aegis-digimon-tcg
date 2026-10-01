import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle, type PermanentSpec } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-069.js";

describe("BT9-069 Baihumon", () => {
  it("matches catalog and Q1858-Q1861 mixed-target and aggregate-count IR", () => {
    expect(getCardDefinition("BT9-069")).toMatchObject({
      cardId: "BT9-069",
      nameEn: "Baihumon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 13,
      dp: 13000,
      evoCosts: [{ color: "Black", level: 5, memoryCost: 5 }],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Holy Beast", "Four Sovereigns"],
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "WhenDigivolving",
          actions: [
            { kind: "Unsuspend", target: { filter: { kind: ["Digimon", "Tamer"] }, count: 2, upTo: true } },
            { kind: "GainMemory", amount: 1, scaling: { unit: "cards" } },
          ],
        },
        {
          trigger: "EndOfYourTurn",
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "Trash",
              target: { filter: { zone: "security", position: "top" }, count: 1 },
              scaling: { per: 2, unit: "cards" },
            },
          ],
        },
      ],
    });
  });

  it("unsuspends up to 2 permanents and gains memory for every opposing unsuspended Digimon and Tamer", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT10-022", as: "base" }], hand: [{ card: "BT9-069", as: "evolving" }] },
        1: {
          battleArea: [
            { card: "BT1-015", as: "digimon", suspended: true },
            { card: "BT8-093", as: "tamer", suspended: true },
            "BT1-016",
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("digimon").permanentId, s.perm("tamer").permanentId);
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT9-069"));
    expect(s.state.players[1]!.battleArea.every((permanent) => !permanent.isSuspended)).toBe(true);
    expect(s.state.memory).toBe(3);
  });
});

describe("BT9-069 Baihumon — KB Q&A rulings", () => {
  const digivolveIntoBaihumon = async (board: { mine: PermanentSpec[]; theirs: PermanentSpec[] }, prefer: string[]) => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-022", as: "base" }, ...board.mine],
          hand: [{ card: "BT9-069", as: "evolving" }],
        },
        1: { battleArea: board.theirs },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(...prefer.map((alias) => s.perm(alias).topCard!.instanceId));
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT9-069"));
    return s;
  };

  it("unsuspends 1 of your Digimon and 1 of your opponent's Digimon with the same effect (Q1859)", async () => {
    const s = await digivolveIntoBaihumon(
      {
        mine: [{ card: "BT1-015", as: "mine", suspended: true }],
        theirs: [
          { card: "BT1-015", as: "theirs", suspended: true },
          { card: "BT1-016", as: "untouched", suspended: true },
        ],
      },
      ["mine", "theirs"],
    );
    expect(s.perm("mine").isSuspended).toBe(false);
    expect(s.perm("theirs").isSuspended).toBe(false);
    expect(s.perm("untouched").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("unsuspends up to 2 in any combination, including 2 Tamers (Q1860)", async () => {
    const s = await digivolveIntoBaihumon(
      {
        mine: [
          { card: "BT8-093", as: "firstTamer", suspended: true },
          { card: "BT1-085", as: "secondTamer", suspended: true },
          { card: "BT1-015", as: "untouched", suspended: true },
        ],
        theirs: [],
      },
      ["firstTamer", "secondTamer"],
    );
    expect(s.perm("firstTamer").isSuspended).toBe(false);
    expect(s.perm("secondTamer").isSuspended).toBe(false);
    expect(s.perm("untouched").isSuspended).toBe(true);
  });
});
