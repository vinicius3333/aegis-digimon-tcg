import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import module from "./BT2-062.js";

describe("BT2-062 Infermon", () => {
  it("matches official metadata and publishes the typed self cost reducer", () => {
    expect(module.cardId).toBe("BT2-062");
    expect(getCardDefinition("BT2-062")).toMatchObject({
      nameEn: "Infermon",
      colors: ["Black"],
      level: 5,
      types: ["Unidentified"],
      effectText: expect.stringContaining("Diaboromon"),
    });
    expect(getCompiledCard("BT2-062")).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "YourTurn",
          actions: [{ kind: "Replacement", event: "wouldDigivolve", mode: "reduceCost", amount: 1 }],
        },
      ],
    });
  });

  it("reduces by 1 the cost to digivolve into Diaboromon from hand", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-062", as: "infermon" }], hand: [{ card: "BT2-082", as: "diaboromon" }] },
    });
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("infermon").permanentId,
        instanceId: s.inst("diaboromon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("infermon").topCard.cardId === "BT2-082" && s.state.memory === 7);
    expect(s.state.memory).toBe(7);
  });

  it("Q1025 does not reduce the cost from the breeding area", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT2-062", as: "infermon" }, hand: [{ card: "BT2-082", as: "diaboromon" }] },
    });
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("infermon").permanentId,
        instanceId: s.inst("diaboromon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("infermon").topCard.cardId === "BT2-082");
    expect(s.state.memory).toBe(6);
  });

  it("does not reduce the cost when digivolving into a Digimon not named Diaboromon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-062", as: "infermon" }], hand: [{ card: "BT2-065", as: "warGreymon" }] },
    });
    await s.ready();
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("infermon").permanentId,
        instanceId: s.inst("warGreymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("infermon").topCard.cardId === "BT2-065");

    expect(s.state.memory).toBe(7);
  });

  it("does not reduce the cost during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-062", as: "infermon" }], hand: [{ card: "BT2-082", as: "diaboromon" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      advance(s.engine).ledgers.modifiers.evoCostFor(s.perm("infermon"), getCardDefinition("BT2-082")),
    ).toBeUndefined();
  });
});
