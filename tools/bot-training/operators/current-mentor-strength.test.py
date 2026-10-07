"""Synthetic all44 evaluator admission/strength guards; no games/models launched."""

import argparse
import copy
import importlib.util
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

source = Path(os.environ.get('AEGIS_MENTOR_STRENGTH_OPERATOR', Path(__file__).with_name('current-mentor-strength.py')))
spec = importlib.util.spec_from_file_location('synthetic_mentor_strength', source)
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
base = Path(os.environ.get('AEGIS_MENTOR_STRENGTH_BASE', '/home/vinicius/aegis-bot-lab/transfers/rule-link-current-corrective-strength.py'))
raw = base.read_text(encoding='utf-8')


class Guards(unittest.TestCase):
    def setUp(self):
        self.r = {'formatVersion': 1, 'purpose': 'frozen-new-corrective-ppo-full-all44-development-evaluation',
            'sourceCommit': m.SOURCE, 'engineSha256': m.ENGINE, 'operatorSha256': 'a' * 64, 'run': str(m.RUN),
            'identity': str(m.LAB / 'transfers' / (m.NAME + '-identity.json')),
            'resourceGo': str(m.LAB / 'transfers' / (m.NAME + '-ROOT-go.json')),
            'wrapper': {'path': str(m.LAB / 'transfers' / (m.NAME + '-launch.sh')), 'sha256': 'b' * 64},
            'games': 3872, 'seed': 6135000, 'baselineCompletionSha256': m.BASELINE_COMPLETION,
            'finalBlindSeedsAuthorized': False, 'learningCompletionSha256': 'c' * 64,
            'learningCustody': {'requestSha256': 'd' * 64, 'identitySha256': 'e' * 64,
                'resourceGoSha256': 'f' * 64, 'completionSha256': 'c' * 64},
            'checkpoint': {'path': str(m.LAB / 'runs' / m.LEARNING_NAME / 'ppo/checkpoint.pt'), 'sha256': '1' * 64}}
        self.ns = m.namespace(raw, self.r)
        self.closed = {'actualWholeExitCode': 0, 'completionSha256': 'c' * 64, 'report': {
            'sourceCommit': m.SOURCE, 'engineSha256': m.ENGINE, 'comparisonCompletionSha256': m.BASELINE_COMPLETION,
            'acceptedStrengthOrMastery': False, 'learning': {'all12FiniteChanged': True, 'actualAdamUpdates': 17,
                'optimizerStepDeltas': {f'synthetic{i}': 17 for i in range(12)}, 'newCheckpoint': self.r['checkpoint'],
                'acceptedStrengthOrMastery': False}, 'records': {'games': 3872, 'seed': 6029858,
                'all44StrengthAccepted': False, 'paymentMasteryAccepted': False, 'finalBlindSeedsConsumed': False}}}

    def test_unknown_real_positive_adam_count_and_all44_admitted(self):
        self.assertEqual(self.ns['learning_fields'](self.closed, self.r)['actualAdamUpdates'], 17)
        self.assertEqual(self.ns['LEARNING_ARGS'][1], str(m.LAB / 'transfers' / (m.LEARNING_NAME + '-request.json')))
        self.assertIn(self.r['learningCustody']['identitySha256'], self.ns['LEARNING_ARGS'])

    def test_pending_wrong_completion_or_model_rejected(self):
        for key, value in [('learningCustody', None), ('learningCompletionSha256', None),
            ('checkpoint', {'path': str(m.LAB / 'runs/rule-link-current-aa2e56463-corrective-ppo-r4/ppo/checkpoint.pt'), 'sha256': '1' * 64})]:
            r = copy.deepcopy(self.r); r[key] = value
            with self.subTest(key=key), self.assertRaises(ValueError): m.namespace(raw, r)

    def test_full_scope_final_seeds_boolean_counts_and_extra_flags_rejected(self):
        for key, value in [('games', 2112), ('games', True), ('seed', 6210000), ('finalBlindSeedsAuthorized', 0),
            ('finalBlindSeedsAuthorized', True), ('formatVersion', True), ('newFlag', True), ('engineSha256', '2' * 64)]:
            r = copy.deepcopy(self.r); r[key] = value
            with self.subTest(key=key), self.assertRaises(ValueError): m.namespace(raw, r)

    def test_failed_ppo_and_wrong_record_origin_rejected(self):
        for key, value in [('actualWholeExitCode', False), ('actualWholeExitCode', 1), ('completionSha256', '2' * 64)]:
            proof = copy.deepcopy(self.closed); proof[key] = value
            with self.subTest(key=key), self.assertRaises(ValueError): self.ns['learning_fields'](proof, self.r)
        for key, value in [('games', 2112), ('seed', 6019976), ('finalBlindSeedsConsumed', True)]:
            proof = copy.deepcopy(self.closed); proof['report']['records'][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError): self.ns['learning_fields'](proof, self.r)

    def test_partial_nonfinite_reset_and_unequal_ppo_deltas_rejected(self):
        for key, value in [('all12FiniteChanged', False), ('actualAdamUpdates', True),
            ('optimizerStepDeltas', {'one': 17}), ('optimizerStepDeltas', {f'p{i}': 0 for i in range(12)})]:
            proof = copy.deepcopy(self.closed); proof['report']['learning'][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError): self.ns['learning_fields'](proof, self.r)
        proof = copy.deepcopy(self.closed); proof['report']['learning']['optimizerStepDeltas']['synthetic0'] = 18
        with self.assertRaises(ValueError): self.ns['learning_fields'](proof, self.r)

    def test_actual_commands_records_whole_go_and_main_reused_unchanged(self):
        for name in ('command', 'records', 'report', 'approved', 'whole', 'main'):
            self.assertEqual(self.ns[name].__code__.co_filename, str(m.BASE))
        self.assertEqual(self.ns['__file__'], str(source))

    def test_changed_sealed_helper_seam_rejected(self):
        with self.assertRaises(ValueError): m.namespace(raw.replace("records['games']==2112", "records['games']==99"), self.r)

    def test_snapshot_pins_actual_new_ppo_and_all_original_runtime_references(self):
        calls = []
        ctx = {'args': argparse.Namespace(request=Path('/synthetic/request'), request_sha='2' * 64, operator_sha='a' * 64),
            'request': self.r, 'pins': None, 'helper': type('Helper', (), {'source_guard': lambda _, x: None, 'runtime_map': lambda _: {}})(),
            'comparison': {'checkpoints': {'reference': {'path': '/synthetic/reference.pt', 'sha256': '3' * 64}}},
            'manifest': {}, 'prepared': {'runtimeMapSha256': '4' * 64}, 'baselineReportSha256': '5' * 64}
        with patch.dict(self.ns, pin=lambda p, sha: calls.append((p, sha)), read=lambda _: {}): self.ns['snapshot'](ctx)
        self.assertIn((m.LEARNING, m.LEARNING_SHA), calls)
        self.assertIn((m.LAB / 'runs' / m.LEARNING_NAME / 'completion.json', 'c' * 64), calls)
        self.assertIn((m.LAB / 'transfers' / (m.LEARNING_NAME + '-ROOT-go.json'), 'f' * 64), calls)
        self.assertIn((m.LAB / 'runs/rule-link-current-aa2e56463-strength/completion.json', m.BASELINE_COMPLETION), calls)

    def test_aggregate_gain_cannot_replace_strict_every_deck_against_every_reference(self):
        versions = [f'synthetic{i:02d}' for i in range(44)]
        def candidate(wins):
            return {'games': 3872, 'seed': 6135000, 'wins': sum(wins), 'byDeck': {
                v: {'games': 88, 'wins': n, 'losses': 88-n, 'draws': 0} for v, n in zip(versions, wins, strict=True)}}
        refs = {ref: candidate([30] * 44) for ref in m.REFERENCES}
        ctx = {'request': self.r, 'baseline': {'policies': refs}, 'learning': {'actualAdamUpdates': 17}}
        with patch.dict(self.ns, records=lambda _: candidate([31] * 44)):
            self.assertTrue(self.ns['report'](ctx)['strengthGatePasses'])
        with patch.dict(self.ns, records=lambda _: candidate([88] * 43 + [30])):
            report = self.ns['report'](ctx)
            self.assertFalse(report['strengthGatePasses']); self.assertFalse(report['acceptedStrengthOrMastery'])
        refs['fitted-reference']['byDeck'][versions[0]]['wins'] = 31
        with patch.dict(self.ns, records=lambda _: candidate([31] * 44)):
            self.assertFalse(self.ns['report'](ctx)['strengthGatePasses'])


if __name__ == '__main__':
    unittest.main()
