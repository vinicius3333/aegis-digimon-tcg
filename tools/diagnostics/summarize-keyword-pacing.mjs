#!/usr/bin/env node
/** Summarize real-browser observations attached by effects-lab-pacing.spec.ts. */
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { parseArgs } from "node:util";
import { KEYWORDS } from "../../packages/shared/dist/index.js";

const { values, positionals } = parseArgs({
  options: { out: { type: "string", default: ".local/keyword-pacing" } },
  allowPositionals: true,
});
if (!positionals.length) throw new Error("Provide Playwright JSON reports containing pacing attachments.");

function specs(suite) {
  return [...(suite.specs ?? []), ...(suite.suites ?? []).flatMap(specs)];
}

const runs = [];
const captures = [];
const sourceReports = [];
for (const path of positionals) {
  const text = await readFile(resolve(path), "utf8");
  // pnpm can prepend an engine warning and append its failed-command summary.
  const start = text.search(/\{\s*"config"\s*:/);
  const end = text.lastIndexOf("\n}");
  if (start < 0 || end < start) throw new Error(`No Playwright JSON report in ${path}`);
  const report = JSON.parse(text.slice(start, end + 2));
  sourceReports.push({
    path: resolve(path),
    stats: report.stats,
    errorCount: (report.errors ?? []).length,
    pacingCases: specs(report)
      .filter((spec) => /^real (keyword|group) pacing:/.test(spec.title))
      .flatMap((spec) =>
        spec.tests.flatMap((test) =>
          test.results.map((result) => ({
            name: spec.title,
            status: result.status,
            hasCapture: (result.attachments ?? []).some((attachment) =>
              ["real-keyword-pacing.json", "real-group-pacing.json"].includes(attachment.name),
            ),
          })),
        ),
      ),
  });
  for (const spec of specs(report)) {
    for (const test of spec.tests) {
      for (const result of test.results) {
        for (const attachment of result.attachments ?? []) {
          if (!["real-keyword-pacing.json", "real-group-pacing.json"].includes(attachment.name)) continue;
          const body = attachment.body
            ? Buffer.from(attachment.body, "base64").toString("utf8")
            : await readFile(attachment.path, "utf8");
          const data = JSON.parse(body);
          const { capture, state } = data;
          const firstBatchAt = state.batches[0]?.receivedAt;
          const poses = capture.poses.filter((pose) => pose.returning);
          const lastReturn = poses.at(-1);
          const destination =
            lastReturn &&
            capture.poses.find(
              (pose) => !pose.returning && pose.at === lastReturn.at && pose.fieldKey === lastReturn.fieldKey,
            );
          const clips = capture.motion.animations.filter(
            (animation) =>
              animation.cutShort &&
              !animation.undersampled &&
              animation.visibleFrames > 0 &&
              animation.movingFrames > 0,
          );
          const queueBeats = state.steps
            .filter((step) => step.phase === "started" && step.at >= capture.startedAt)
            .map((started) => {
              const finished = state.steps.find((step) => step.key === started.key && step.phase === "finished");
              return {
                stepId: started.stepId,
                batchId: started.batchId,
                track: started.track,
                startedAt: started.at,
                finishedAt: finished?.at,
                observedMs: finished === undefined ? null : finished.at - started.at,
                cancelled: finished?.cancelled ?? false,
                failed: finished?.failed ?? false,
              };
            });
          const paintedBeats = capture.motion.animations
            .filter((animation) =>
              [
                "battle-arrow-extend",
                "battle-claw",
                "battle-card-impact",
                "battle-security-reveal",
                "battle-security-hit",
                "battle-clash-in",
                "battle-clash-out",
              ].includes(animation.name),
            )
            .map((animation) => ({
              name: animation.name,
              target: animation.target,
              firstPaintObservedAt: animation.firstAt,
              lastPaintObservedAt: animation.lastAt,
              observedMs: animation.lastAt - animation.firstAt,
              authoredDurationMs: animation.durationMs,
              cutShort: animation.cutShort,
              undersampled: animation.undersampled,
            }));
          runs.push({
            name: spec.title,
            status: result.status,
            keyword: data.scenario?.keyword,
            scenarioId: data.scenario?.id ?? "effects-lab-field-grouping",
            speed: data.speed ?? "normal",
            format: data.format ?? { name: data.phone ? "phone" : "desktop" },
            captureMs: capture.finishedAt - capture.startedAt,
            closedBatchHookToCaptureEndMs: firstBatchAt === undefined ? null : capture.finishedAt - firstBatchAt,
            decisionVisibleMs: (capture.decisions ?? []).reduce(
              (sum, decision) => sum + ((decision.closedAt ?? capture.finishedAt) - decision.openedAt),
              0,
            ),
            decisionWindows: (capture.decisions ?? []).map((decision) => ({
              ...decision,
              observedMs: (decision.closedAt ?? capture.finishedAt) - decision.openedAt,
            })),
            queueBeats,
            paintedBeats,
            actionWindows: (data.actions ?? []).map((action, index, actions) => {
              const through = actions[index + 1]?.observedAt ?? capture.finishedAt;
              return {
                ...action,
                through,
                observedMs: through - action.observedAt,
                queueStepIds: queueBeats
                  .filter((beat) => beat.startedAt >= action.observedAt && beat.startedAt < through)
                  .map((beat) => beat.stepId),
              };
            }),
            phaseRibbons: capture.phaseRibbons ?? [],
            arrowTargetChanges: capture.arrows ?? [],
            visibleBoardChanges: capture.boards ?? [],
            cardRotations: capture.timings
              .filter((timing) => timing.properties.includes("rotate") && timing.duration === 200)
              .map((timing) => {
                const delayMs = timing.delayMs ?? 0;
                const rotationPoses = capture.poses.filter(
                  (pose) =>
                    pose.permanentId === timing.permanentId &&
                    !pose.returning &&
                    pose.at >= timing.at &&
                    pose.at <= timing.at + delayMs + 350,
                );
                const initial = rotationPoses[0]?.angle;
                const moving = rotationPoses.find(
                  (pose) => initial !== undefined && Math.abs(pose.angle - initial) > 0.1,
                );
                const settled = rotationPoses.find(
                  (pose) => moving && pose.at > moving.at && (pose.angle === 0 || pose.angle === 90),
                );
                return {
                  permanentId: timing.permanentId,
                  observedAt: timing.at,
                  authoredDurationMs: timing.duration,
                  authoredDelayMs: delayMs,
                  firstMovingFrameAt: moving?.at,
                  firstSettledFrameAt: settled?.at,
                  sampledMotionMs: moving && settled ? settled.at - moving.at : null,
                };
              }),
            finalReturnErrorPx: destination
              ? Math.hypot(lastReturn.x - destination.x, lastReturn.y - destination.y)
              : null,
            frameQuality: capture.motion.captureQuality,
            frameGaps: capture.motion.frames,
            cancelledSteps: state.steps.filter((step) => step.cancelled).map((step) => step.stepId),
            gateExpiries: state.gateExpiries,
            nativeClipCandidates: clips.map(({ name, target, durationMs, firstAt, lastAt }) => ({
              name,
              target,
              durationMs,
              observedMs: lastAt - firstAt,
            })),
            truncated: capture.truncated || state.truncated,
          });
          captures.push(data);
        }
      }
    }
  }
}

const verified = [...new Set(runs.filter((run) => run.status === "passed" && run.keyword).map((run) => run.keyword))];
const summary = {
  schema: 1,
  timingOrigin:
    "Browser performance time origin: actions/hooks/queue use performance.now(); DOM and native animations share the requestAnimationFrame frame timestamp. No server execution/network latency claim.",
  limitations:
    "One run per case is a regression observation, not a statistical benchmark. Queue beat spans include waits/gates; painted beat spans are sampled observations, not isolated authored animation durations. Native clip candidates need review; intentional UI transition interruption can appear here. Canvas motion is outside this probe.",
  keywordCoverage: {
    definition:
      "At least one passed captured case per keyword; individual case statuses and uncaptured failures remain in sourceReports.",
    contract: KEYWORDS.length,
    verified,
    pending: KEYWORDS.filter((keyword) => !verified.includes(keyword)),
  },
  runs,
  sourceReports,
};
const out = resolve(values.out);
await mkdir(out, { recursive: true });
await writeFile(join(out, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
await writeFile(join(out, "captures.json"), `${JSON.stringify(captures, null, 2)}\n`);
console.log(
  JSON.stringify({
    out,
    verifiedKeywords: verified.length,
    keywordContract: KEYWORDS.length,
    runs: runs.length,
    failedResults: sourceReports
      .flatMap((report) => report.pacingCases)
      .filter((result) => result.status !== "passed" && result.status !== "skipped").length,
    capturedFailedRuns: runs.filter((run) => run.status !== "passed").length,
    missingCaptures: sourceReports.flatMap((report) => report.pacingCases).filter((result) => !result.hasCapture)
      .length,
  }),
);
