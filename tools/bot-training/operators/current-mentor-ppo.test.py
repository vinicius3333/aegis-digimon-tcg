"""Bounded synthetic guards; these fixtures run no game, model or real learning."""

import copy
import importlib.util
import json
import os
import subprocess
import unittest
from pathlib import Path
from unittest.mock import patch


def load(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


SOURCE = Path(os.environ.get('AEGIS_MENTOR_PPO_OPERATOR', Path(__file__).with_name('current-mentor-ppo.py')))
ADAPTER = Path(os.environ.get('AEGIS_MENTOR_PPO_MIXED_HELPER', '/home/vinicius/aegis-bot-lab/transfers/rule-link-current-corrective-ppo-r4.py'))
BASE = Path(os.environ.get('AEGIS_MENTOR_PPO_BASE_HELPER', '/home/vinicius/aegis-bot-lab/transfers/rule-link-current-corrective-ppo.py'))
m = load(SOURCE, 'synthetic_mentor_ppo_operator')


class Guards(unittest.TestCase):
    def setUp(self):
        self.adapter = m.pinned_loader(ADAPTER, m.ADAPTER_SHA, 'synthetic_unchanged_mixed_helper')
        self.raw = BASE.read_text(encoding='utf-8')
        decks = [f'synthetic-recipe-{i:02d}' for i in range(44)]
        self.r = {'formatVersion': 1, 'purpose': 'actual-current-source-mentor-ppo-continuation',
            'sourceCommit': m.SOURCE, 'engineSha256': m.ENGINE, 'operatorSha256': 'a' * 64,
            'run': str(m.RUN), 'identity': str(m.LAB / 'transfers' / (m.NAME + '-identity.json')),
            'resourceGo': str(m.LAB / 'transfers' / (m.NAME + '-ROOT-go.json')),
            'wrapper': {'path': str(m.LAB / 'transfers' / (m.NAME + '-launch.sh')), 'sha256': 'b' * 64},
            'inventory': {'path': str(m.LAB / 'transfers' / (m.NAME + '-seed-inventory.json')), 'sha256': 'c' * 64},
            'checkpoint': {'path': str(m.LAB / 'runs' / m.IMITATION_NAME / 'imitation/checkpoint.pt'), 'sha256': 'd' * 64},
            'imitationCompletionSha256': 'e' * 64, 'comparisonCompletionSha256': m.BASELINE_COMPLETION,
            'opponentCheckpoints': self.adapter.LEAGUE, 'heuristicShare': 0.5, 'learnerDecks': decks,
            'seed': 6029858, 'games': 3872, 'passes': 1, 'batchGames': 88, 'learningRate': 1e-5,
            'fullAll44AgainstAllFourRequiredAfterLearning': True, 'finalBlindSeedsAuthorized': False}
        self.proof = {'actualWholeExitCode': 0, 'completionSha256': 'e' * 64, 'report': {
            'sourceCommit': m.SOURCE, 'engineSha256': m.ENGINE, 'checkpoint': self.r['checkpoint'],
            'selectedEpoch': 2, 'actualTrainingEpochs': 3, 'actualNewGames': 0,
            'originalEpisodeFolds': {'training': 3225, 'validation': 1607},
            'positiveEngineTeacherCoverage': {'allMechanismsBothSeatsBothFolds': True},
            'selectedLearning': {'all12Finite': True, 'selectedActorAdamUpdates': 2600,
                'preservedValueParameters': ['value.bias', 'value.weight']},
            'acceptedStrengthOrMastery': False, 'finalBlindSeedsConsumed': False}}

    def test_pending_or_guessed_checkpoint_not_admitted(self):
        for key, value in [('imitationCompletionSha256', None), ('imitationCompletionSha256', 'pending'),
            ('checkpoint', {'path': self.r['checkpoint']['path'], 'sha256': None})]:
            r = copy.deepcopy(self.r); r[key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError): m.request_fields(r)

    def test_only_native_imitation_checkpoint_admitted(self):
        r = copy.deepcopy(self.r); r['checkpoint']['path'] = self.adapter.CHECKPOINT['path']
        with self.assertRaises(ValueError): m.request_fields(r)

    def test_final_seeds_and_training_range_edges_rejected(self):
        for seed in (6210000, 5999999, 6130000 - m.GAMES, True):
            r = copy.deepcopy(self.r); r['seed'] = seed
            with self.subTest(seed=seed), self.assertRaises(ValueError): m.request_fields(r)

    def test_boolean_counts_and_partial_deckset_rejected(self):
        for key, value in [('formatVersion', True), ('passes', True), ('learnerDecks', self.r['learnerDecks'][:-1]),
            ('fullAll44AgainstAllFourRequiredAfterLearning', 1), ('finalBlindSeedsAuthorized', 0)]:
            r = copy.deepcopy(self.r); r[key] = value
            with self.subTest(key=key), self.assertRaises(ValueError): m.request_fields(r)

    def test_unknown_scope_and_changed_fp_rejected(self):
        for key, value in [('sourceCommit', 'other'), ('engineSha256', 'f' * 64), ('newFlag', True),
            ('learningRate', 3e-5), ('heuristicShare', 1.0)]:
            r = copy.deepcopy(self.r); r[key] = value
            with self.subTest(key=key), self.assertRaises(ValueError): m.request_fields(r)

    def test_failed_partial_or_boolean_whole_rejected(self):
        for code in (1, 143, False):
            p = copy.deepcopy(self.proof); p['actualWholeExitCode'] = code
            with self.subTest(code=code), self.assertRaises(ValueError): m.validate_imitation_proof(self.r, p)

    def test_wrong_actual_selected_cp_or_completion_rejected(self):
        p = copy.deepcopy(self.proof); p['report']['checkpoint']['sha256'] = 'f' * 64
        with self.assertRaises(ValueError): m.validate_imitation_proof(self.r, p)
        p = copy.deepcopy(self.proof); p['completionSha256'] = 'f' * 64
        with self.assertRaises(ValueError): m.validate_imitation_proof(self.r, p)

    def test_no_learning_epoch_and_fold_change_rejected(self):
        for key, value in [('selectedEpoch', 0), ('selectedEpoch', True), ('actualNewGames', 1),
            ('originalEpisodeFolds', {'training': 4025, 'validation': 807})]:
            p = copy.deepcopy(self.proof); p['report'][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError): m.validate_imitation_proof(self.r, p)

    def test_full_original_consumer_arguments_and_nonzero_exit(self):
        with patch.object(m.subprocess, 'run', return_value=subprocess.CompletedProcess([], 0, json.dumps(self.proof))) as run:
            m.imitation_proof(self.r)
            argv = run.call_args.args[0]
            self.assertIn('--closed', argv); self.assertIn(m.IMITATION_IDENTITY_SHA, argv)
            self.assertEqual(argv[-2:], ['--completion-sha', self.r['imitationCompletionSha256']])
        with patch.object(m.subprocess, 'run', side_effect=subprocess.CalledProcessError(1, ['synthetic-only'])):
            with self.assertRaises(subprocess.CalledProcessError): m.imitation_proof(self.r)

    def test_inherited_command_real_warm_adam_and_four_opponents(self):
        ns = m.namespace(self.r, self.adapter, self.raw)
        cmd = ns['command'](self.r, '/synthetic-qualified-source')
        self.assertEqual(cmd[cmd.index('--checkpoint') + 1], self.r['checkpoint']['path'])
        self.assertEqual(cmd[cmd.index('--games') + 1], '3872')
        self.assertEqual(cmd[cmd.index('--batch-games') + 1], '88')
        self.assertEqual(cmd.count('--opponent-checkpoint'), 4)
        self.assertEqual(ns['__file__'], str(SOURCE))
        self.assertNotIn('--evaluate', cmd)

    def test_every_deck_against_all44_both_seats(self):
        ns = m.namespace(self.r, self.adapter, self.raw)
        cells = ns['cells']({'decks': [{'version': v, 'sha256': 'f' * 64} for v in self.r['learnerDecks']]}, self.r['learnerDecks'])
        self.assertEqual(len(cells), 3872)
        self.assertEqual({c['learnerSeat'] for c in cells}, {0, 1})

    def test_unequal_inherited_bc_steps_allow_equal_positive_new_ppo_steps(self):
        ns = m.namespace(self.r, self.adapter, self.raw)
        before = {'weights': {f'p{i}': {'shape': [2], 'sha256': 'a', 'adamStep': 6632 + (2600 if i < 10 else 0)}
            for i in range(12)}, 'cudaInitialized': False, 'learningRate': 1e-5}
        after = copy.deepcopy(before)
        for value in after['weights'].values(): value.update(sha256='b', adamStep=value['adamStep'] + 24)
        after.update(savedGames=3872, savedSeed=self.r['seed'], trainingContinuation={
            'sourceCheckpoint': self.r['checkpoint'], 'initialLearningRate': 1e-5,
            'learningRate': 1e-5, 'learningRateOverride': 1e-5})
        after.update(path='/synthetic-output/checkpoint.pt', sha256='f' * 64)
        self.assertEqual(ns['tensor_delta'](before, after, self.r)['actualAdamUpdates'], 24)
        after['weights']['p11']['adamStep'] -= 1
        with self.assertRaises(ValueError): ns['tensor_delta'](before, after, self.r)


if __name__ == '__main__':
    unittest.main()
