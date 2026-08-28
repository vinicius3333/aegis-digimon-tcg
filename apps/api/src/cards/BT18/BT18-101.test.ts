import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT18-082.js";
import { compiled } from "./BT18-101.js";

describe("BT18-101 Lucemon: Satan Mode", () => {
  it("matches the catalog and binds Larva play to an empty breeding area", () => {
    expect(getCardDefinition("BT18-101")).toMatchObject({
      nameEn: "Lucemon: Satan Mode",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 7,
      playCost: 16,
      dp: 16000,
      evoCosts: [{ color: "Purple", level: 6, memoryCost: 6 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Demon God"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          breeding: true,
          payCost: false,
          optional: true,
          abortOnDecline: true,
          requiresEmpty: "breedingArea",
          from: ["trash"],
          target: {
            filter: { controller: "mine", zone: "trash", nameOrTrait: [{ tokens: ["Lucemon: Larva"], match: "name" }] },
          },
        },
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } },
          condition: { kind: "ifThisEffectActed" },
        },
      ],
    });
  });

  it("naturally plays Larva from trash and deletes one opposing Digimon on alternate digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-082", as: "chaosMode" }],
          hand: [{ card: "BT18-101", as: "satanMode" }],
          trash: [{ card: "BT18-086", as: "larva" }],
          deck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("chaosMode").permanentId,
        instanceId: s.inst("satanMode").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("satanMode").topCard?.cardId === "BT18-101");
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("larva").instanceId);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("larva").instanceId)).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(4);
  });

  it("may decline the processing condition without moving Larva or deleting the target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-082", as: "chaosMode" }],
          hand: [{ card: "BT18-101", as: "satanMode" }],
          trash: [{ card: "BT18-086", as: "larva" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("chaosMode").permanentId,
        instanceId: s.inst("satanMode").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("satanMode").topCard?.cardId === "BT18-101");
    await settle();

    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("larva").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([s.perm("target").permanentId]);
  });

  it("does not delete when the natural digivolution cannot play Larva into an occupied breeding area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-082", as: "chaosMode" }],
          breeding: { card: "BT1-001", as: "occupied" },
          hand: [{ card: "BT18-101", as: "satanMode" }],
          trash: [{ card: "BT18-086", as: "larva" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("chaosMode").permanentId,
        instanceId: s.inst("satanMode").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("satanMode").topCard?.cardId === "BT18-101");

    expect(s.perm("occupied").topCard?.cardId).toBe("BT1-001");
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(targetId);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT18-086")).toBe(true);
  });

  it("makes Q3053 mandatory by binding the security-trash result before both fallback deletions", () => {
    expect(compiled.effects[1]).toMatchObject({
      trigger: "EndOfAllTurns",
      frequency: "OncePerTurn",
      actions: [
        { kind: "SecurityManipulation", op: "trash", from: ["security"], bindResultAs: "trashedSecurity" },
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"] } },
          condition: { kind: "bindingEmpty", ref: "trashedSecurity" },
        },
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Tamer"] } },
          condition: { kind: "bindingEmpty", ref: "trashedSecurity" },
        },
      ],
    });
  });

  it("naturally trashes the opponent's top security at the end of the turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-101", as: "satanMode" }], deck: ["BT1-001"] },
        1: {
          battleArea: [{ card: "BT1-009", as: "target" }],
          security: [{ card: "BT1-001", as: "opponentSecurity" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).runTurn(0);

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("opponentSecurity").instanceId)).toBe(
      true,
    );
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([s.perm("target").permanentId]);
  });

  it("naturally deletes one opposing Digimon and one Tamer when the opponent has no security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-101", as: "satanMode" }], deck: ["BT1-001"] },
        1: { battleArea: [{ card: "BT1-009", as: "targetDigimon" }, { card: "BT1-085", as: "targetTamer" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).runTurn(0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT1-009", "BT1-085"]));
  });
});
