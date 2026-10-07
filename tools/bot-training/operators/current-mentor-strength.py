"""Full all44 frozen evaluation from actual closed mentor PPO; no pending model admission."""

import argparse
import ast
import hashlib
import importlib.util
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

LAB = Path('/home/vinicius/aegis-bot-lab')
NAME = 'rule-link-current-aa2e56463-mentor-strength-r1'
RUN = LAB / 'runs' / NAME
SOURCE = 'aa2e56463176046ea5a01419d271a53a164efbae'
ENGINE = '4536a92429c1b62041212e983b63f46206dd4f2eefe959d42b3cc1a7f13c6a2c'
BASE = LAB / 'transfers/rule-link-current-corrective-strength.py'
BASE_SHA = 'a7acf69c568ee73f6e733223fdbac03924f91168b518ddaa4097b00358eaa47e'
BASE_LEARNING_SHA = '0ea7565cbe7ee7514780033d3a5f2b470957f37a3602126f61e94f23c301b39c'
LEARNING = LAB / 'transfers/rule-link-current-mentor-ppo-custody.py'
LEARNING_SHA = '5a5b930671c35d2905e0e23fd6b906b47e6011b0c18912b3b376ebeb557924d9'
LEARNING_NAME = 'rule-link-current-aa2e56463-mentor-ppo-r1'
BASELINE_COMPLETION = 'b32675433481b354e965de11ed0e118f7c66aa7dc5c76326625f0ace22eff339'
REFERENCES = ('primary-before', 'v17-reference', 'source-challenger', 'fitted-reference')
GAMES = 3872
SEED = 6135000


def require(value: bool, reason: str) -> None:
    if not value:
        raise ValueError(reason)


def request_pins(r: dict) -> None:
    pins = r.get('learningCustody')
    require(type(pins) is dict and set(pins) == {'requestSha256', 'identitySha256', 'resourceGoSha256', 'completionSha256'}
        and all(type(v) is str and re.fullmatch('[a-f0-9]{64}', v) is not None for v in pins.values()),
        'Externally observed actual new PPO custody pins; no future or pending closure')
    require(pins['completionSha256'] == r.get('learningCompletionSha256'), 'One exact actual PPO completion')
    cp = r.get('checkpoint')
    require(type(cp) is dict and set(cp) == {'path', 'sha256'}
        and cp['path'] == str(LAB / 'runs' / LEARNING_NAME / 'ppo/checkpoint.pt')
        and type(cp['sha256']) is str and re.fullmatch('[a-f0-9]{64}', cp['sha256']) is not None,
        'Exact actual new native PPO checkpoint; no old model substitution')
    require(set(r) == {'formatVersion', 'purpose', 'sourceCommit', 'engineSha256', 'operatorSha256', 'run',
        'identity', 'resourceGo', 'wrapper', 'checkpoint', 'learningCustody', 'learningCompletionSha256',
        'baselineCompletionSha256', 'games', 'seed', 'finalBlindSeedsAuthorized'}, 'Exact frozen development evaluation scope')
    require(type(r['wrapper']) is dict and set(r['wrapper']) == {'path', 'sha256'}, 'Exact sealed wrapper fields')
    require(r['finalBlindSeedsAuthorized'] is False, 'No finalblind authorization')


def namespace(raw: str, r: dict) -> dict:
    request_pins(r)
    pins = r['learningCustody']
    learning_args = ['--request', str(LAB / 'transfers' / (LEARNING_NAME + '-request.json')),
        '--request-sha', pins['requestSha256'], '--operator-sha', LEARNING_SHA,
        '--identity-sha', pins['identitySha256'], '--go-sha', pins['resourceGoSha256']]
    ns = dict(__file__=__file__, __name__='mentor_unchanged_full_evaluation', __doc__=__doc__,
        argparse=argparse, hashlib=hashlib, importlib=importlib, json=json, os=os, re=re,
        subprocess=subprocess, sys=sys, Path=Path, Any=Any, LAB=LAB, NAME=NAME, RUN=RUN,
        SOURCE=SOURCE, ENGINE=ENGINE, LEARNING_SHA=LEARNING_SHA, LEARNING_ARGS=learning_args,
        BASE_LEARNING_SHA=BASE_LEARNING_SHA, BASELINE_COMPLETION=BASELINE_COMPLETION,
        REFERENCES=REFERENCES, GAMES=GAMES, SEED=SEED)
    nodes = [n for n in ast.parse(raw).body if isinstance(n, ast.FunctionDef)]
    exec(compile(ast.Module(body=nodes, type_ignores=[]), str(BASE), 'exec'), ns)
    edits = {
        'learning_fields': [
            ("records['games']==2112", "records['games']==3872"),
            ("records['seed']==6141352", "records['seed']==6029858"),
            ('corrective-ppo-r1/ppo/checkpoint.pt', 'mentor-ppo-r1/ppo/checkpoint.pt')],
        'context': [
            ("str(LAB/'transfers/rule-link-current-corrective-ppo.py')", "str(LAB/'transfers/rule-link-current-mentor-ppo-custody.py')"),
            ("learner=load(LAB/'transfers/rule-link-current-corrective-ppo.py',LEARNING_SHA,'evaluation_actual_learning')",
             "learner=load(LAB/'transfers/rule-link-current-mentor-ppo-custody.py',LEARNING_SHA,'evaluation_actual_learning')"),
            ("m=load(LAB/'transfers/rule-link-current-strength.py',learner.STRENGTH_SHA,'evaluation_original_strength')",
             "learner=load(LAB/'transfers/rule-link-current-corrective-ppo.py',BASE_LEARNING_SHA,'evaluation_unchanged_source_helpers')\n    m=load(LAB/'transfers/rule-link-current-strength.py',learner.STRENGTH_SHA,'evaluation_original_strength')")],
        'snapshot': [
            ("pin(LAB/'transfers/rule-link-current-corrective-ppo.py',LEARNING_SHA)",
             "pin(LAB/'transfers/rule-link-current-mentor-ppo-custody.py',LEARNING_SHA)"),
            ('corrective-ppo-r1/completion.json', 'mentor-ppo-r1/completion.json')],
    }
    for name, pairs in edits.items():
        node = next(n for n in nodes if n.name == name)
        text = ast.get_source_segment(raw, node)
        for old, new in pairs:
            require(text.count(old) == 1, 'Exact supported full evaluation seam: ' + name)
            text = text.replace(old, new)
        exec(compile(text, str(BASE) + '-mentor-' + name, 'exec'), ns)
    original_fields = ns['request_fields']
    original_snapshot = ns['snapshot']

    def fields(actual: dict) -> None:
        request_pins(actual)
        require(actual == r, 'Exact externally sealed request throughout admission')
        original_fields(actual)

    def snapshot(ctx: dict) -> None:
        ns['pin'](BASE, BASE_SHA)
        ns['pin'](LAB / 'transfers/rule-link-current-corrective-ppo.py', BASE_LEARNING_SHA)
        ns['pin'](LAB / 'transfers' / (LEARNING_NAME + '-request.json'), pins['requestSha256'])
        ns['pin'](LAB / 'transfers' / (LEARNING_NAME + '-identity.json'), pins['identitySha256'])
        ns['pin'](LAB / 'transfers' / (LEARNING_NAME + '-ROOT-go.json'), pins['resourceGoSha256'])
        original_snapshot(ctx)

    ns.update(request_fields=fields, snapshot=snapshot)
    fields(r)
    return ns


def main() -> None:
    require(__debug__ and 'torch' not in sys.modules, 'Stdlib before actual source/resource/model admission')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--request', type=Path, required=True)
    parser.add_argument('--request-sha', required=True)
    parser.add_argument('--operator-sha', required=True)
    args, _ = parser.parse_known_args()
    require(BASE.is_file() and not any(p.is_symlink() for p in (BASE, *BASE.parents)), 'Regular unchanged evaluation helper')
    require(hashlib.sha256(BASE.read_bytes()).hexdigest() == BASE_SHA, 'Exact qualified helper bytes')
    spec = importlib.util.spec_from_file_location('mentor_static_full_evaluation', BASE)
    require(spec is not None and spec.loader is not None, 'Evaluation helper loader')
    helper = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(helper)
    helper.pin(Path(__file__), args.operator_sha)
    helper.pin(args.request, args.request_sha)
    ns = namespace(BASE.read_text(encoding='utf-8'), helper.read(args.request))
    ns['main']()


if __name__ == '__main__':
    main()
