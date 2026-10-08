import { describe, expect, it } from "vitest";
import { EffectDuration, type Seat } from "@aegis/shared";
import { ContinuousEffectLedger } from "./effects/continuous.js";
import "../cards/index.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { advance } from "./testkit/advance.js";

// Match f62249e5-ba6e-4528-b517-63bee8fbbb0f: Omnimon's inherited deletion
// meets Gladimon's Guard, whose On Deletion removes the pending Raid's source.
describe("Discord 1557815179218128896: Raid after De-Digivolve", () => {
  it.each(
    ([0, 1] as const).flatMap((seat) => [
      { seat, mode: "lost-source-new-Raid" },
      { seat, mode: "lost-source-no-Raid" },
      { seat, mode: "Raid-first" },
      { seat, mode: "source-survives" },
      { seat, mode: "inherited-Raid-survives" },
      { seat, mode: "inherited-Raid-lost" },
      { seat, mode: "inherited-Raid-trashed" },
      { seat, mode: "granted-Raid-survives" },
      { seat, mode: "new-Raid-after-declaration" },
    ]),
  )("$mode (seat $seat)", async ({ seat, mode }) => {
    const opponent: Seat = seat === 0 ? 1 : 0;
    const preferred: string[] = [];
    const options = {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      autoOrderTriggers: false,
      preferInstanceIds: preferred,
    };
    const s = setupEngine(
      {
        [seat]: {
          battleArea: [
            {
              card: mode === "new-Raid-after-declaration" ? "BT5-086" : "AD1-025",
              as: "attacker",
              under:
                mode === "inherited-Raid-lost"
                  ? ["AD1-014", "AD1-004", "EX9-010"]
                  : mode === "lost-source-no-Raid"
                    ? ["AD1-004", "AD1-014"]
                    : [
                        ...(["inherited-Raid-survives", "inherited-Raid-trashed"].includes(mode)
                          ? [{ card: "EX9-010", as: "raidSource" }]
                          : []),
                        "AD1-014",
                        "AD1-004",
                      ],
            },
            "BT1-086",
            "BT1-089",
          ],
          hand: mode === "granted-Raid-survives" ? [{ card: "BT23-012", as: "granter" }] : [],
          deck: Array(10).fill("BT1-009"),
          security: Array(5).fill("BT1-009"),
        },
        [opponent]: {
          battleArea: [
            { card: "BT22-052", as: "target" },
            { card: mode === "source-survives" ? "BT1-010" : "EX13-052", as: "guard" },
          ],
          security: Array(5).fill("BT1-009"),
        },
      },
      options,
    );
    s.state.turnSeat = seat;
    preferred.push(s.inst("target").instanceId, s.inst("attacker").instanceId);
    const originalTop = s.inst("attacker").instanceId;
    await s.ready();
    if (mode === "granted-Raid-survives") {
      s.state.memory = 10;
      options.autoOrderTriggers = true;
      const result = s.engine.applyIntent(seat, { type: "playCard", instanceId: s.inst("granter").instanceId });
      if (!result.ok) throw new Error(`Raid grant play rejected: ${result.reason}`);
      await settle(() => s.state.players[seat]!.hand.length === 0 && s.state.pendingDecision === undefined);
      options.autoOrderTriggers = false;
    }
    expect(
      s.engine.applyIntent(seat, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const request = s.decisions.at(-1)!.req;
    const keys = request.options!.triggerKeys!;
    const deletion = keys.find((key) => key.includes("AD1-004/"))!;
    expect(deletion).toBeDefined();
    expect(keys.some((key) => key.endsWith("/keyword/Raid"))).toBe(mode !== "new-Raid-after-declaration");
    // Supplemental source-removal control through the production trash primitive;
    // the reported Guard/De-Digivolve interaction below still uses real public intents.
    if (mode === "inherited-Raid-trashed") {
      await advance(s.engine).verb.trashDigivolutionCards(
        s.perm("attacker").permanentId,
        [s.inst("raidSource").instanceId],
        opponent,
      );
    }
    const first = mode === "Raid-first" ? keys.find((key) => key.endsWith("/keyword/Raid"))! : deletion;
    options.autoOrderTriggers = true;
    expect(
      s.engine.applyIntent(seat, {
        type: "respondDecision",
        decisionId: request.decisionId,
        response: { kind: "orderTriggers", order: [first, ...keys.filter((key) => key !== first)] },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    await settle(() => s.state.pendingDecision === undefined);
    const guarded = mode !== "source-survives";
    const redirected = ["Raid-first", "source-survives", "inherited-Raid-survives", "granted-Raid-survives"].includes(
      mode,
    );
    expect(s.decisions.some(({ req }) => req.promptText === "Delete this Digimon to use Guard?")).toBe(guarded);
    expect(s.state.players[opponent]!.trash.some((card) => card.cardId === "EX13-052")).toBe(guarded);
    expect(s.state.players[seat]!.trash.some((card) => card.instanceId === originalTop)).toBe(guarded);
    expect(s.perm("attacker").topCard.cardId).toBe(
      !guarded
        ? "AD1-025"
        : mode === "inherited-Raid-lost"
          ? "EX9-010"
          : mode === "lost-source-no-Raid"
            ? "AD1-014"
            : "AD1-004",
    );
    expect(s.perm("attacker").keywords.includes("Raid")).toBe(
      !["lost-source-no-Raid", "inherited-Raid-lost"].includes(mode),
    );
    expect(s.decisions.filter(({ req }) => req.kind === "selectCards" && req.promptText.includes("Raid"))).toHaveLength(
      redirected ? 1 : 0,
    );
    expect(
      s.events.filter((event) => event.kind === "effectTriggered" && event.effectKey.endsWith("/keyword/Raid")),
    ).toHaveLength(redirected ? 1 : 0);
    expect(s.state.players[opponent]!.battleArea.some((p) => p.topCard.cardId === "BT22-052")).toBe(!redirected);
  });
});

describe("pending Raid grant identity controls", () => {
  it("does not substitute a freshly granted copy, even from the same source", () => {
    const ledger = new ContinuousEffectLedger();
    const grant = () =>
      ledger.addKeywordGrant("attacker", "Raid", EffectDuration.UntilEachTurnEnd, undefined, {
        sourceInstanceId: "granter",
        sourceEffectText: "gain Raid",
      });
    grant();
    const pending = ledger.capturePendingKeywordGrants("attacker", "Raid")!;
    expect(pending()).toBe(true);
    ledger.removeKeywordGrant("attacker", "Raid");
    grant();
    expect(ledger.hasKeyword("attacker", "Raid")).toBe(true);
    expect(pending()).toBe(false);
  });

  it("retains an inherited source across recompute but retires it after source removal", () => {
    const ledger = new ContinuousEffectLedger();
    const grant = (sourceInstanceId: string) =>
      ledger.addKeywordGrant("attacker", "Raid", EffectDuration.Permanent, undefined, {
        continuous: true,
        sourceInstanceId,
        sourceCardId: "EX9-010",
        sourceEffectText: "inherited Raid",
      });
    grant("original");
    const pending = ledger.capturePendingKeywordGrants("attacker", "Raid")!;
    ledger.clearContinuous();
    grant("original");
    expect(pending()).toBe(true);
    ledger.clearContinuous();
    grant("replacement");
    expect(pending()).toBe(false);
    ledger.clearContinuous();
    grant("original");
    expect(pending()).toBe(false);
  });
});
