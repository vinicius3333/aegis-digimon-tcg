import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_065 } from "./BT24-065.js";
import "../index.js";

describe("BT24-065 Diaboromon (X Antibody)", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("BT24-065")).toMatchObject({
      cardId: "BT24-065",
      nameEn: "Diaboromon (X Antibody)",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 13,
      dp: 13000,
      forms: ["Mega"],
      attributes: ["Unknown"],
      types: ["Unidentified", "X Antibody"],
      evoCosts: [{ color: "Black", level: 5, memoryCost: 5 }],
    });
  });

  it("limits the replacement play to this Digimon's digivolution cards", () => {
    const replacement = BT24_065.effects?.find((entry) => entry.trigger === "AllTurns");
    const play = (replacement?.actions?.[0] as any)?.actions?.[0];
    expect(play).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand", "digivolutionCards"],
      target: {
        source: "thisDigimon",
        filter: { nameOrTrait: [{ tokens: ["Diaboromon"], match: "nameExact" }] },
      },
    });
  });

  it("has Overclock and Blocker", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT24-065", as: "xAntibody" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("xAntibody"), "Overclock")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("xAntibody"), "Blocker")).toBe(true);
  });

  it("uses Overclock by deleting another Unidentified Digimon and attacks without suspending", async () => {
    const s = setupEngine(
      {
        0: {
          hand: ["BT1-001"],
          deck: ["BT1-001", "BT1-002"],
          battleArea: [
            { card: "BT24-065", as: "xAntibody" },
            { card: "BT17-059", as: "fodder" },
          ],
        },
        1: { hand: ["BT1-001"], deck: ["BT1-001", "BT1-002"], security: ["BT1-003"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const fodderId = s.perm("fodder").permanentId;
    await s.ready();

    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen, 500);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === fodderId)).toBe(false);
    expect(s.perm("xAntibody").isSuspended).toBe(false);
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(true);
  });

  it("uses the normal black level-5 evolution route for cost 5", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-064", as: "base" }],
        hand: [{ card: "BT24-065", as: "xAntibody" }],
      },
    });
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("xAntibody").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("xAntibody").instanceId);

    expect(s.state.memory).toBe(1);
  });

  it("digivolves from exact Diaboromon for cost 2, repeats De-Digivolve, then deletes every highest cost", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-059", as: "diaboromon" },
            { card: "BT1-009", as: "ally" },
          ],
          hand: [{ card: "BT24-065", as: "xAntibody" }],
        },
        1: {
          battleArea: [
            { card: "BT24-051", as: "peeled", under: ["BT24-050", "BT24-046"] },
            { card: "BT24-051", as: "highest" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("peeled").topCard.instanceId);
    s.state.memory = 5;
    const highestId = s.perm("highest").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("diaboromon").permanentId,
        instanceId: s.inst("xAntibody").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("diaboromon").topCard.instanceId === s.inst("xAntibody").instanceId);
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === highestId));

    expect(s.state.memory).toBe(3);
    expect(s.perm("peeled").topCard.cardId).toBe("BT24-050");
  });

  it("Q5645: simultaneous departures play only one exact Diaboromon and do not prevent leaving", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-065", as: "source" },
            { card: "BT17-059", as: "other" },
          ],
          hand: [
            { card: "BT24-065", as: "wrongX" },
            { card: "BT2-082", as: "exact1" },
            { card: "BT5-084", as: "exact2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("wrongX").instanceId, s.inst("exact1").instanceId, s.inst("exact2").instanceId);
    const sourceId = s.perm("source").permanentId;
    const otherId = s.perm("other").permanentId;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([sourceId, otherId], "byEffect");
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("exact1").instanceId),
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === sourceId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === otherId)).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("wrongX").instanceId, s.inst("exact2").instanceId]),
    );
  });

  it("Q5644: the played Diaboromon can pay Keramon's inherited leave-prevention cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-065", as: "host", under: ["BT22-053"] }],
          hand: [{ card: "BT2-082", as: "payment" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const hostId = s.perm("host").permanentId;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([hostId], "byEffect");
    await settle();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("payment").instanceId);
  });
});
