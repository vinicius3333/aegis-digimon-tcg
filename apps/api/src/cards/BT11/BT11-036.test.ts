import { compiledEffects, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-036.js";

describe("BT11-036 Chuumon", () => {
  it("matches the catalog and publishes both complete direct/shared contracts", () => {
    expect(getCardDefinition("BT11-036")).toMatchObject({
      cardId: "BT11-036",
      nameEn: "Chuumon",
      colors: ["Yellow", "Black"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [
        { color: "Yellow", level: 2, memoryCost: 1 },
        { color: "Black", level: 2, memoryCost: 1 },
      ],
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Beast"],
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "YourTurn",
          actions: [{ kind: "Replacement", event: "wouldDigivolve", actions: [{ mode: "reduceCost", amount: 1 }] }],
        },
        {
          trigger: "OnDeletion",
          isInherited: true,
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["trash"],
              payCost: false,
              suspended: true,
              optional: true,
              condition: { kind: "selfHasNameContaining", names: ["Sukamon", "Etemon"] },
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
    expect(compiledEffects["BT11-036"]).toEqual(compiled);
  });

  it("reduces by 1 the cost to digivolve into a Sukamon-named card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-036", as: "chuumon" }],
        hand: [{ card: "BT11-040", as: "sukamon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("chuumon").permanentId,
        instanceId: s.inst("sukamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("chuumon").topCard?.cardId === "BT11-040");

    expect(s.state.memory).toBe(4);
  });

  it("does not reduce evolution into a card without Sukamon in its name", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-036", as: "chuumon" }],
        hand: [{ card: "BT11-038", as: "angemon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("chuumon").permanentId,
        instanceId: s.inst("angemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("chuumon").topCard.cardId === "BT11-038");
    expect(s.state.memory).toBe(3);
  });

  it("inherited effect plays a Chuumon from trash suspended when a Sukamon host is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-040", as: "host", under: ["BT11-036"] }],
          trash: [{ card: "BT11-036", as: "trashChuumon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT11-036"));

    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === "BT11-036")!;
    expect(played.isSuspended).toBe(true);
  });

  it("inherited effect does not play Chuumon when a non-Sukamon/Etemon host is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-027", as: "host", under: ["BT11-036"] }],
          trash: [{ card: "BT11-036", as: "trashChuumon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("trashChuumon").instanceId);
  });

  it("recognizes an Etemon host and plays the chosen Chuumon suspended for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-041", as: "host", under: ["BT11-040", "BT11-036"] }],
          trash: [
            { card: "BT11-036", as: "chosen" },
            { card: "BT2-055", as: "nonChuumon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("chosen").instanceId),
    );

    const played = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard?.instanceId === s.inst("chosen").instanceId,
    )!;
    expect(played.isSuspended).toBe(true);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("nonChuumon").instanceId);
  });

  it("allows the inherited suspended play to be declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-040", as: "host", under: ["BT11-036"] }],
          trash: [{ card: "BT11-036", as: "candidate" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("candidate").instanceId);
  });
});
