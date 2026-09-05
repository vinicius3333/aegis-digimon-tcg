# EX9-037 optional activation cost

The catalog's On Play and When Digivolving clauses use a hand-placement activation
cost. The controller may decline that cost; neither suspension nor the subsequent
same-target restriction may resolve when payment is declined or impossible.

Public-intent regressions reproduced two failures: a declined On Play consumed the
hand card, and an alternate evolution consumed its mandatory draw without optional
acceptance. The card IR lacked `optional` and `abortOnDecline` on both cost-bearing
Suspend actions. The interpreter already implements these flags, as used by the
EX9-056 cost-bearing actions.

Use an optional, cost-bearing `ConditionalBranch` with a true condition to group
the two actions. Putting `abortOnDecline` directly on Suspend also aborts when its
target was already suspended, contrary to Q4790. The group gates only payment;
its nested Suspend preserves the selected target for Restrict even without an
orientation change. Both structures already have interpreter support.

Change EX9-037 only. Changing the shared payment machinery
would unnecessarily affect mandatory actions; weakening the refusal assertions
would preserve the rules defect. Registration remains exclusively `registerIrCard`.

Verification covers public payment acceptance, refusal, empty hand, legal normal
and alternate evolutions, Training, the inherited two-attack boundary, and the
next-opponent-unsuspend restriction. Run the card and EX9-056 peer tests, typecheck,
and scoped style checks. The collection closeout synchronizes the effects record.
