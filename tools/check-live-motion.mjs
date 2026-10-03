/** Real UI regression through Orca's embedded browser. See apps/web/src/dev/LIVE_MOTION.md. */
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";

const orca =
  process.env.ORCA_CLI_COMMAND ||
  (process.env.ORCA_DEV_REPO_ROOT ? "orca-dev" : process.platform === "linux" ? "orca-ide" : "orca");
const base = process.argv[2] || "http://localhost:5174";
const reportPath = process.argv[3];
function call(...args) {
  const response = JSON.parse(
    execFileSync(orca, [...args, "--json"], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 }),
  );
  assert.equal(response.ok, true, JSON.stringify(response.error));
  return response.result;
}
function evaluate(expression) {
  const value = call("eval", "--expression", expression).result;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
function clickNamed(name) {
  const snapshot = call("snapshot");
  const match = Object.entries(snapshot.refs).find(([, entry]) => entry.name === name);
  assert.ok(match, `Missing control: ${name}`);
  call("click", "--element", `@${match[0]}`);
  call("snapshot");
}

call("goto", "--url", `${base}/dev/arena?mode=visual`);
call("tab", "switch", "--page", call("snapshot").browserPageId, "--focus");
call("wait", "--selector", "button[aria-haspopup=menu]");
evaluate(`(async () => {
  const {createLiveMotionProbe} = await import('/src/dev/liveMotionProbe.ts');
  window.__aegisMotionCheck = createLiveMotionProbe();
  window.__aegisMotionCheck.start();
  // Calibration distinguishes live motion, a paused animation and hidden motion.
  for (const kind of ['live', 'paused', 'hidden']) {
    const target = document.createElement('div');
    target.className = 'motion-calibration-' + kind;
    target.style.cssText = 'position:fixed;left:20px;top:20px;width:10px;height:10px;background:red;z-index:9999';
    if (kind === 'hidden') target.style.display = 'none';
    document.body.append(target);
    const animation = target.animate([{translate:'0 0'}, {translate:'100px 0'}], {duration:450, fill:'forwards'});
    if (kind === 'paused') animation.pause();
  }
  await new Promise(resolve => setTimeout(resolve, 550));
  return 'ready';
})()`);
const tools = call("snapshot");
const control = Object.values(tools.refs).find(
  (entry) => entry.name === "Demo tools" || entry.name === "Ferramentas da demo",
);
assert.ok(control, "Demo tools unavailable");
clickNamed(control.name);
const menu = call("snapshot");
const plutomon = Object.values(menu.refs).find(
  (entry) => entry.name.includes("Plutomon:") && entry.role === "menuitem",
);
assert.ok(plutomon, "Plutomon deletion scenario unavailable");
clickNamed(plutomon.name);
const report = evaluate(`(async () => {
  await new Promise(resolve => setTimeout(resolve, 5000));
  const probe = window.__aegisMotionCheck;
  probe.stop();
  const report = probe.read();
  document.querySelectorAll('[class^="motion-calibration-"]').forEach(element => element.remove());
  return report;
})()`);
if (reportPath) writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
assert.equal(report.captureQuality, "usable", "Capture throttled; reveal the Orca tab and repeat");
const calibration = (kind) => report.animations.find((sample) => sample.target.includes(`motion-calibration-${kind}`));
assert.ok(calibration("live")?.movingFrames >= 2, "Live animation not detected");
assert.ok(calibration("paused")?.pausedFrames >= 2, "Paused animation not detected");
assert.equal(calibration("paused")?.movingFrames, 0);
assert.equal(calibration("hidden")?.visibleFrames, 0);
const shards = report.animations.filter((sample) => sample.name === "battle-card-shatter");
assert.equal(shards.length, 12, "Both deleted Digimon must render all six shards");
assert.ok(
  shards.every((sample) => sample.movingFrames >= 2 && !sample.cutShort && !sample.undersampled),
  "Shards did not complete visible motion",
);
const deletions = report.moments.filter((moment) => moment.kind === "deletion");
assert.equal(deletions.length, 2);
assert.ok(
  deletions.every((moment) => moment.ended && moment.lastAt - moment.firstAt <= 400),
  "Deletion exceeds the 400ms budget",
);
const decoration = report.animations.filter(
  (sample) => sample.target.includes("game-delete-burst") || sample.name.startsWith("battle-burst"),
);
assert.ok(
  decoration.every((sample) => !sample.cutShort),
  "Deletion energy pulse was cut short",
);
console.log(
  JSON.stringify(
    {
      verdict: "PASS",
      frameP95Ms: report.frames.p95Ms,
      shardCount: shards.length,
      deletionMs: deletions.map((moment) => Math.round(moment.lastAt - moment.firstAt)),
    },
    null,
    2,
  ),
);
