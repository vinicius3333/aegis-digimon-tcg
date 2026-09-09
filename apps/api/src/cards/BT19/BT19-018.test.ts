import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT19-018.js";
import "../index.js";

// Fixtures: BT19-017 Sangomon is the near-miss peer (same colour, same level, same 1000 DP,
// also Aquatic, but no ＜Evade＞ and no inherited ＜Jamming＞); BT19-019 Shellmon is the
// realistic Blue Lv.4 evolution host; BT1-024 MetalTyrannomon + BT19-015 Gallantmon supply
// a real opponent deletion effect; BT1-013 Muchomon (5000 DP, inert) is the Security Digimon.

/** Digivolve seat 0's Lv.5 body into Gallantmon, whose [When Digivolving] deletes ≤8000 DP. */
function gallantmonBoard(preferInstanceIds: string[]) {
  return setupEngine(
    {
      0: {
        battleArea: [{ card: "BT1-024", as: "source" }],
        hand: [{ card: "BT19-015", as: "gallant" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
        security: ["BT1-009", "BT1-010"],
      },
      1: {
        battleArea: [
          { card: "BT19-018", as: "swim" },
          { card: "BT19-017", as: "peer" },
        ],
        security: ["BT1-009", "BT1-010"],
      },
    },
    { autoSelectCards: true, preferInstanceIds },
  );
}

describe("BT19-018 Swimmon", () => {
  it("matches the catalog printing", () => {
    expect(getCardDefinition("BT19-018")).toMatchObject({
      cardId: "BT19-018",
      nameEn: "Swimmon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      // The catalog already bakes the [Rule] trait into `types`, next to the printed
      // [Tropical Fish] type.
      types: ["Tropical Fish", "Aquatic"],
      evoCosts: [{ color: "Blue", level: 2, memoryCost: 0 }],
      effectText: "＜Evade＞ \n[Rule] Trait: Has the [Aquatic] type.",
      inheritedEffectText: "＜Jamming＞.",
    });
  });

  it("compiles the keyword, the [Rule] trait grant and the inherited keyword", () => {
    expect(compiled.effects[0]).toMatchObject({ keywords: [{ keyword: "Evade" }] });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "Rule",
      actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Aquatic"], target: { filter: { isSelfRef: true } } }],
    });
    expect(compiled.effects[2]).toMatchObject({ isInherited: true, keywords: [{ keyword: "Jamming" }] });
    // The inherited clause is the ONLY inherited one; ＜Evade＞ stays with the top card.
    expect(compiled.effects.filter((effect) => effect.isInherited === true)).toHaveLength(1);
    expect(compiled.coverage).toBe("full");
  });

  it("is Aquatic and has Evade; a plain Blue Lv.3 peer has neither", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-018", as: "swim" },
          { card: "BT1-027", as: "plainBlue" },
        ],
        security: ["BT1-009"],
      },
      1: { security: ["BT1-009"] },
    });
    await s.ready();

    expect(observe(s.engine).hasEffectiveTrait(s.perm("swim"), "Aquatic")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("swim"), "Evade")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("plainBlue"), "Aquatic")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("plainBlue"), "Evade")).toBe(false);
    // The grant is self-scoped: BT19-017, which prints the same [Rule], gains nothing here.
    expect(observe(s.engine).hasEffectiveTrait(s.perm("swim"), "Tropical Fish")).toBe(true);
  });

  it("survives an opponent's deletion effect by suspending, where the peer is deleted", async () => {
    const prefer: string[] = [];
    const s = gallantmonBoard(prefer);
    s.state.memory = 10;
    prefer.push(s.perm("swim").topCard!.instanceId);
    await s.ready();
    const swimPermanentId = s.perm("swim").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("gallant").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "evadePrompt"));
    expect(s.engine.applyIntent(1, { type: "respondEvade", permanentId: swimPermanentId, accept: true })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && !observe(s.engine).isAttacking());

    expect(s.perm("swim").permanentId).toBe(swimPermanentId);
    expect(s.perm("swim").isSuspended).toBe(true);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    // Gallantmon's own fallback did not apply: this effect DID choose and did not delete
    // only because ＜Evade＞ replaced the deletion.
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("is deleted when its controller declines Evade", async () => {
    const prefer: string[] = [];
    const s = gallantmonBoard(prefer);
    s.state.memory = 10;
    prefer.push(s.perm("swim").topCard!.instanceId);
    await s.ready();
    const swimPermanentId = s.perm("swim").permanentId;
    const swimInstanceId = s.inst("swim").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("gallant").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "evadePrompt"));
    expect(s.engine.applyIntent(1, { type: "respondEvade", permanentId: swimPermanentId, accept: false })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([swimInstanceId]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT19-017"]);
  });

  it("offers no Evade window for the near-miss peer, which is simply deleted", async () => {
    const prefer: string[] = [];
    const s = gallantmonBoard(prefer);
    s.state.memory = 10;
    prefer.push(s.perm("peer").topCard!.instanceId);
    await s.ready();
    const peerInstanceId = s.inst("peer").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("gallant").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.events.some((event) => event.kind === "evadePrompt")).toBe(false);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([peerInstanceId]);
    expect(s.perm("swim").topCard?.cardId).toBe("BT19-018");
  });

  it("gives its evolution host inherited Jamming, which survives a lost security battle", async () => {
    const jamming = setupEngine({
      0: { battleArea: [{ card: "BT19-019", as: "host", under: ["BT19-018"] }], security: ["BT1-009"] },
      1: { security: [{ card: "BT1-013", as: "securityDigimon" }, "BT1-009", "BT1-010"] },
    });
    await jamming.ready();
    expect(observe(jamming.engine).hasKeyword(jamming.perm("host"), "Jamming")).toBe(true);
    const hostId = jamming.perm("host").permanentId;

    expect(
      jamming.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(
      () => jamming.events.some((event) => event.kind === "securityChecked") && !observe(jamming.engine).isAttacking(),
    );

    // 4000 DP host lost to the 5000 DP Security Digimon but ＜Jamming＞ kept it (§16-9-1).
    expect(jamming.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([hostId]);
    expect(jamming.state.players[0]!.trash).toHaveLength(0);
    expect(jamming.state.players[1]!.trash.map((card) => card.instanceId)).toContain(
      jamming.inst("securityDigimon").instanceId,
    );
    expect(jamming.state.pendingDecision).toBeUndefined();

    // Control: the same host with the near-miss peer underneath has no Jamming and dies.
    const plain = setupEngine({
      0: { battleArea: [{ card: "BT19-019", as: "host", under: ["BT19-017"] }], security: ["BT1-009"] },
      1: { security: [{ card: "BT1-013", as: "securityDigimon" }, "BT1-009", "BT1-010"] },
    });
    await plain.ready();
    expect(observe(plain.engine).hasKeyword(plain.perm("host"), "Jamming")).toBe(false);
    const plainHostInstanceId = plain.perm("host").topCard!.instanceId;

    expect(
      plain.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: plain.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(plain.engine).isAttacking() && plain.state.players[0]!.battleArea.length === 0);

    expect(plain.state.players[0]!.battleArea).toHaveLength(0);
    expect(plain.state.players[0]!.trash.map((card) => card.instanceId)).toContain(plainHostInstanceId);
  });

  it("does not extend Jamming to an ordinary Digimon battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT19-019", as: "host", under: ["BT19-018"] }], security: ["BT1-009", "BT1-010"] },
      1: {
        battleArea: [{ card: "BT1-013", as: "bigger", dp: 5000, suspended: true }],
        security: ["BT1-009", "BT1-010"],
      },
    });
    await s.ready();
    const hostInstanceId = s.perm("host").topCard!.instanceId;
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("bigger").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(hostInstanceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("keeps Evade with the top card only: a host it sits under does not gain it", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-019", as: "host", under: ["BT19-018"] },
          { card: "BT19-018", as: "swim" },
        ],
        security: ["BT1-009"],
      },
      1: { security: ["BT1-009"] },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("swim"), "Evade")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Evade")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("swim"), "Jamming")).toBe(false);
  });
});
