import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-031.js";

describe("BT11-031 ZeigGreymon", () => {
  it("matches the catalog and carries every complete printed contract", () => {
    expect(getCardDefinition("BT11-031")).toMatchObject({
      cardId: "BT11-031",
      nameEn: "ZeigGreymon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [
        { color: "Blue", level: 5, memoryCost: 3 },
        { color: "Red", level: 5, memoryCost: 3 },
      ],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Cyborg", "BlueFlare"],
    });
    expect(compiled).toMatchObject({
      effects: [
        { trigger: "WhenDigivolving", actions: [{ kind: "Unsuspend" }, { kind: "GainMemory", amount: 2 }] },
        {
          trigger: "OnDeletion",
          keywords: [{ keyword: "Save" }],
          actions: [{ kind: "PlaceUnder" }, { kind: "PlaceUnder" }, { kind: "PlaceUnder" }],
        },
        { trigger: "OpponentsTurn", isInherited: true, actions: [{ kind: "Aura" }] },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("publishes the exact MetalGreymon alternate route", () => {
    expect(digivolutionRequirementsFor("BT11-031")).toContainEqual({
      cost: 2,
      isAlternate: true,
      namesExact: ["MetalGreymon"],
    });
  });

  it("unsuspends and gains 2 memory with a Blue Flare source and 2 opposing Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-024", as: "base", suspended: true }],
        hand: [{ card: "BT11-031", as: "zeig" }],
        deck: ["BT1-001"],
      },
      1: { battleArea: ["BT11-023", "BT11-023"] },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("zeig").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("base").isSuspended && s.state.memory === 10);

    expect(s.perm("base").isSuspended).toBe(false);
    expect(s.state.memory).toBe(10);
  });

  it("supports both normal colors for 3 and withholds memory when either condition is absent", async () => {
    for (const [base, opponents, expectedMemory] of [
      ["BT11-028", 1, 3],
      ["BT1-022", 2, 3],
    ] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: base, as: "base", suspended: true }],
          hand: [{ card: "BT11-031", as: "zeig" }],
        },
        1: { battleArea: Array.from({ length: opponents }, () => "BT11-023") },
      });
      s.state.memory = 6;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("zeig").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => !s.perm("base").isSuspended);
      expect(s.state.memory).toBe(expectedMemory);
    }
  });

  it("saves itself under any Tamer, then places blue Greymon and MailBirdramon under a General", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-031", as: "zeig" },
            { card: "BT11-095", as: "general" },
            { card: "BT11-095", as: "otherGeneral" },
          ],
          trash: [
            { card: "BT10-019", as: "greymon" },
            { card: "BT10-021", as: "mailBirdramon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    const zeigInstanceId = s.perm("zeig").topCard!.instanceId;
    expect(await advance(s.engine).verb.deletePermanent([s.perm("zeig").permanentId], "byEffect")).toBe(1);
    await settle(() => s.perm("general").stack.length === 3);

    expect(s.perm("general").stack.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([zeigInstanceId, s.inst("greymon").instanceId, s.inst("mailBirdramon").instanceId]),
    );
    expect(s.perm("otherGeneral").stack).toHaveLength(0);
  });

  it("inherited effect grants Blocker to a Blue Flare host on the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-030", as: "host", under: ["BT11-031"] }] } });
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
  });

  it("inherited Blocker requires both the opponent's turn and a Blue Flare host", async () => {
    for (const [host, turnSeat] of [
      ["BT11-030", 0],
      ["BT11-029", 1],
    ] as const) {
      const s = setupEngine({ 0: { battleArea: [{ card: host, as: "host", under: ["BT11-031"] }] } });
      s.state.turnSeat = turnSeat;
      await advance(s.engine).recompute();
      expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(false);
    }
  });
});
