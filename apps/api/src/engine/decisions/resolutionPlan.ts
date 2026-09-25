/**
 * A controller's plan for the simultaneous effects of one timing window: the order they
 * resolve in and preset answers to the yes/no questions each effect asks.
 *
 * The resolver re-collects after every resolution, so it still asks "which effect next?"
 * once per effect. The plan answers those repeat prompts for the controller while every
 * offered effect is one they already ordered. A newly triggered effect, or one they left
 * unordered, reopens the prompt. One plan lives exactly as long as its timing window, so an
 * answer never leaks into a later window where the same card triggers again.
 */
export class ResolutionPlan {
  private order: string[] = [];
  private readonly presets = new Map<string, boolean>();

  /** Record a controller's answer. Keys it orders move to the front; earlier plans keep the rest. */
  adopt(order: readonly string[], optionalAnswers: Readonly<Record<string, boolean>> = {}): void {
    this.order = [...order, ...this.order.filter((key) => !order.includes(key))];
    for (const [key, accept] of Object.entries(optionalAnswers)) this.presets.set(key, accept);
  }

  /** The planned key to resolve next, or undefined when some offered key has no planned position. */
  nextOf(offered: readonly string[]): string | undefined {
    if (offered.length === 0 || !offered.every((key) => this.order.includes(key))) return undefined;
    return this.order.find((key) => offered.includes(key));
  }

  /** The preset answer (true = use, false = skip) for this effect's yes/no questions, if any. */
  presetFor(key: string): boolean | undefined {
    return this.presets.get(key);
  }
}
