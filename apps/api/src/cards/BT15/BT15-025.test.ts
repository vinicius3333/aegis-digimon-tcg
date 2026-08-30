import { describe, expect, it } from "vitest";
import { Phase, getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT15-025.js";

describe("BT15-025", () => {
  it("matches the catalog identity and blue level-3 evolution route", () => {
    expect(getCardDefinition("BT15-025")).toMatchObject({
      nameEn: "Seadramon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
      types: ["Aquatic"],
    });
  });

  it("publishes non-inherited Rush", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Rush" }],
      actions: [],
    }));

  it("publishes inherited Jamming", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Jamming" }],
      actions: [],
    }));

  it("can attack the player on the turn it is normally played", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT15-025", as: "seadramon" }] },
      1: { security: ["BT1-001"] },
    });
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("seadramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(observe(s.engine).hasKeyword(s.perm("seadramon"), "Rush")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("seadramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("seadramon").isSuspended).toBe(true);
  });

  it("grants only Jamming to an inherited host and survives stronger security", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT15-002", as: "egg" },
        hand: [
          { card: "BT15-019", as: "rookie" },
          { card: "BT15-025", as: "seadramon" },
          { card: "BT15-027", as: "hostCard" },
        ],
      },
      1: { security: ["BT1-081"] },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("egg").permanentId, instanceId: s.inst("rookie").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT15-019");
    s.state.phase = Phase.Breeding;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("egg").permanentId })).toEqual({ ok: true });
    await settle(() => !s.perm("egg").inBreeding);
    s.state.phase = Phase.Main;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("egg").permanentId, instanceId: s.inst("seadramon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT15-025");
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("egg").permanentId, instanceId: s.inst("hostCard").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT15-027");
    const hostId = s.perm("egg").permanentId;

    expect(observe(s.engine).hasKeyword(s.perm("egg"), "Rush")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("egg"), "Jamming")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(true);
  });

  it("does not let inherited Jamming prevent deletion in ordinary Digimon battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT15-027", as: "host", under: ["BT15-025"] }] },
      1: { battleArea: [{ card: "BT1-081", as: "defender", suspended: true }] },
    });
    await s.ready();
    const hostId = s.perm("host").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
  });
});
