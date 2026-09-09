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

  it("Q2704/Q2705: digivolves the legal host into a SoC card from trash after an effect places a Tamer", async () => {
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

  it("Q2705: does not offer a SoC card whose digivolution requirement the host cannot meet", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-062", under: ["BT17-006"], as: "host" }],
          hand: [{ card: "BT1-085", as: "tamer" }],
          // Lv5 SoC: legal only from a Lv4 host, so the Lv3 host has no legal route.
          trash: [{ card: "BT17-067", as: "tooHigh" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("tamer").instanceId]);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("host").topCard?.cardId).toBe("BT17-062");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT17-067");
    expect(s.state.memory).toBe(5);
  });

  it("picks the SoC card over an otherwise legal non-SoC card of the same level in the same trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-062", under: ["BT17-006"], as: "host" }],
          hand: [{ card: "BT1-085", as: "tamer" }],
          // Bakemon is Lv4 Purple from a Lv3 Purple host for 2 — a legal route, but no [SoC].
          trash: [
            { card: "BT4-080", as: "nonSoC" },
            { card: "BT17-065", as: "socTarget" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("tamer").instanceId]);
    await settle(() => s.perm("host").topCard?.cardId === "BT17-065");

    expect(s.perm("host").topCard?.instanceId).toBe(s.inst("socTarget").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT4-080"]);
    expect(s.state.memory).toBe(2);
  });

  it("[Your Turn]: stays silent when the Tamer is placed during the opponent's turn", async () => {
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
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("tamer").instanceId]);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("host").topCard?.cardId).toBe("BT17-062");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT17-065");
  });

  it("[Once Per Turn]: refuses a second placement this turn and resets on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-062", under: ["BT17-006"], as: "host" }],
          hand: [
            { card: "BT1-085", as: "tamerA" },
            { card: "BT1-085", as: "tamerB" },
            { card: "BT1-085", as: "tamerC" },
          ],
          trash: [
            { card: "BT17-065", as: "socLv4" },
            { card: "BT17-067", as: "socLv5" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: { deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("tamerA").instanceId]);
    await settle(() => s.perm("host").topCard?.cardId === "BT17-065");
    expect(s.state.memory).toBe(0);

    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("tamerB").instanceId]);
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("host").topCard?.cardId).toBe("BT17-065");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT17-067");

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);

    s.state.turnSeat = 0;
    s.state.memory = 4;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("tamerC").instanceId]);
    await settle(() => s.perm("host").topCard?.cardId === "BT17-067");
    expect(s.perm("host").topCard?.instanceId).toBe(s.inst("socLv5").instanceId);
    // Placed Tamers sit directly beneath the top card; the two digivolution sources
    // and the original egg remain in printed order at the bottom of the stack.
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual([
      "BT1-085",
      "BT1-085",
      "BT1-085",
      "BT17-006",
      "BT17-062",
      "BT17-065",
    ]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });
});
