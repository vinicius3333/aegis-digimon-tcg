import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT25-010.js";
import "../index.js";

describe("BT25-010 Hawkmon", () => {
  it("matches the catalog identity and Avian TS traits", () => {
    expect(getCardDefinition("BT25-010")).toMatchObject({
      cardId: "BT25-010",
      nameEn: "Hawkmon",
      colors: ["Red", "Green"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      forms: ["Rookie"],
      attributes: ["Free"],
      types: ["Avian", "Iliad", "TS"],
    });
  });

  it("installs the your-turn evolution-cost reduction and inherited DP effect", () => {
    expect(compiled.effects).toHaveLength(2);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { isSelfRef: true, zone: "battleArea" },
          actions: [{ mode: "reduceCost", amount: 1 }],
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({ trigger: "YourTurn", isInherited: true, actions: [{ amount: 2000 }] });
  });

  it("reduces a natural eligible red Beast digivolution by 1 memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-010", as: "hawkmon" }],
          hand: [{ card: "BT11-010", as: "beast" }],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("hawkmon").permanentId,
        instanceId: s.inst("beast").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("hawkmon").topCard.cardId === "BT11-010");

    expect(s.state.memory).toBe(4);
  });

  it("reduces a natural Birdkin evolution because the printed family match is substring based", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-010", as: "hawkmon" }],
          hand: [{ card: "BT18-049", as: "birdkin" }],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("hawkmon").permanentId,
        instanceId: s.inst("birdkin").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("hawkmon").topCard.cardId === "BT18-049");
    expect(s.state.memory).toBe(2);
  });

  it("does not reduce a natural evolution into an unrelated legal trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-010", as: "hawkmon" }],
          hand: [{ card: "BT15-009", as: "nonMatching" }],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("hawkmon").permanentId,
        instanceId: s.inst("nonMatching").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("hawkmon").topCard.cardId === "BT15-009");

    expect(s.state.memory).toBe(3);
  });

  it("does not reduce a would-digivolve event while Hawkmon is in breeding", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT25-010", as: "hawkmon" },
        hand: [{ card: "BT11-010", as: "beast" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("hawkmon").permanentId,
        instanceId: s.inst("beast").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("hawkmon").topCard.cardId === "BT11-010");

    expect(s.state.memory).toBe(3);
    expect(s.perm("hawkmon").stack.map((card) => card.cardId)).toEqual(["BT25-010"]);
  });

  it("reaches Hawkmon through its legal TS level-2 evolution and exposes inherited DP", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT25-001", as: "tsEgg" }],
        hand: [{ card: "BT25-010", as: "hawkmon" }],
      },
    });
    s.state.memory = 0;
    s.state.turnSeat = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tsEgg").permanentId,
        instanceId: s.inst("hawkmon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tsEgg").topCard.cardId === "BT25-010");

    expect(s.perm("tsEgg").stack.map((card) => card.cardId)).toEqual(["BT25-001"]);

    const inherited = setupEngine({
      0: { battleArea: [{ card: "BT11-010", as: "host", under: ["BT25-010"] }] },
    });
    inherited.state.turnSeat = 0;
    await inherited.ready();
    expect(inherited.perm("host").currentDP).toBe(7000);
    inherited.state.turnSeat = 1;
    await inherited.engine.recomputeContinuousEffects();
    expect(inherited.perm("host").currentDP).toBe(5000);
  });

  it("reaches Hawkmon through the separate public Poromon alternate route", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT16-001", as: "poromon" }],
        hand: [{ card: "BT25-010", as: "hawkmon" }],
      },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("poromon").permanentId,
        instanceId: s.inst("hawkmon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("poromon").topCard.cardId === "BT25-010");

    expect(s.perm("poromon").stack.map((card) => card.cardId)).toEqual(["BT16-001"]);
    expect(s.state.memory).toBe(0);
  });
});
