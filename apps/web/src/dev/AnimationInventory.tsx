import {
  ANIMATION_FAMILIES,
  ANIMATION_HARNESSES,
  animationFamiliesForEvent,
  animationFamilyForStep,
  animationFamilyTiming,
  type AnimationFamily,
} from "../game/animationCatalog";
import type { EffectsLabState } from "./effectsLabModel";

/** Engine coverage and observed live recipes, alongside the lab's event/queue timelines. */
export function AnimationInventory({ state }: { state: EffectsLabState }) {
  const events = new Set<AnimationFamily>();
  const steps = new Set<AnimationFamily>();
  for (const batch of state.batches)
    for (const event of batch.events) for (const family of animationFamiliesForEvent(event)) events.add(family);
  for (const step of state.stepEvents) {
    const family = animationFamilyForStep({ id: step.stepId, track: step.track });
    if (family && step.phase === "started") steps.add(family);
  }
  return (
    <details className="effects-lab-inventory">
      <summary>
        Animation inventory · {steps.size}/{Object.keys(ANIMATION_FAMILIES).length} families observed
      </summary>
      <p>
        Event coverage names intended families; observed means a queue recipe actually started. Selection, result and
        persistent state motion also live on the pieces.
      </p>
      <ul>
        {ANIMATION_HARNESSES.map((harness) => (
          <li key={harness.href}>
            <a href={harness.href}>{harness.label}</a> · {harness.kind}
          </li>
        ))}
      </ul>
      <table>
        <thead>
          <tr>
            <th>Family</th>
            <th>This run</th>
            <th>Sequence and timing</th>
          </tr>
        </thead>
        <tbody>
          {(Object.keys(ANIMATION_FAMILIES) as AnimationFamily[]).map((family) => (
            <tr key={family}>
              <th scope="row">{ANIMATION_FAMILIES[family].label}</th>
              <td>{steps.has(family) ? "Observed" : events.has(family) ? "Engine event" : "Not exercised"}</td>
              <td>
                {ANIMATION_FAMILIES[family].sequence}
                <br />
                <small>{animationFamilyTiming(family)}</small>
                <br />
                <code>{ANIMATION_FAMILIES[family].owner}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
