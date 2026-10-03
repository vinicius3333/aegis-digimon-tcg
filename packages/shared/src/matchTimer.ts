/** Optional casual/private match clock policy. Public queues always use the defaults. */
export const MATCH_TIMER_START_SECONDS = 300;
export const MATCH_TIMER_REFILL_SECONDS = 30;
export const MATCH_TIMER_START_OPTIONS = [60, 180, 300, 600] as const;
export const MATCH_TIMER_REFILL_OPTIONS = [0, 15, 30, 60] as const;
export interface MatchTimerOptions {
  matchTimer: boolean;
  timerStartSeconds?: number;
  timerRefillSeconds?: number;
}
export function matchTimerSettings(options: Partial<MatchTimerOptions>, privateRoom = false) {
  return {
    enabled: options.matchTimer === true,
    startSeconds:
      privateRoom && MATCH_TIMER_START_OPTIONS.includes(options.timerStartSeconds as 300)
        ? options.timerStartSeconds!
        : MATCH_TIMER_START_SECONDS,
    refillSeconds:
      privateRoom && MATCH_TIMER_REFILL_OPTIONS.includes(options.timerRefillSeconds as 30)
        ? options.timerRefillSeconds!
        : MATCH_TIMER_REFILL_SECONDS,
  };
}
