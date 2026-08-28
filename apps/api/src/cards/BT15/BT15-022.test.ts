import { describe, expect, it } from "vitest";
import { Phase, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT15-022.js";

describe("BT15-022", () => {
  it("matches the catalog identity and blue level-2 evolution route", () => {
    expect(getCardDefinition("BT15-022")).toMatchObject({
      nameEn: "Betamon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Blue", level: 2, memoryCost: 0 }],
      types: ["Amphibian"],
    });
  });

  it("publishes inherited Jamming without a broad battle-deletion restriction", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Jamming" }],
      actions: [],
    }));
  it("restricts an opposing Digimon from attacking when played by an effect", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "Restrict",
          restriction: "attack",
          duration: "untilOpponentTurnEnd",
          condition: { kind: "triggerEnteredByEffect" },
        },
      ],
    }));
  it("locks an opposing Digimon only when its On Play source entered by an effect", async () => {
    const effectPlayed = setupEngine(
      {
        0: { hand: [{ card: "BT15-022", as: "betamon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );

    effectPlayed.state.memory = 10;
    await advance(effectPlayed.engine).verb.playInstances([effectPlayed.inst("betamon").instanceId], "BT14-038");
    await settle(() => observe(effectPlayed.engine).isRestricted(effectPlayed.perm("target"), "attack"));

    expect(observe(effectPlayed.engine).isRestricted(effectPlayed.perm("target"), "attack")).toBe(true);
    advance(effectPlayed.engine).ledgers.continuous.sweep(effectPlayed.state, "ownerTurnEnd", 0);
    expect(observe(effectPlayed.engine).isRestricted(effectPlayed.perm("target"), "attack")).toBe(true);
    advance(effectPlayed.engine).ledgers.continuous.sweep(effectPlayed.state, "ownerTurnEnd", 1);
    expect(observe(effectPlayed.engine).isRestricted(effectPlayed.perm("target"), "attack")).toBe(false);

    const normallyPlayed = setupEngine(
      {
        0: { hand: [{ card: "BT15-022", as: "betamon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    normallyPlayed.state.memory = 10;
    expect(normallyPlayed.engine.applyIntent(0, { type: "playCard", instanceId: normallyPlayed.inst("betamon").instanceId })).toEqual({ ok: true });
    await settle(() => normallyPlayed.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT15-022"));

    expect(observe(normallyPlayed.engine).isRestricted(normallyPlayed.perm("target"), "attack")).toBe(false);
  });

  it("keeps its inherited host alive against a stronger Security Digimon", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT15-002", as: "egg" },
        hand: [
          { card: "BT15-022", as: "betamon" },
          { card: "BT15-023", as: "hostCard" },
        ],
      },
      1: { security: ["BT1-081"] },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("egg").permanentId, instanceId: s.inst("betamon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT15-022");
    s.state.phase = Phase.Breeding;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("egg").permanentId })).toEqual({ ok: true });
    await settle(() => !s.perm("egg").inBreeding);
    s.state.phase = Phase.Main;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("egg").permanentId, instanceId: s.inst("hostCard").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT15-023");
    const hostId = s.perm("egg").permanentId;

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

  it("does not protect its inherited host in battle against an opposing Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT15-023", as: "host", under: ["BT15-022"] }] },
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
