import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_080 } from "./BT24-080.js";
import "../index.js";

describe("BT24-080 Megidramon", () => {
  it("digivolves into this trash card from Dark Dragon/Evil Dragon and keeps lowest-level deletion", () => {
    const trash = BT24_080.effects?.find((entry) => entry.trigger === "EndOfYourTurn");
    expect(trash).toMatchObject({ isFromTrash: true });
    expect(trash?.actions?.[0]).toMatchObject({
      kind: "Digivolve",
      into: { controller: "mine", zone: "trash", isSelfRef: true, kind: ["Digimon"] },
      from: ["trash"],
      condition: { kind: "zoneCount", zone: "hand", op: "lte", value: 4 },
    });
    for (const trigger of ["OnPlay", "WhenDigivolving", "OnDeletion"]) {
      expect(BT24_080.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { superlative: "lowestLevel" }, count: "all" },
      });
    }
  });

  it("digivolves a legal Dark Dragon into this trash card for free at four cards in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-076", as: "darkDragon" }],
          hand: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
          deck: ["BT1-005"],
          trash: [{ card: "BT24-080", as: "megidramon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.EndOfYourTurn, s.inst("megidramon"));
    await settle(() => s.perm("darkDragon").topCard.instanceId === s.inst("megidramon").instanceId);

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand).toHaveLength(5);
  });

  it("Q5661: public end of turn activates the trash effect, draws, gains Blocker, and deletes the lowest level", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-076", as: "darkDragon" }],
          hand: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
          deck: ["BT1-005"],
          trash: [{ card: "BT24-080", as: "megidramon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowA" },
            { card: "BT1-010", as: "lowB" },
            { card: "BT1-014", as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const lowAId = s.perm("lowA").permanentId;
    const lowBId = s.perm("lowB").permanentId;
    await s.ready();

    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;

    expect(s.perm("darkDragon").topCard.instanceId).toBe(s.inst("megidramon").instanceId);
    expect(s.state.players[0]!.hand).toHaveLength(5);
    expect(observe(s.engine).hasKeyword(s.perm("darkDragon"), "Blocker")).toBe(true);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(lowAId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(lowBId);
  });

  it("public play pays 13 and deletes all opposing lowest-level Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT24-080", as: "megidramon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowA" },
            { card: "BT1-010", as: "lowB" },
            { card: "BT1-014", as: "high" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const lowAId = s.perm("lowA").permanentId;
    const lowBId = s.perm("lowB").permanentId;
    s.state.memory = 14;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("megidramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowBId));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(lowAId);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("public evolution pays 5 and resolves the lowest-level deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-076", as: "base" }],
          hand: [{ card: "BT24-080", as: "megidramon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "lowest" }] },
      },
      { autoSelectCards: true },
    );
    const lowestId = s.perm("lowest").permanentId;
    s.state.memory = 7;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("megidramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowestId));

    expect(s.state.memory).toBe(2);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("megidramon").instanceId);
  });

  it("public deletion resolves the On Deletion lowest-level wipe", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-080", as: "megidramon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowA" },
            { card: "BT1-010", as: "lowB" },
            { card: "BT1-014", as: "high" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const lowAId = s.perm("lowA").permanentId;
    const lowBId = s.perm("lowB").permanentId;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("megidramon").permanentId], "byEffect");
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowBId));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(lowAId);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("does not ignore evolution requirements for an ineligible level 4 Dark Dragon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-070", as: "darkDragon" }],
          hand: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
          trash: [{ card: "BT24-080", as: "megidramon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.EndOfYourTurn, s.inst("megidramon"));

    expect(s.perm("darkDragon").topCard.cardId).toBe("BT24-070");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("megidramon").instanceId);
  });

  it("rechecks the hand gate before resolving a second trash copy after the bonus draw (Q5662)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-076", as: "firstHost" },
            { card: "BT24-076", as: "secondHost" },
          ],
          hand: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
          deck: ["BT1-005", "BT1-006"],
          trash: [
            { card: "BT24-080", as: "firstMegidramon" },
            { card: "BT24-080", as: "secondMegidramon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("firstHost").topCard.instanceId, s.perm("secondHost").topCard.instanceId);
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.EndOfYourTurn, s.inst("firstMegidramon"));
    await settle(() => s.perm("firstHost").topCard.instanceId === s.inst("firstMegidramon").instanceId);
    await advance(s.engine).fireForInstance(EffectTiming.EndOfYourTurn, s.inst("secondMegidramon"));

    expect(s.perm("secondHost").topCard.cardId).toBe("BT24-076");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("secondMegidramon").instanceId);
  });

  it.each([EffectTiming.OnPlay, EffectTiming.WhenDigivolving, EffectTiming.OnDeletion])(
    "deletes all opposing Digimon tied for lowest level on %s",
    async (timing) => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "BT24-080", as: "megidramon" }] },
          1: {
            battleArea: [
              { card: "BT1-009", as: "lowA" },
              { card: "BT1-010", as: "lowB" },
              { card: "BT1-014", as: "high" },
            ],
          },
        },
        { autoSelectCards: true },
      );
      const lowAId = s.perm("lowA").permanentId;
      const lowBId = s.perm("lowB").permanentId;
      await s.ready();

      await advance(s.engine).fire(timing, s.perm("megidramon"));

      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(lowAId);
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(lowBId);
      expect(s.state.players[1]!.battleArea).toHaveLength(1);
    },
  );

  it("has Blocker", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT24-080", as: "megidramon" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("megidramon"), "Blocker")).toBe(true);
  });
});
