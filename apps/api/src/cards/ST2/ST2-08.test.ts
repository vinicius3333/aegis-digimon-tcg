import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle, type SeatSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST2-06.js";
import "./ST2-08.js";

describe("ST2-08 WereGarurumon", () => {
  it("matches the inherited battle-area Security Attack contract", () => {
    const definition = getCardDefinition("ST2-08")!;
    const compiled = getCompiledCard("ST2-08")!;

    expect(definition.inheritedEffectText).toContain("Security Attack +1");
    expect(compiled.effects).toEqual([
      {
        trigger: "YourTurn",
        isInherited: true,
        actions: [
          {
            kind: "Aura",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            effect: {
              kind: "keyword",
              keyword: { keyword: "SecurityAttack", amount: 1, raw: "<Security Attack +1>" },
            },
            while: {
              kind: "opponentHas",
              filter: {
                zone: "battleArea",
                digivolutionCards: "none",
                controllerDefault: "opponent",
                kind: ["Digimon"],
              },
              raw: "your opponent has a battle-area Digimon with no digivolution cards",
            },
          },
        ],
      },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("gives its host Security Attack +1 while the opponent has a Digimon without sources", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST2-11", as: "host", under: ["ST2-08"] }] },
      1: { battleArea: ["ST1-03"] },
    });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });

  it("does not grant Security Attack +1 while every opposing Digimon has a source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST2-11", as: "host", under: ["ST2-08"] }] },
      1: { battleArea: [{ card: "ST1-03", under: ["ST1-04"] }] },
    });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(0);
  });

  it("does not count a source-less Digimon in the opponent's breeding area", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST2-11", as: "host", under: ["ST2-08"] }] },
      1: { breeding: "ST1-03" },
    });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(0);
  });
});

describe("ST2-08 WereGarurumon — KB Q&A rulings", () => {
  const OPPONENT_SECURITY = ["ST1-02", "ST1-02", "ST1-02"];

  async function attackWithHost(options: { hostSources: string[]; opponent: SeatSpec }) {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST1-10", as: "host", under: options.hostSources }] },
        1: { ...options.opponent, security: OPPONENT_SECURITY },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const securityAttackBeforeAttack = observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());

    const checkedCount = s.events.filter((event) => event.kind === "securityChecked").length;
    return { s, securityAttackBeforeAttack, checkedCount };
  }

  it("grants Security Attack +1 when the opponent's only Digimon has no digivolution cards (Q611)", async () => {
    const lone = await attackWithHost({ hostSources: ["ST2-08"], opponent: { battleArea: ["ST1-03"] } });
    expect(lone.securityAttackBeforeAttack).toBe(1);
    expect(lone.checkedCount).toBe(2);
    expect(lone.s.state.players[1]!.security).toHaveLength(1);

    const withSource = await attackWithHost({
      hostSources: ["ST2-08"],
      opponent: { battleArea: [{ card: "ST1-03", under: ["ST1-04"] }] },
    });
    expect(withSource.securityAttackBeforeAttack).toBe(0);
    expect(withSource.checkedCount).toBe(1);
  });

  it("applies once another When Attacking effect trashes the target's last digivolution card (Q612)", async () => {
    const { s, securityAttackBeforeAttack, checkedCount } = await attackWithHost({
      hostSources: ["ST2-06", "ST2-08"],
      opponent: { battleArea: [{ card: "ST1-10", as: "target", under: [{ card: "ST1-03", as: "lastSource" }] }] },
    });

    expect(securityAttackBeforeAttack).toBe(0);
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("lastSource").instanceId);
    expect(checkedCount).toBe(2);
    expect(s.state.players[1]!.security).toHaveLength(1);

    const withoutTrasher = await attackWithHost({
      hostSources: ["ST1-04", "ST2-08"],
      opponent: { battleArea: [{ card: "ST1-10", as: "target", under: ["ST1-03"] }] },
    });
    expect(withoutTrasher.s.perm("target").stack).toHaveLength(1);
    expect(withoutTrasher.checkedCount).toBe(1);
  });

  it("ignores a Digimon with no digivolution cards in the opponent's breeding area (Q613)", async () => {
    const breedingOnly = await attackWithHost({ hostSources: ["ST2-08"], opponent: { breeding: "ST1-03" } });
    expect(breedingOnly.securityAttackBeforeAttack).toBe(0);
    expect(breedingOnly.checkedCount).toBe(1);
    expect(breedingOnly.s.state.players[1]!.security).toHaveLength(2);

    const battleArea = await attackWithHost({ hostSources: ["ST2-08"], opponent: { battleArea: ["ST1-03"] } });
    expect(battleArea.checkedCount).toBe(2);
  });

  it("does not apply while the opponent has no Digimon in the battle area (Q614)", async () => {
    const empty = await attackWithHost({ hostSources: ["ST2-08"], opponent: {} });
    expect(empty.securityAttackBeforeAttack).toBe(0);
    expect(empty.checkedCount).toBe(1);
    expect(empty.s.state.players[1]!.security).toHaveLength(2);
  });
});
