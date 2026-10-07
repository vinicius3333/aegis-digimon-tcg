"""Bounded synthetic guards; no real model, game, dataset, or qualification proof."""

import argparse
import ast
import copy
import importlib.util
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

operator = Path(os.environ.get('AEGIS_MENTOR_COLLECTION_OPERATOR', str(Path(__file__).with_name('current-mentor-collection.py'))))
spec = importlib.util.spec_from_file_location('synthetic_mentor_collection', operator)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def window(actions, seat=0):
    return {'kind': 'main', 'role': 'learner', 'observation': {'seat': seat}, 'actions': actions}


def request():
    return {'purpose': 'fresh-current-source-mentored-demonstrations', 'sourceCommit': m.SOURCE, 'engineSha256': m.ENGINE,
        'operatorSha256': 'a' * 64, 'run': str(m.RUN), 'checkpoints': copy.deepcopy(m.CP), 'games': m.GAMES,
        'workers': 4, 'actualUpdates': 0, 'seed': 6023848, 'mentorsByRecipe': {f'recipe-{i}': 'r4' for i in range(44)},
        'parentCompletionSha256': m.PARENT_COMPLETION, 'baselineCompletionSha256': m.BASELINE_COMPLETION,
        'inventory': {'path': str(m.LAB / 'transfers' / (m.NAME + '-seed-inventory.json')), 'sha256': 'b' * 64},
        'wrapper': {'path': str(m.LAB / 'transfers' / (m.NAME + '-launch.sh')), 'sha256': 'c' * 64},
        'finalBlindSeedsAuthorized': False}


class Guards(unittest.TestCase):
    def test_material_teacher_overrides_frozen_policy(self):
        w = window([{'intent': {'type': 'attack'}}, {'intent': {'type': 'appFusion'}}])
        actual = m.choose_label(w, 0, 1, lambda w, i: w['actions'][i]['intent']['type'], ('appFusion',))
        self.assertEqual(actual, (1, 'current-engine-compound-material-teacher'))

    def test_generic_teacher_does_not_overwrite_selected_policy(self):
        w = window([{'intent': {'type': 'attack'}}, {'intent': {'type': 'digivolve'}}])
        self.assertEqual(m.choose_label(w, 0, 1, lambda w, i: 'digivolve', ('appFusion',)), (0, 'frozen-best-qualified-policy'))

    def test_unavailable_teacher_preserves_explicit_frozen_origin(self):
        self.assertEqual(m.choose_label(window([{}]), 0, None, lambda w, i: self.fail('unavailable teacher was classified'), ()),
            (0, 'frozen-best-qualified-policy'))

    def test_invalid_teacher_and_mentor_rejected(self):
        for mentor, teacher in [(0, True), (0, -1), (0, 2), (True, None), (-1, None), (2, None)]:
            with self.subTest(mentor=mentor, teacher=teacher), self.assertRaises(ValueError):
                m.choose_label(window([{}]), mentor, teacher, lambda w, i: 'x', ())

    def test_opponent_and_false_seat_not_supervised(self):
        for field, value in [('role', 'opponent'), ('observation', {'seat': True}), ('observation', {'seat': 2})]:
            w = window([{}]);w[field] = value
            with self.assertRaises(ValueError):
                m.choose_label(w, 0, None, lambda w, i: 'x', ())

    def test_exact_scope_and_reject_changes(self):
        m.request_fields(request(), 'a' * 64)
        for key, value in [('seed', 6135000), ('seed', 6210000), ('games', 88), ('workers', 5),
            ('actualUpdates', False), ('actualUpdates', 1), ('sourceCommit', 'old'), ('parentCompletionSha256', None),
            ('finalBlindSeedsAuthorized', True)]:
            r = request();r[key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                m.request_fields(r, 'a' * 64)

    def test_changed_reference_and_incomplete_mentor_scope(self):
        r = request();r['checkpoints']['r4']['sha256'] = 'd' * 64
        with self.assertRaises(ValueError):m.request_fields(r, 'a' * 64)
        r = request();r['mentorsByRecipe'].pop('recipe-0')
        with self.assertRaises(ValueError):m.request_fields(r, 'a' * 64)
        r = request();r['mentorsByRecipe']['recipe-0'] = 'new-unqualified-model'
        with self.assertRaises(ValueError):m.request_fields(r, 'a' * 64)

    def test_no_overlap_or_partial_seed_scanner(self):
        good = {'seed': 6023848, 'games': m.GAMES, 'excludedThisNewRun': str(m.RUN), 'roots': ['runs', 'validations'],
            'freshAtStart': True, 'observedOverlap': [], 'observedScheduleFiles': [{'path': 'actual-path'}]}
        m.inventory_fields(good, 6023848)
        for key, value in [('observedOverlap', [6023848]), ('freshAtStart', False), ('roots', ['runs']),
            ('excludedThisNewRun', 'different'), ('observedScheduleFiles', []), ('seed', True)]:
            with self.assertRaises(ValueError):m.inventory_fields(dict(good, **{key: value}), 6023848)

    def test_natural_losses_and_recoveries_retained(self):
        row = {'type': 'result', 'terminated': True, 'truncated': False, 'reason': 'security', 'winnerSeat': 1,
            'decisions': 30, 'errors': [], 'rejections': [], 'asyncRejections': [], 'recoveredPlayRejections': 2}
        m.natural(row)
        for key, value in [('reason', 'surrender'), ('truncated', True), ('decisions', 4000), ('winnerSeat', True),
            ('rejections', ['bad']), ('trainingForfeit', {})]:
            with self.assertRaises(ValueError):m.natural(dict(row, **{key: value}))

    def test_real_material_selection_classifier(self):
        path = operator.parent.parent / 'learning_mechanisms.py'
        if not path.is_file():
            path = Path(os.environ['AEGIS_QUALIFIED_LEARNING_MECHANISMS'])
        spec = importlib.util.spec_from_file_location('synthetic_actual_label_classifier', path)
        helper = importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)
        w = {'kind': 'selectCards', 'role': 'learner', 'observation': {'seat': 1}, 'selected': [],
            'actions': [{'intent': {'type': 'respondDecision', 'decisionId': 'assembly', 'response': {'kind': 'selectCards', 'instanceIds': ['real-material']}}}]}
        self.assertEqual(m.choose_label(w, 0, 0, helper.label_mechanism, helper.MECHANISMS)[1], 'current-engine-compound-material-teacher')
        w['actions'][0]['intent']['response']['instanceIds'] = []
        self.assertEqual(m.choose_label(w, 0, 0, helper.label_mechanism, helper.MECHANISMS)[1], 'frozen-best-qualified-policy')

    def test_symlink_and_duplicate_json_rejected(self):
        with tempfile.TemporaryDirectory() as name:
            root = Path(name);self.assertTrue(root.exists());root = root.resolve()
            real = root / 'real';real.write_text('{}', encoding='utf-8');link = root / 'link';link.symlink_to(real)
            with self.assertRaises(ValueError):m.digest(link)
        with self.assertRaises(ValueError):m.unique([('x', 1), ('x', 2)])
        with self.assertRaises(ValueError):m.invalid('NaN')

    def test_frozen_tensor_names_hashes_and_all_module_pins_required(self):
        modules = {name: {'path': str(m.CHECKOUT / 'tools/bot-training' / (name + '.py')), 'sha256': sha}
            for name, sha in m.MODULE_SHA.items()}
        tensors = {name: {key: 'd' * 64 for key in m.PARAMETERS} for name in m.CP}
        proof = {'checkpoints': copy.deepcopy(m.CP), 'before': copy.deepcopy(tensors), 'after': copy.deepcopy(tensors),
            'actualLearningUpdates': 0, 'allFinite': True, 'actualPython': '3.12.14', 'torchVersion': '2.7.1+cu128',
            'device': 'cuda', 'modulePaths': copy.deepcopy(modules)}
        m.frozen_fields(proof, modules)
        bad = copy.deepcopy(proof);bad['modulePaths'] = {}
        with self.assertRaises(ValueError):m.frozen_fields(bad, modules)
        bad = copy.deepcopy(proof);bad['modulePaths']['train']['path'] = '/other/train.py'
        with self.assertRaises(ValueError):m.frozen_fields(bad, modules)
        for change in ('rename', 'invalid-hash', 'changed-tensor'):
            bad = copy.deepcopy(proof)
            key = next(iter(m.PARAMETERS))
            if change == 'rename':
                for side in ('before', 'after'):bad[side]['r4']['extra'] = bad[side]['r4'].pop(key)
            elif change == 'invalid-hash':
                for side in ('before', 'after'):bad[side]['r4'][key] = 'not-a-hash'
            else:bad['after']['r4'][key] = 'e' * 64
            with self.subTest(change=change), self.assertRaises(ValueError):m.frozen_fields(bad, modules)

    def test_cuda_child_finishes_before_idle_and_post_consumer(self):
        tree = ast.parse(operator.read_text(encoding='utf-8'))
        main = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == 'main')
        text = ast.get_source_segment(operator.read_text(encoding='utf-8'), main)
        self.assertNotIn('import torch', text)
        # Exercise the actual phase tail with fake collector/consumer boundaries.
        start = text.index('    subprocess.run(cmd, check=True)')
        tail = ast.parse('def phase_tail():\n' + text[start:])
        calls = []
        ns = dict(subprocess=argparse.Namespace(run=lambda cmd, check: calls.append('collector-exit0')), cmd=[],
            idle=lambda: calls.append('idle-after-child'), snapshot=lambda r, a: calls.append('source-cp-guard'),
            request={}, args=argparse.Namespace(request_sha='r', operator_sha='o', identity_sha='i', go_sha='g'),
            parent_proof=lambda: calls.append('post-parent') or {'actual': 0}, proof={'actual': 0}, require=m.require,
            write=lambda p, v: None, RUN=Path('/synthetic'), data_report=lambda r: {'eligibleForMechanismResampling': False},
            digest=lambda p: 'sha', file_map=lambda: {}, print=lambda *a, **k: None, json=json)
        exec(compile(tail, 'synthetic-phase-boundary', 'exec'), ns);ns['phase_tail']()
        self.assertEqual(calls[:4], ['collector-exit0', 'idle-after-child', 'source-cp-guard', 'post-parent'])
        calls.clear()
        ns['subprocess'] = argparse.Namespace(run=lambda *a, **k: (_ for _ in ()).throw(ValueError('actual child failed')))
        with self.assertRaises(ValueError):ns['phase_tail']()
        self.assertEqual(calls, [])


if __name__ == '__main__':
    unittest.main()
