import { useEffect, useState } from "react";
import type { LiveMotionProbe } from "./liveMotionProbe";

export function LiveMotionHarness({ probe }: { probe: LiveMotionProbe }) {
  const [report, setReport] = useState(probe.read);
  useEffect(() => {
    const timer = setInterval(() => setReport(probe.read()), 500);
    return () => clearInterval(timer);
  }, [probe]);
  const observed = report.animations.filter((sample) => sample.visibleFrames > 0 && !sample.infinite);
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(probe.read(), null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "aegis-live-motion.json";
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <details className="effects-lab-inventory">
      <summary>
        Live motion harness · {report.running ? "Recording" : "Stopped"} · {observed.length} visible animations
      </summary>
      <p>Measures browser motion and visible toast/deletion lifetimes. Start recording before playing a scenario.</p>
      <div className="aegis-effects-lab-controls">
        <button
          type="button"
          onClick={() => {
            if (report.running) probe.stop();
            else probe.start();
            setReport(probe.read());
          }}
        >
          {report.running ? "Stop motion recording" : "Record live motion"}
        </button>
        <button
          type="button"
          onClick={() => {
            probe.reset();
            setReport(probe.read());
          }}
        >
          Reset motion report
        </button>
        <button type="button" onClick={download}>
          Download motion report
        </button>
      </div>
      <p>
        Frame p95 {report.frames.p95Ms.toFixed(1)} ms · gaps over 50 ms {report.frames.over50Ms} · reduced motion{" "}
        {report.reducedMotion ? "on" : "off"} · capture {report.captureQuality} · truncated animations{" "}
        {observed.filter((s) => s.cutShort).length}
        {report.dropped > 0 ? ` · ${report.dropped} older samples dropped` : ""}
      </p>
      <table>
        <thead>
          <tr>
            <th>Animation / target</th>
            <th>Movement</th>
            <th>Duration</th>
            <th>State</th>
          </tr>
        </thead>
        <tbody>
          {observed.slice(-30).map((sample) => (
            <tr key={sample.id}>
              <th scope="row">
                {sample.name}
                <br />
                <small>{sample.target}</small>
              </th>
              <td>
                {sample.movingFrames} changing / {sample.visibleFrames} visible frames
              </td>
              <td>{sample.durationMs ?? "–"} ms</td>
              <td>
                {sample.undersampled
                  ? "Insufficient frames"
                  : sample.cutShort
                    ? "Cut short"
                    : sample.pausedFrames > 0
                      ? "Paused during capture"
                      : sample.movingFrames > 0
                        ? "Motion observed"
                        : "No visible change sampled"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        <a href="https://developer.mozilla.org/en-US/docs/Web/API/Document/getAnimations">MDN: animation discovery</a> ·
        <a href="https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame">MDN: frame sampling</a>{" "}
        ·<a href="https://atlassian.design/foundations/motion/applying-motion">Atlassian: motion duration guidance</a>
      </p>
    </details>
  );
}
