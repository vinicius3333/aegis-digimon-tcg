# Effect presentation and diagnostics

On Play presentation follows the opponent card's showcase and field arrival burst. The source glow and effect announcement run before later result panels on the same presentation track. The bot uses shared arrival and effect-choice budgets that cover the client's durations. Reconnect replay and fast-forward retain their existing behavior.

The client reports queue lifecycle and actual display moments over a diagnostic channel. Reports carry the originating batch and state version, source card and timing when available, client timestamp, duration, playback mode, cancellation, fast-forward, failure, and queue depth. The room validates and bounds reports, assigns the authenticated seat, and writes them to the existing match log without applying a game intent.

Optional AD1-024 watcher activation wraps the entire Suspend/Unsuspend/conditional Return sequence. Declining preserves the shared once-per-turn use; accepting consumes it across play and evolution triggers.

Security Attack labels display a signed modifier. A separate server projection preserves that modifier before the security check count is floored at zero, so both positive and negative badges remain accurate.

Deferred security notices retain their originating batch, state version and phase order. Their source activation finishes before the next turn’s phase presentation, including when several phase events arrive before the security animation closes.

Effect toasts and confirmations resolve text from the committed printed card catalog. Engine descriptions may identify an exact printed clause, including siblings with the same timing, but never replace it with a summary. Compound actions can author `effectTextPart` as a verbatim passage; decision provenance carries it to the confirmation and target picker. The client accepts a part only when it belongs to the resolved printed clause. AD1-024 groups suspend/unsuspend together and scopes its conditional deck return to a second passage. A declined or completed nested action restores its caller’s display passage.


## Compound decision passages

Cards define `effectTextPart` as literal printed passages on the IR actions that ask for input. Separate sequential steps use their own passages; an authorization for an entire block keeps its complete printed clause. Conditions, costs, restrictions, and parameter adjustments remain attached to the relevant passage. Automatic expansion uses explicit `Then,` boundaries and only unambiguous action-to-passage matches. Modal alternatives, conditional branches, delayed/granted effects, search composites, and ambiguous repeated action kinds retain their complete clauses until their steps have an explicit author mapping. Shared action objects must agree across every timing that references them.

The frontend validates passages against the resolving timing and inherited/main/security source box. A keyword at the beginning of a full printed source description must not hide a valid authored passage for the actual timing. Catalog synchronization adds presentation metadata only and preserves existing executable IR, including existing differences between static records and authoritative runtime modules.
