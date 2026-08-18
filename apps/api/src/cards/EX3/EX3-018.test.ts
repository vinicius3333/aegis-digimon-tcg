import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX3-018.js";
import "./EX3-021.js";

describe("EX3-018 Coredramon", () => {
  it("has its official identity and both printed normal evolution colors", () => {
    expect(getCardDefinition("EX3-018")).toMatchObject({
      cardId: "EX3-018",
      nameEn: "Coredramon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 6000,
      evoCosts: [
        { color: "Blue", level: 3, memoryCost: 3 },
        { color: "Green", level: 3, memoryCost: 3 },
      ],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Dragon"],
      rarity: "U",
      imageId: "EX3-018",
    });
  });

  it("digivolves for the alternate cost 2 from a Dracomon-named Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-037", as: "dracomon" }],
        hand: [{ card: "EX3-018", as: "coredramon" }],
        deck: ["BT1-030"],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("dracomon").permanentId,
        instanceId: s.inst("coredramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("dracomon").topCard.cardId === "EX3-018");

    expect(s.state.memory).toBe(0);
    expect(s.perm("dracomon").stack.map(({ cardId }) => cardId)).toContain("EX3-037");
  });

  it("uses the printed cost 3 from a blue level 3 whose name is not Dracomon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-029", as: "gabumon" }],
        hand: [{ card: "EX3-018", as: "coredramon" }],
        deck: ["BT1-030"],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gabumon").permanentId,
        instanceId: s.inst("coredramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gabumon").topCard.cardId === "EX3-018");
    expect(s.state.memory).toBe(0);
  });

  it("uses the printed cost 3 from a green level 3 whose name is not Dracomon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-067", as: "greenLevel3" }],
        hand: [{ card: "EX3-018", as: "coredramon" }],
        deck: ["BT1-030"],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("greenLevel3").permanentId,
        instanceId: s.inst("coredramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("greenLevel3").topCard.cardId === "EX3-018");
    expect(s.state.memory).toBe(0);
  });

  it("its printed Evade can be accepted to suspend and prevent effect deletion", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX3-018", as: "coredramon" }] } });
    await s.ready();

    const deletion = advance(s.engine).verb.deletePermanent([s.perm("coredramon").permanentId], "byEffect");
    await settle(() => s.events.some(({ kind }) => kind === "evadePrompt"));
    expect(
      s.engine.applyIntent(0, {
        type: "respondEvade",
        permanentId: s.perm("coredramon").permanentId,
        accept: true,
      }),
    ).toEqual({ ok: true });
    await deletion;

    expect(s.perm("coredramon").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).not.toContain("EX3-018");
    expect(s.events).toContainEqual({
      kind: "evadeResolved",
      permanentId: s.perm("coredramon").permanentId,
      accepted: true,
    });
  });

  it("its printed Evade may be declined, allowing the deletion", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX3-018", as: "coredramon" }] } });
    await s.ready();
    const permanentId = s.perm("coredramon").permanentId;

    const deletion = advance(s.engine).verb.deletePermanent([permanentId], "byEffect");
    await settle(() => s.events.some(({ kind }) => kind === "evadePrompt"));
    expect(s.engine.applyIntent(0, { type: "respondEvade", permanentId, accept: false })).toEqual({ ok: true });
    await deletion;

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === permanentId)).toBe(false);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("EX3-018");
    expect(s.events).toContainEqual({ kind: "evadeResolved", permanentId, accepted: false });
  });

  it("cannot pay Evade while already suspended and is deleted without opening a prompt", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX3-018", as: "coredramon", suspended: true }] } });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("coredramon").permanentId], "byEffect");
    expect(s.events.some(({ kind }) => kind === "evadePrompt")).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("EX3-018");
  });

  it("Dragon family: inherited Evade applies under Dramon/Examon names and not an unrelated host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-019", under: ["EX3-018"], as: "paledramon" },
          { card: "EX3-074", under: ["EX3-018"], as: "examon" },
          { card: "BT1-038", under: ["EX3-018"], as: "unrelated" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("paledramon"), "Evade")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("examon"), "Evade")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("unrelated"), "Evade")).toBe(false);

    const deletion = advance(s.engine).verb.deletePermanent([s.perm("paledramon").permanentId], "byEffect");
    await settle(() => s.events.some(({ kind }) => kind === "evadePrompt"));
    expect(
      s.engine.applyIntent(0, {
        type: "respondEvade",
        permanentId: s.perm("paledramon").permanentId,
        accept: true,
      }),
    ).toEqual({ ok: true });
    await deletion;
    expect(s.perm("paledramon").isSuspended).toBe(true);
  });

  it("recomputes inherited Evade when an unrelated host digivolves into a Dramon name", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-032", under: ["EX3-018"], as: "host" }],
        hand: [{ card: "EX3-021", as: "crysPaledramon" }],
        deck: ["BT1-030"],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Evade")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("crysPaledramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "EX3-021");
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Evade")).toBe(true);
  });
});
