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
});
