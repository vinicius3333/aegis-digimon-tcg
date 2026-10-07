"""Four frozen paired Plutomon replays after actual closed mentor evaluation."""

import argparse
import ast
import hashlib
import importlib.util
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

LAB = '/home/vinicius/aegis-bot-lab'
NAME = 'rule-link-current-aa2e56463-mentor-choice-diagnosis-r1'
SOURCE = 'aa2e56463176046ea5a01419d271a53a164efbae'
ENGINE = '4536a92429c1b62041212e983b63f46206dd4f2eefe959d42b3cc1a7f13c6a2c'
BASE_NAME = 'rule-link-current-r4-choice-diagnosis.py'
BASE_SHA = '894e8bbb124b79f160cd2fd2789ee92ffc9e629d6b3ea91a7a656468002a8266'
PARENT_NAME = 'rule-link-current-aa2e56463-mentor-strength-r1'
PARENT_OPERATOR_SHA = 'cd88e566552384bf4a362a64abe4530e2f84e37545b25aac3c2112ed84a1c2aa'
LEARNING_COMPLETION = 'e5534944d5e0a7e6f2b131a388a9cfe98d7e99079a3b84d18db5dbd729706c86'
REFERENCE_RAW_SHA = '0c85c7d67ce6b68890e41620b7e27a9eb5762a1e7925ec62ecbabb8a8dff8246'
CHECKPOINTS = {
    'mentor-ppo-r1': {
        'path': '/home/vinicius/aegis-bot-lab/runs/rule-link-current-aa2e56463-mentor-ppo-r1/ppo/checkpoint.pt',
        'sha256': '712d01e7c6161ee28c3de20c9c02dd92f90bb21ae283d211489fa4d28c6d1405',
    },
    'v17-reference': {
        'path': '/home/vinicius/aegis-bot-lab/runs/rule-link-current-aa2e56463-bind/v17-reference.pt',
        'sha256': '3b9d75a50354a521c784e1ddc8ae7086717d6a36c8d786704f3632ebf5bf62b9',
    },
}
CELLS = [
    {'seed': 6135669, 'recipe': 'bt26-plutomon-bandai@1', 'seat': 1, 'mentor': 'v17-reference'},
    {'seed': 6136461, 'recipe': 'bt26-plutomon-bandai@1', 'seat': 1, 'mentor': 'v17-reference'},
]


def require(value: bool, reason: str) -> None:
    if not value:
        raise ValueError(reason)


def run_path() -> Path:
    return Path(LAB) / 'runs' / NAME


def request_fields(request: dict, operator_sha: str) -> None:
    for key in ('parentCompletionSha256', 'parentResultSha256'):
        require(type(request.get(key)) is str and re.fullmatch('[a-f0-9]{64}', request[key]) is not None,
            'Actual final evaluation completion/raw pins; no pending or partial admission')
    require(type(request.get('actualGames')) is int and type(request.get('actualUpdates')) is int,
        'Exact integer diagnostic game/update counts')
    require(request == {'purpose': 'frozen-four-game-mentor-choice-diagnosis', 'sourceCommit': SOURCE,
        'engineSha256': ENGINE, 'operatorSha256': operator_sha, 'run': str(run_path()),
        'checkpoints': CHECKPOINTS, 'cells': CELLS, 'actualGames': 4, 'actualUpdates': 0,
        'parentCompletionSha256': request['parentCompletionSha256'],
        'parentResultSha256': request['parentResultSha256'], 'finalBlindSeedsAuthorized': False,
        'wrapper': request.get('wrapper')}, 'Exact four query-only paired replays; no relabeling or new training')
    wrapper = request['wrapper']
    require(type(wrapper) is dict and set(wrapper) == {'path', 'sha256'}
        and wrapper['path'] == str(Path(LAB) / 'transfers' / (NAME + '-launch.sh'))
        and type(wrapper['sha256']) is str and re.fullmatch('[a-f0-9]{64}', wrapper['sha256']) is not None,
        'Exact external sealed diagnostic wrapper')


def validate_parent(proof: dict, request: dict) -> None:
    require(type(proof.get('actualWholeExitCode')) is int and proof['actualWholeExitCode'] == 0
        and proof['completionSha256'] == request['parentCompletionSha256'], 'Actual full closed evaluation consumer0')
    report = proof['report']
    require(report['sourceCommit'] == SOURCE and report['engineSha256'] == ENGINE
        and report['checkpoint'] == CHECKPOINTS['mentor-ppo-r1']
        and report['learningCompletionSha256'] == LEARNING_COMPLETION
        and type(report['actualNewLearningUpdates']) is int and report['actualNewLearningUpdates'] == 6756
        and type(report['actualLearningUpdates']) is int and report['actualLearningUpdates'] == 0
        and report['acceptedStrengthOrMastery'] is False and report['finalBlindSeedsConsumed'] is False
        and report['strengthGatePasses'] is False, 'Exact actually failed frozen mentor comparison; no scope acceptance')
    candidate = report['candidate']
    require(type(candidate['games']) is int and candidate['games'] == 3872
        and type(candidate['seed']) is int and candidate['seed'] == 6135000
        and len(candidate['byDeck']) == 44, 'Actual full all44 comparison, never partial totals')


def namespace(helper: Any, raw: str, request: dict) -> dict:
    request_fields(request, request['operatorSha256'])
    ns = dict(vars(helper))
    nodes = [node for node in ast.parse(raw).body if isinstance(node, ast.FunctionDef)]
    exec(compile(ast.Module(body=nodes, type_ignores=[]), str(Path(LAB) / 'transfers' / BASE_NAME), 'exec'), ns)
    ns.update(__file__=__file__, __doc__=__doc__, NAME=NAME, RUN=run_path(), CP=CHECKPOINTS, CELLS=CELLS,
        COMPLETION_SHA=request['parentCompletionSha256'])
    main_node = next(node for node in nodes if node.name == 'main')
    text = ast.get_source_segment(raw, main_node)
    require(text is not None and text.count("'r4'") == 3 and text.count('sameR4MentorFeatures') == 1,
        'Exact unchanged replay/choice/tensor/module/whole seams')
    exec(compile(text.replace("'r4'", "'mentor-ppo-r1'").replace('sameR4MentorFeatures',
        'sameCandidateMentorFeatures'), str(Path(LAB) / 'transfers' / BASE_NAME) + '-mentor-role', 'exec'), ns)

    def fields(actual: dict, operator_sha: str) -> None:
        request_fields(actual, operator_sha)
        require(actual == request, 'One exact externally sealed request')

    def parent_proof() -> dict:
        operator = Path(LAB) / 'transfers/rule-link-current-mentor-strength.py'
        ns['pin'](operator, PARENT_OPERATOR_SHA)
        result = subprocess.run([str(Path(LAB) / 'venv/bin/python'), '-B', str(operator), '--closed',
            '--request', str(Path(LAB) / 'transfers' / (PARENT_NAME + '-request.json')),
            '--request-sha', 'a237710ac5dee2ade5a67eddaf48e92e023356882010ba78b834f59e198d8f25',
            '--operator-sha', PARENT_OPERATOR_SHA,
            '--identity-sha', '0a42e8e9a16f1e592326c49cd6dd3f7ead34902ea78beb67f41d9f9589f0f3d8',
            '--go-sha', 'a078e47fe9d0a9470fe7f82cbf9bf50c40d048b7dc3b659b86db87a59063579f'],
            check=True, capture_output=True, text=True)
        proof = json.loads(result.stdout, object_pairs_hook=ns['unique'], parse_constant=ns['invalid'])
        validate_parent(proof, request)
        return proof

    def input_rows() -> dict:
        parent = Path(LAB) / 'runs' / PARENT_NAME
        ns['pin'](parent / 'completion.json', request['parentCompletionSha256'])
        completion = ns['read'](parent / 'completion.json')
        require(completion['outputs']['trained-candidate/results.json'] == request['parentResultSha256'],
            'Actual final raw map binding; no partial file substitution')
        paths = {'mentor-ppo-r1': parent / 'trained-candidate/results.json',
            'v17-reference': Path(LAB) / 'runs/rule-link-current-aa2e56463-strength/v17-reference/results.json'}
        pins = {'mentor-ppo-r1': request['parentResultSha256'], 'v17-reference': REFERENCE_RAW_SHA}
        records = {}
        for label, path in paths.items():
            ns['pin'](path, pins[label])
            rows = ns['read'](path)['episodes']
            require(len(rows) == 3872 and len({row['seed'] for row in rows}) == 3872, 'Full natural retained evaluation rows')
            records[label] = {row['seed']: row for row in rows}
        for cell in CELLS:
            row = records['mentor-ppo-r1'][cell['seed']]
            mentor = records[cell['mentor']][cell['seed']]
            ns['natural'](row)
            ns['natural'](mentor)
            require(row['learnerSeat'] == cell['seat'] and row['decks'][cell['seat']] == cell['recipe']
                and row['winnerSeat'] != cell['seat'] and mentor['winnerSeat'] == cell['seat']
                and all(row[key] == mentor[key] for key in ('decks', 'deckPins', 'learnerSeat', 'opponentName')),
                'Exact actual paired loss/reference win, no imagined diagnostic cell')
        return records

    def snapshot(actual: dict, args: argparse.Namespace) -> None:
        ns['pin'](Path(__file__), args.operator_sha)
        ns['pin'](args.request, args.request_sha)
        ns['pin'](Path(LAB) / 'transfers' / BASE_NAME, BASE_SHA)
        ns['pin'](Path(actual['wrapper']['path']), actual['wrapper']['sha256'])
        ns['pin'](Path(LAB) / 'transfers/rule-link-current-mentor-strength.py', PARENT_OPERATOR_SHA)
        ns['pin'](Path(LAB) / 'runs' / PARENT_NAME / 'completion.json', actual['parentCompletionSha256'])
        ns['pin'](Path(LAB) / 'runs' / PARENT_NAME / 'trained-candidate/results.json', actual['parentResultSha256'])
        ns['pin'](Path(LAB) / 'runs/rule-link-current-aa2e56463-strength/v17-reference/results.json', REFERENCE_RAW_SHA)
        ns['pin'](Path(LAB) / 'runs/rule-link-current-aa2e56463-prepare/runtime-files.json',
            '838414a949ba0b1dbc6dc192d23f41553f147387072852612fd1206f532175d0')
        for checkpoint in CHECKPOINTS.values():
            ns['pin'](Path(checkpoint['path']), checkpoint['sha256'])

    def approved(value: dict, args: argparse.Namespace) -> None:
        require(all(type(value.get(key)) is int for key in
            ('actualGamesAuthorized', 'actualLearningUpdatesAuthorized', 'maximumConcurrentGameWorkers')),
            'Exact typed diagnostic-only resource counts')
        require(value == {'phase': 'frozen-four-game-mentor-choice-diagnosis', 'requestSha256': args.request_sha,
            'operatorSha256': args.operator_sha, 'sourceReviewed': True, 'resourceAgreed': True,
            'actualGamesAuthorized': 4, 'actualLearningUpdatesAuthorized': 0,
            'maximumConcurrentGameWorkers': 1, 'finalBlindSeedsAuthorized': False}, 'Distinct ROOT four-game diagnosis Go')

    ns.update(request_fields=fields, parent_proof=parent_proof, input_rows=input_rows, snapshot=snapshot, approved=approved)
    return ns


def main() -> None:
    require(__debug__ and 'torch' not in sys.modules, 'Stdlib before actual completion/source/whole/resource/model admission')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--request', type=Path, required=True)
    parser.add_argument('--request-sha', required=True)
    parser.add_argument('--operator-sha', required=True)
    args, _ = parser.parse_known_args()
    base = Path(LAB) / 'transfers' / BASE_NAME
    require(base.is_file() and not any(path.is_symlink() for path in (base, *base.parents)), 'Regular immutable replay helper')
    require(hashlib.sha256(base.read_bytes()).hexdigest() == BASE_SHA, 'Exact unchanged replay helper bytes')
    spec = importlib.util.spec_from_file_location('mentor_unchanged_choice_replay', base)
    require(spec is not None and spec.loader is not None, 'Static helper loader')
    helper = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(helper)
    helper.pin(Path(__file__), args.operator_sha)
    helper.pin(args.request, args.request_sha)
    namespace(helper, base.read_text(encoding='utf-8'), helper.read(args.request))['main']()


if __name__ == '__main__':
    main()
