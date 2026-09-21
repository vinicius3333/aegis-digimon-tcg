/**
 * Join payload sent to client.joinOrCreate(ROOM_TYPE, options). Mirrors
 * AegisJoinOptions declared on the server room (API-CONTRACT.md section 1). The
 * web package may not import @aegis/api, so the shape is restated here; both sides
 * must agree on it.
 */
export interface AegisJoinOptions {
  displayName: string;
  deck: { mainDeck: string[]; eggDeck: string[]; mainDeckArts?: string[]; eggDeckArts?: string[] }; // arrays of card ids
  deckId?: string;
  deckName?: string;
  ranked?: boolean;
  betaBattleMode?: boolean;
  authTicket?: string;
  /** Dev-only: ask a bot room for a hand-laid board instead of the pre-game procedure. */
  devScenario?:
    | "battle"
    | "arena"
    | "arena-aegiochus-dark-assembly"
    | "arena-alliance-20"
    | "arena-bt20-grademon-redirect"
    | "arena-bt21-davis-top-stack"
    | "arena-face-up-security"
    | "arena-ex13-grademon-immunity"
    | "arena-ex13-gotsumon-blocker-search"
    | "arena-ex13-giromon-block-triggers"
    | "arena-ex13-deletion-trigger-ordering"
    | "arena-ex13-kings-opponent-sukamon"
    | "arena-ex13-kingsukamon-immunity-lapse"
    | "arena-ex13-examon"
    | "arena-ex5-attack-priority"
    | "arena-ex10-god-grade-raising-color"
    | "arena-issue-4888-app-fusion"
    | "arena-issue-4889-weregarurumon-dna"
    | "arena-issue-4890-reina-deletion"
    | "arena-issue-4891-seiten-on-play"
    | "arena-issue-4892-effect-digixros"
    | "arena-issue-4893-seiten-evo-cost"
    | "arena-junomon-opponent-target"
    | "arena-jupitermon-siren"
    | "arena-magnamon-x"
    | "arena-reboot-timing"
    | "arena-sagasol-effect-assembly"
    | "arena-sagasol-etemon-protected-dp"
    | "arena-sagasol-guard-source"
    | "arena-ex13-magnamon-end-turn"
    | "arena-seven-code-link-dp"
    | "arena-suspend-lock-block"
    | "arena-vortex-target-legality"
    | "arena-vortexdramon"
    | "card-bugs"
    | "security-battle"
    | "security-chain";
}
