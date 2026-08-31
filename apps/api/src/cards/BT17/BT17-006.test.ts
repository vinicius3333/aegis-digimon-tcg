import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-006.js";

describe("BT17-006", () => {
  it("reacts to a Tamer placed under this host and digivolves from trash", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          triggerFilter: { isSelfRef: true },
          addedDigivolutionCardFilter: { kind: ["Tamer"] },
          actions: [{ kind: "Digivolve", from: ["trash"], payCost: true, optional: true }],
        },
      ],
    });
  });

  it("Q2704: digivolves the legal host into a SoC card from trash after a Tamer placement", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-062", under: ["BT17-006"], as: "host" }],
          hand: [{ card: "BT1-085", as: "tamer" }],
          trash: [{ card: "BT17-065", as: "socTarget" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("tamer").instanceId]);
    await settle(() => s.perm("host").topCard?.cardId === "BT17-065");

    expect(s.perm("host").topCard?.cardId).toBe("BT17-065");
    expect(s.perm("host").stack.map((card) => card.cardId)).toContain("BT17-062");
    expect(s.perm("host").stack.map((card) => card.cardId)).toContain("BT17-006");
    expect(s.perm("host").stack.map((card) => card.cardId)).toContain("BT1-085");
    expect(s.state.memory).toBe(0);
  });

  it("does not react when a Digimon, rather than a Tamer, is placed under the host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-062", under: ["BT17-006"], as: "host" }],
        hand: [{ card: "BT1-010", as: "digimon" }],
        trash: [{ card: "BT17-065", as: "socTarget" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("digimon").instanceId]);

    expect(s.perm("host").topCard?.cardId).toBe("BT17-062");
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT17-065")).toBe(true);
    expect(s.state.memory).toBe(3);
  });

  it("does not react when a Tamer is placed under a different host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT17-062", under: ["BT17-006"], as: "host" },
          { card: "BT17-062", as: "otherHost" },
        ],
        hand: [{ card: "BT1-085", as: "tamer" }],
        trash: [{ card: "BT17-065", as: "socTarget" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).verb.placeUnder(s.perm("otherHost").permanentId, [s.inst("tamer").instanceId]);

    expect(s.perm("host").topCard?.cardId).toBe("BT17-062");
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT17-065")).toBe(true);
    expect(s.state.memory).toBe(3);
  });
});
