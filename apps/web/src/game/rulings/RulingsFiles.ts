export interface RuleSection {
  readonly section: string | null;
  readonly title: string;
  readonly sourceTitle: string;
  readonly text: string;
}

export interface CardErrata {
  readonly date: string | null;
  readonly changes: readonly { readonly before: string | null; readonly after: string | null }[];
  readonly notes: string | null;
}

export interface CardQuestion {
  readonly id: string;
  readonly ids?: readonly string[];
  readonly date: string | null;
  readonly question: string;
  readonly answer: string;
}

export interface CardRulingsEntry {
  readonly errata?: CardErrata;
  readonly qa?: readonly CardQuestion[];
  readonly sections?: readonly string[];
}

export interface RulingsSetFile {
  readonly sections: Readonly<Record<string, RuleSection>>;
  readonly cards: Readonly<Record<string, CardRulingsEntry>>;
}

export interface EffectOrderRulesFile {
  readonly effectOrderSections: readonly string[];
  readonly sections: Readonly<Record<string, RuleSection>>;
}
