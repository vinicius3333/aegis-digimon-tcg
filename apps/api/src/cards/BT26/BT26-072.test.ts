import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-072.js";
import "../index.js";

describe("BT26-072 Peckmon", () => {
  it("models both printed alternate costs", () => {
    expect(getCardDefinition("BT26-072")).toMatchObject({
      nameEn: "Peckmon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 5000,
      types: ["Avian", "DATA SQUAD"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, traits: ["DATA SQUAD"], cost: 2, isAlternate: true },
    ]);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] }),
    );
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          optional: true,
          abortOnDecline: true,
          options: [
            [expect.objectContaining({ kind: "Delete", cost: expect.objectContaining({ kind: "trash" }) })],
            [
              expect.objectContaining({
                kind: "Delete",
                cost: expect.objectContaining({
                  kind: "place",
                  faceDown: true,
                  position: "bottom",
                  underFilter: expect.objectContaining({ nameOrTrait: [{ tokens: ["Keenan Crier"], match: "name" }] }),
                }),
              }),
            ],
          ],
        },
      ],
    });
    expect(compiled.effects.some((effect) => effect.trigger === "WhenDigivolving")).toBe(true);
  });

  it("uses the cost-2 DATA SQUAD evolution path from a green level 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-036", as: "greenDataSquadBase" }],
        hand: [{ card: "BT26-072", as: "peckmon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("greenDataSquadBase").permanentId,
        instanceId: s.inst("peckmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("greenDataSquadBase").topCard.cardId === "BT26-072");

    expect(s.state.memory).toBe(0);
  });

  it("publicly pays the hand-trash alternative to delete an opponent's level 4 or lower Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-072", as: "peckmon" }], hand: [{ card: "BT1-001", as: "cost" }] },
        1: {
          battleArea: [
            { card: "BT1-014", as: "victim" },
            { card: "BT26-060", as: "level5OrHigher" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("peckmon"));

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("level5OrHigher").permanentId,
    ]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-001");
  });

  it("publicly pays the hand-trash alternative when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-036", as: "base" }],
          hand: [{ card: "BT26-072", as: "peckmon" }, { card: "BT1-001", as: "cost" }],
        },
        1: { battleArea: [{ card: "BT1-014", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("peckmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("base").topCard.cardId).toBe("BT26-072");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-001");
    expect(s.state.memory).toBe(0);
  });

  it("may decline both alternative costs without trashing or deleting", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-072", as: "peckmon" }], hand: [{ card: "BT1-001", as: "cost" }] },
        1: { battleArea: [{ card: "BT1-014", as: "victim" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("peckmon"));

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-001");
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("may instead place the hand card face down under Keenan Crier before deleting", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-072", as: "peckmon" },
            {
              card: "BT26-094",
              as: "keenan",
              under: [
                { card: "BT1-002", as: "oldBottom", faceUp: false },
                { card: "BT1-003", as: "oldTop", faceUp: false },
              ],
            },
          ],
          hand: [{ card: "BT1-001", as: "cost" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("peckmon"));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.perm("keenan").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("cost").instanceId,
      s.inst("oldBottom").instanceId,
      s.inst("oldTop").instanceId,
    ]);
    expect(s.perm("keenan").stack[0]).toMatchObject({ cardId: "BT1-001", faceUp: false });

    await advance(s.engine).verb.trashDigivolutionCards(s.perm("keenan").permanentId, [s.inst("cost").instanceId], 0);
    expect(s.state.players[0]!.trash.find(({ cardId }) => cardId === "BT1-001")?.faceUp).toBe(true);
  });

  it("executes Blocker and prevents the security check", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-072", as: "peckmon" }], security: 1 },
        1: { battleArea: [{ card: "BT26-060", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("makes the opponent choose the inherited On Deletion hand trash", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-074", as: "host", under: ["BT26-072"] }] },
        1: {
          hand: [
            { card: "BT1-009", as: "chosen" },
            { card: "BT1-010", as: "kept" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("chosen").instanceId);
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);

    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("chosen").instanceId);
    expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("kept").instanceId);
    expect(s.decisions.filter(({ seat, req }) => seat === 1 && req.kind === "selectCards")).toHaveLength(1);
  });
});
