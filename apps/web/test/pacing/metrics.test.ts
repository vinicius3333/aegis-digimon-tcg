import { describe, expect, it } from "vitest";
import { Zone, type ServerEvent } from "@aegis/shared";
import { singleServerBatch } from "../../src/net/serverBatches";
import { measure } from "./metrics";
import { summarize } from "./report";
import type { Recording, Sample } from "./runScenario";
import type { VisibleBoard } from "../../src/game/screen/model/visibleBoard";

const effect = { seat: 0 as const, sourceCardId: "BT1-010", effectKey: "on-play", description: "Draw one card." };
const counters = { boardBudgetHits: 0, decisionBudgetHits: 0, decisionStallHits: 0, skips: 0, manualAdvances: 0 };

const emptyPlayer = {
  battleArea: [],
  breeding: null,
  hand: [],
  handCount: 0,
  deckCount: 50,
  eggDeckCount: 4,
  trash: [],
  securityCount: 5,
  securityDpDelta: 0,
};

function fieldPermanent(permanentId: string, instanceId: string) {
  return {
    permanentId,
    topCard: { cardId: "BT25-058", instanceId, artId: "" },
    stack: [],
    linked: [],
    isSuspended: false,
    currentDP: 13000,
    securityAttackModifier: 0,
    summoningSick: false,
    keywords: [],
  };
}

function recording(options: { announceAt?: number; decline?: boolean; mandatoryResult?: boolean } = {}): Recording {
  const events: ServerEvent[] = [
    { kind: "effectTriggered", ...effect },
    ...(options.mandatoryResult ? [{ kind: "memoryChanged" as const, from: 3, to: 4, reason: "effect" }] : []),
    { kind: "effectResolved", ...effect },
  ];
  const batch = singleServerBatch(events, 1);
  const samples: Sample[] = [0, 16, 32, 48].map((at) => ({
    at,
    liveVersion: 1,
    displayedVersion: at >= 32 ? 1 : 0,
    clauses:
      options.announceAt !== undefined && at >= options.announceAt && at < 48
        ? [{ itemId: "clause", batchId: batch.id, cardId: effect.sourceCardId, active: true }]
        : [],
    cues: [],
    litSources: [],
    focusedPermanentIds: [],
    promptVisible: false,
    banner: false,
    queueIdle: at === 48,
  }));
  return {
    scenario: "isolated-on-play",
    pacing: "stacked",
    speed: "normal",
    startedAt: 0,
    endedAt: 48,
    timedOut: false,
    wire: [],
    batches: [{ ...batch, receivedAt: 0 }],
    samples,
    steps: [],
    decisions: options.decline
      ? [
          {
            decisionId: "optional",
            kind: "optional",
            sourceCardId: effect.sourceCardId,
            arrivedAt: 0,
            visibleAt: 0,
            answeredAt: 16,
            optionalAccepted: false,
          },
        ]
      : [],
    gateExpiries: [],
    counters,
    pendingSteps: 0,
    end: { turnSeat: 0, phase: "Main", resolvedBySeat: [1, 0] },
  };
}

describe("pacing coverage beyond chains", () => {
  it("reports a lost isolated announcement instead of measuring zero effects", () => {
    expect(summarize(measure(recording()))).toMatchObject({
      chains: 0,
      totalEffects: 1,
      singleEffects: 1,
      missingAnnouncements: 1,
      allUnreadable: 1,
      allResultsBeforeCause: 1,
    });
  });

  it("detects an isolated result that reached the board before its announcement", () => {
    expect(summarize(measure(recording({ announceAt: 48 })))).toMatchObject({ allResultsBeforeCause: 1 });
  });

  it("does not demand an announcement for a wholly refused optional effect", () => {
    expect(summarize(measure(recording({ decline: true })))).toMatchObject({
      totalEffects: 1,
      missingAnnouncements: 0,
      allUnreadable: 0,
      allResultsBeforeCause: 0,
    });
  });

  it("still demands narration when a mandatory result precedes an optional refusal", () => {
    expect(summarize(measure(recording({ decline: true, mandatoryResult: true })))).toMatchObject({
      missingAnnouncements: 1,
    });
  });

  it("distinguishes an animation failure and dropped step from a completed queue", () => {
    const run = recording();
    run.pendingSteps = 1;
    run.steps = [
      {
        step: {},
        id: "lost-flight",
        track: "motion",
        fromBatch: true,
        liveVersionAtQueue: 1,
        queuedAt: 0,
        endedAt: 16,
        outcome: "dropped",
        failed: true,
        cancelled: true,
        skipping: false,
      },
    ];
    expect(summarize(measure(run))).toMatchObject({ failedSteps: 1, droppedSteps: 1, pendingSteps: 1 });
  });

  it("flags narration published before initial consent, using the exact effect identity", () => {
    const run = recording({ announceAt: 0 });
    run.decisions = [
      {
        decisionId: "accept",
        kind: "optional",
        sourceCardId: effect.sourceCardId,
        effectKey: effect.effectKey,
        activationConfirmation: true,
        arrivedAt: 0,
        answeredAt: 16,
        optionalAccepted: true,
      },
    ];
    expect(summarize(measure(run)).optionalAnnouncementsBeforeAnswer).toBe(1);
  });

  it("allows an already activated clause to remain visible during a later optional operation", () => {
    const run = recording({ announceAt: 0 });
    run.decisions = [
      {
        decisionId: "operation",
        kind: "optional",
        sourceCardId: effect.sourceCardId,
        effectKey: effect.effectKey,
        activationConfirmation: false,
        arrivedAt: 0,
        answeredAt: 16,
        optionalAccepted: true,
      },
    ];
    expect(summarize(measure(run)).optionalAnnouncementsBeforeAnswer).toBe(0);
  });

  it("does not double reading time when the same clause appears on its prompt and toast", () => {
    const run = recording({ announceAt: 0 });
    run.samples = run.samples.map((sample) => ({
      ...sample,
      promptVisible: true,
      promptSourceCardId: effect.sourceCardId,
    }));
    const effectMetrics = measure(run).singles[0]!;
    expect(effectMetrics.railMs).toBe(64);
    expect(effectMetrics.readableMs).toBe(64);
    expect(effectMetrics.aloneMs + effectMetrics.railMs).toBeGreaterThan(effectMetrics.readableMs);
  });

  for (const early of [false, true]) {
    it(`attributes a hidden-seat draw to its exact batch count ${early ? "when that count leaks" : "rather than an earlier turn draw"}`, () => {
      const run = recording({ announceAt: 32 });
      const mainDraw = { ...effect, sourceCardId: "BT24-098", effectKey: "BT24-098/ir-25-0" };
      const batch = singleServerBatch(
        [
          { kind: "effectTriggered", ...mainDraw },
          {
            kind: "cardsMoved",
            seat: 1,
            instanceIds: ["later-draw-1", "later-draw-2"],
            from: Zone.Deck,
            to: Zone.Hand,
          },
          { kind: "effectResolved", ...mainDraw },
        ],
        2,
      );
      run.batches = [{ ...batch, receivedAt: 8 }];
      run.handCountSnapshots = [
        { stateVersion: 1, counts: [0, 3] },
        { stateVersion: 2, counts: [0, 5] },
      ];
      run.samples = run.samples.map((sample) => ({
        ...sample,
        liveVersion: 2,
        displayedVersion: sample.at >= 48 ? 2 : 1,
        clauses: sample.clauses.map((clause) => ({ ...clause, batchId: batch.id, cardId: mainDraw.sourceCardId })),
        visibleBoard: {
          players: [
            emptyPlayer,
            {
              ...emptyPlayer,
              handCount: sample.at >= (early ? 16 : 48) ? 5 : sample.at >= 16 ? 3 : 2,
              deckCount: sample.at >= (early ? 16 : 48) ? 40 : sample.at >= 16 ? 42 : 43,
            },
          ],
          memory: { value: 3, turnSeat: 0 },
          turn: { seat: 0, count: 1 },
        },
      }));
      expect(measure(run).singles[0]!.firstResultAt).toBe(early ? 16 : 48);
      expect(summarize(measure(run)).allResultsBeforeCause).toBe(early ? 1 : 0);
    });

    it(`attributes a replayed card to its new permanent ${early ? "when it arrives early" : "rather than its former evolution host"}`, () => {
      const run = recording({ announceAt: 32 });
      const batch = singleServerBatch(
        [
          { kind: "effectTriggered", ...effect },
          { kind: "cardPlayed", seat: 1, cardId: "BT25-058", instanceId: "replayed", permanentId: "new-host" },
          { kind: "cardsMoved", instanceIds: ["replayed"], from: "various", to: Zone.BattleArea },
          { kind: "effectResolved", ...effect },
        ],
        2,
      );
      run.batches = [{ ...batch, receivedAt: 8 }];
      run.samples = run.samples.map((sample) => ({
        ...sample,
        liveVersion: 2,
        displayedVersion: sample.at >= 48 ? 2 : 1,
        clauses: sample.clauses.map((clause) => ({ ...clause, batchId: batch.id })),
        visibleBoard: {
          players: [
            emptyPlayer,
            {
              ...emptyPlayer,
              battleArea: [
                fieldPermanent("old-host", sample.at >= 16 ? "replayed" : "old-top"),
                ...(sample.at >= (early ? 16 : 48) ? [fieldPermanent("new-host", "replayed")] : []),
              ],
            },
          ],
          memory: { value: 3, turnSeat: 0 },
          turn: { seat: 0, count: 1 },
        },
      }));
      expect(measure(run).singles[0]!.firstResultAt).toBe(early ? 16 : 48);
      expect(summarize(measure(run)).allResultsBeforeCause).toBe(early ? 1 : 0);
    });

    it(`measures the rendered Security play ${early ? "arriving too early" : "held through its reveal"}, despite an advanced selected revision`, () => {
      const run = recording({ announceAt: 32 });
      const batch = singleServerBatch(
        [
          { kind: "effectTriggered", ...effect },
          { kind: "cardPlayed", seat: 0, cardId: "ST20-14", permanentId: "security-play", fromZone: Zone.Security },
          { kind: "effectResolved", ...effect },
        ],
        1,
      );
      run.batches = [{ ...batch, receivedAt: 0 }];
      run.samples = run.samples.map((sample) => {
        const player = {
          battleArea: [],
          breeding: null,
          hand: [],
          handCount: 0,
          deckCount: 50,
          eggDeckCount: 4,
          trash: [],
          securityCount: 4,
          securityDpDelta: 0,
        };
        const visibleBoard: VisibleBoard = {
          players: [
            {
              ...player,
              battleArea:
                sample.at >= (early ? 16 : 48)
                  ? [
                      {
                        permanentId: "security-play",
                        topCard: { cardId: "ST20-14", instanceId: "security-card", artId: "" },
                        stack: [],
                        linked: [],
                        isSuspended: false,
                        currentDP: 0,
                        securityAttackModifier: 0,
                        summoningSick: true,
                        keywords: [],
                      },
                    ]
                  : [],
            },
            player,
          ],
          memory: { value: 3, turnSeat: 0 },
          turn: { seat: 0, count: 1 },
        };
        return { ...sample, displayedVersion: 1, visibleBoard };
      });
      expect(summarize(measure(run)).allResultsBeforeCause).toBe(early ? 1 : 0);
      expect(measure(run).singles[0]!.firstResultAt).toBe(early ? 16 : 48);
    });
  }

  for (const focused of [true, false]) {
    it(`treats the Delay source's own departure as a cost and ${focused ? "verifies" : "requires"} its prior focus`, () => {
      const run = recording();
      const source = {
        ...effect,
        sourceCardId: "BT23-098",
        sourceInstanceId: "delay-source",
        sourcePermanentId: "delay-permanent",
        description: "＜Delay＞ Play 1 Digimon.",
      };
      const opening = singleServerBatch([{ kind: "effectTriggered", ...source }], 1);
      const cost = singleServerBatch(
        [
          {
            kind: "cardsMoved",
            seat: 0,
            from: "various",
            to: Zone.Trash,
            instanceIds: [source.sourceInstanceId],
            cardIds: [source.sourceCardId],
            trashedPermanents: [
              {
                seat: 0,
                cardId: source.sourceCardId,
                instanceId: source.sourceInstanceId,
                permanentId: source.sourcePermanentId,
              },
            ],
          },
        ],
        2,
      );
      const result = singleServerBatch(
        [
          { kind: "memoryChanged", from: 3, to: 4, reason: "effect" },
          { kind: "effectResolved", ...source },
        ],
        3,
      );
      run.batches = [
        { ...opening, receivedAt: 0 },
        { ...cost, receivedAt: 16 },
        { ...result, receivedAt: 64 },
      ];
      run.steps = [
        {
          step: {},
          id: "delete-burst-1",
          track: "delete",
          batchId: cost.id,
          fromBatch: true,
          liveVersionAtQueue: 2,
          queuedAt: 16,
          startedAt: 32,
          endedAt: 48,
          outcome: "finished",
          failed: false,
          cancelled: false,
          skipping: false,
        },
      ];
      run.samples = [0, 16, 32, 48, 64, 80].map((at) => ({
        at,
        liveVersion: 3,
        displayedVersion: at >= 64 ? 3 : at >= 32 ? 2 : 0,
        clauses:
          at >= 48 ? [{ itemId: "delay-clause", batchId: opening.id, cardId: source.sourceCardId, active: true }] : [],
        cues: at === 32 ? ["delete-1"] : [],
        litSources: focused && at === 16 ? [source.sourceCardId] : [],
        focusedPermanentIds: focused && at === 16 ? [source.sourcePermanentId] : [],
        promptVisible: false,
        banner: false,
        queueIdle: at >= 64,
      }));
      expect(summarize(measure(run))).toMatchObject({
        allResultsBeforeCause: 0,
        resultBeforeCause: 0,
        costBeforeFocus: focused ? 0 : 1,
      });
    });
  }

  for (const focused of [true, false]) {
    it(`allows an exact printed source-suspension cost only ${focused ? "after" : "with"} physical source focus`, () => {
      const run = recording();
      const source = {
        ...effect,
        sourceCardId: "EX11-068",
        sourceInstanceId: "violet-card",
        sourcePermanentId: "violet",
        description: "[Your Turn] When a Digimon attacks, by suspending this Tamer, Draw 1.",
      };
      const opening = singleServerBatch([{ kind: "effectTriggered", ...source }], 1);
      const cost = singleServerBatch(
        [{ kind: "cardsMoved", instanceIds: ["violet"], from: "unsuspended", to: "suspended" }],
        2,
      );
      const result = singleServerBatch(
        [
          { kind: "memoryChanged", from: 3, to: 4, reason: "effect" },
          { kind: "effectResolved", ...source },
        ],
        3,
      );
      run.batches = [
        { ...opening, receivedAt: 0 },
        { ...cost, receivedAt: 16 },
        { ...result, receivedAt: 48 },
      ];
      run.samples = [0, 16, 32, 48, 64].map((at) => {
        const empty = {
          battleArea: [],
          breeding: null,
          hand: [],
          handCount: 0,
          deckCount: 50,
          eggDeckCount: 4,
          trash: [],
          securityCount: 5,
          securityDpDelta: 0,
        };
        const visibleBoard: VisibleBoard = {
          players: [
            {
              ...empty,
              battleArea: [
                {
                  permanentId: "violet",
                  topCard: { cardId: source.sourceCardId, instanceId: source.sourceInstanceId, artId: "" },
                  stack: [],
                  linked: [],
                  isSuspended: at >= 16,
                  currentDP: 0,
                  securityAttackModifier: 0,
                  summoningSick: false,
                  keywords: [],
                },
              ],
            },
            empty,
          ],
          memory: { value: at >= 48 ? 4 : 3, turnSeat: 0 },
          turn: { seat: 0, count: 1 },
        };
        return {
          at,
          liveVersion: 3,
          displayedVersion: at >= 48 ? 3 : 2,
          visibleBoard,
          clauses:
            at >= 32 ? [{ itemId: "clause", batchId: opening.id, cardId: source.sourceCardId, active: true }] : [],
          cues: [],
          litSources: [],
          focusedPermanentIds: focused && at === 0 ? ["violet"] : [],
          promptVisible: false,
          banner: false,
          queueIdle: at >= 48,
        };
      });
      expect(summarize(measure(run))).toMatchObject({ allResultsBeforeCause: 0, costBeforeFocus: focused ? 0 : 1 });
      if (focused) {
        // A source glow from an earlier activation cannot authorize this later payment.
        run.batches = run.batches.map((batch, index) => (index === 0 ? { ...batch, receivedAt: 16 } : batch));
        expect(summarize(measure(run)).costBeforeFocus).toBe(1);
        run.batches = run.batches.map((batch, index) => (index === 0 ? { ...batch, receivedAt: 0 } : batch));
      }
      // Suspending a different permanent is a result, even when this source can pay a cost.
      run.batches = run.batches.map((batch, index) =>
        index === 1
          ? {
              ...cost,
              events: cost.events.map((event) => ({ ...event, instanceIds: ["other"] })) as typeof cost.events,
              receivedAt: 16,
            }
          : batch,
      );
      run.samples = run.samples.map((sample) => ({
        ...sample,
        visibleBoard: {
          ...sample.visibleBoard!,
          players: [
            {
              ...sample.visibleBoard!.players[0],
              battleArea: sample.visibleBoard!.players[0].battleArea.map((permanent) => ({
                ...permanent,
                permanentId: "other",
              })),
            },
            sample.visibleBoard!.players[1],
          ],
        },
      }));
      expect(summarize(measure(run)).allResultsBeforeCause).toBe(1);
    });
  }

  it("recognizes Takumi's printed 'may suspend this Tamer to' payment wording", () => {
    const run = recording();
    const source = {
      ...effect,
      sourceCardId: "BT5-091",
      sourcePermanentId: "takumi",
      description: "[Your Turn] When one of your Digimon digivolves, you may suspend this Tamer to trigger ＜Draw 1＞.",
    };
    const batch = singleServerBatch(
      [
        { kind: "effectTriggered", ...source },
        { kind: "cardsMoved", from: "unsuspended", to: "suspended", instanceIds: ["takumi"] },
        { kind: "effectResolved", ...source },
      ],
      1,
    );
    run.batches = [{ ...batch, receivedAt: 0 }];
    expect(measure(run).singles[0]).toMatchObject({
      costKind: "sourceSuspension",
      costSourcePermanentId: "takumi",
      resultEvents: [],
    });
  });

  for (const separate of [false, true]) {
    it(`${separate ? "detects the later effect's early DP after separate snapshots" : "rejects ambiguous implicit DP ownership when two effects share one snapshot"}`, () => {
      const run = recording();
      const later = { ...effect, sourceCardId: "EX8-011", effectKey: "later-dp", sourceInstanceId: "later-source" };
      const firstEvents: ServerEvent[] = [
        { kind: "effectTriggered", ...effect },
        { kind: "effectResolved", ...effect },
      ];
      const laterEvents: ServerEvent[] = [
        { kind: "effectTriggered", ...later },
        { kind: "effectResolved", ...later },
      ];
      const first = singleServerBatch(separate ? firstEvents : [...firstEvents, ...laterEvents], 1);
      const second = singleServerBatch(laterEvents, 2);
      run.batches = [{ ...first, receivedAt: 0 }, ...(separate ? [{ ...second, receivedAt: 0 }] : [])];
      const dp = (stateVersion: number, currentDP: number) => ({
        stateVersion,
        permanents: [{ permanentId: "victim", topInstanceId: "victim-card", currentDP }],
      });
      run.dpSnapshots = [dp(0, 5000), dp(1, separate ? 5000 : 8000), ...(separate ? [dp(2, 8000)] : [])];
      run.samples = run.samples.map((sample) => ({
        ...sample,
        liveVersion: separate ? 2 : 1,
        displayedVersion: sample.at >= 48 ? (separate ? 2 : 1) : 0,
        clauses: [
          {
            itemId: sample.at >= 32 ? "later-clause" : "first-clause",
            batchId: sample.at >= 32 && separate ? second.id : first.id,
            cardId: sample.at >= 32 ? later.sourceCardId : effect.sourceCardId,
            active: true,
          },
        ],
        visibleBoard: {
          players: [
            {
              ...emptyPlayer,
              battleArea: [{ ...fieldPermanent("victim", "victim-card"), currentDP: sample.at >= 16 ? 8000 : 5000 }],
            },
            emptyPlayer,
          ],
          memory: { value: 3, turnSeat: 0 },
          turn: { seat: 0, count: 1 },
        },
      }));
      if (!separate)
        expect(() => measure(run)).toThrow(
          `Ambiguous DP result: batch=${first.id} version=1 permanent=victim effects=0:BT1-010:on-play:unknown-source,0:EX8-011:later-dp:later-source`,
        );
      else {
        const measured = measure(run);
        const laterUnit = measured.chains
          .flatMap((chain) => chain.units)
          .find((unit) => unit.effectKey === later.effectKey)!;
        expect(laterUnit).toMatchObject({ clauseShownAt: 32, firstResultAt: 16 });
        expect(summarize(measured).allResultsBeforeCause).toBe(1);
      }
    });
  }

  for (const early of [false, true]) {
    it(`measures a batch-owned printed DP change ${early ? "leaking from live projection" : "held behind narration"} without requiring a server result event`, () => {
      const run = recording({ announceAt: 32 });
      run.dpSnapshots = [
        { stateVersion: 0, permanents: [{ permanentId: "victim", topInstanceId: "victim-card", currentDP: 5000 }] },
        { stateVersion: 1, permanents: [{ permanentId: "victim", topInstanceId: "victim-card", currentDP: 3000 }] },
      ];
      run.samples = run.samples.map((sample) => {
        const empty = {
          battleArea: [],
          breeding: null,
          hand: [],
          handCount: 0,
          deckCount: 50,
          eggDeckCount: 4,
          trash: [],
          securityCount: 5,
          securityDpDelta: 0,
        };
        const visibleBoard: VisibleBoard = {
          players: [
            {
              ...empty,
              battleArea: [
                {
                  permanentId: "victim",
                  topCard: { cardId: "BT1-010", instanceId: "victim-card", artId: "" },
                  stack: [],
                  linked: [],
                  isSuspended: false,
                  currentDP: sample.at >= (early ? 16 : 48) ? 3000 : 5000,
                  securityAttackModifier: 0,
                  summoningSick: false,
                  keywords: [],
                },
              ],
            },
            empty,
          ],
          memory: { value: 3, turnSeat: 0 },
          turn: { seat: 0, count: 1 },
        };
        return { ...sample, visibleBoard, displayedVersion: sample.at >= 48 ? 1 : 0 };
      });
      expect(measure(run).singles[0]!.dpResults).toEqual([
        { permanentId: "victim", from: 5000, to: 3000, version: 1, receivedAt: 0 },
      ]);
      expect(summarize(measure(run)).allResultsBeforeCause).toBe(early ? 1 : 0);
      // An evolved top's new base DP belongs to its arrival rather than an inferred modifier.
      run.dpSnapshots = [
        run.dpSnapshots[0]!,
        { stateVersion: 1, permanents: [{ permanentId: "victim", topInstanceId: "evolved-card", currentDP: 3000 }] },
      ];
      expect(measure(run).singles[0]!.dpResults).toEqual([]);
    });
  }
});
