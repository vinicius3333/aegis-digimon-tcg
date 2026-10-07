"""Synthetic CPU guards only; no actual game, model, or completion evidence."""
import argparse
import copy
import importlib.util
import io
import json
import os
import subprocess
import unittest
from collections import Counter
from pathlib import Path
from unittest.mock import patch

path = Path(os.environ.get('AEGIS_TEACHER_VALIDATION_OPERATOR', str(Path(__file__).with_name('current-mentor-validation.py'))))
spec = importlib.util.spec_from_file_location('synthetic_teacher_supplement', path)
s = importlib.util.module_from_spec(spec)
spec.loader.exec_module(s)
static = argparse.Namespace(SOURCE='qualified-source', ENGINE='qualified-engine', NAME='original-data',
    unique=lambda pairs: dict(pairs), invalid=lambda x: (_ for _ in ()).throw(ValueError(x)))


def request():
    return {'purpose': 'fresh-current-source-natural-teacher-validation-only', 'sourceCommit': static.SOURCE,
        'engineSha256': static.ENGINE, 'operatorSha256': 'a'*64, 'run': str(s.RUN), 'games': 800, 'workers': 4,
        'seed': 6029058, 'dataCompletionSha256': s.DATA_COMPLETION, 'targetRecipes': list(s.TARGETS),
        'learnerSeat': 0, 'originalEpisodeIndexStride': 5, 'declaredFold': 'validation', 'requiredOriginalValidationTeacherBins': list(s.REQUIRED),
        'inventory': {'path': str(s.LAB/'transfers'/(s.NAME+'-seed-inventory.json')), 'sha256': 'b'*64},
        'wrapper': {'path': str(s.LAB/'transfers'/(s.NAME+'-launch.sh')), 'sha256': 'c'*64},
        'actualLearningUpdates': 0, 'primaryModelImportsAuthorized': False, 'finalBlindSeedsAuthorized': False}


def frame(label):
    return {'window': {'role':'learner','observation':{'seat':0},'teacher':{'action':label},'actions':[{},{}]},
        'action':label,'engineTeacherAction':label,'executedAction':0 if label is None else label,
        'supervised':label is not None,'learnerRecipe':s.TARGETS[0],'driver':'current-engine-teacher',
        'labelOrigin':'current-engine-teacher' if label is not None else 'unsupervised-legal-first-action-fallback'}


class Guards(unittest.TestCase):
    def test_schedule_preserves_original_folds_and_all_routes(self):
        bins=Counter((s.schedule(i)[0], 'validation' if s.dataset_index(i)%5==0 else 'training') for i in range(s.GAMES))
        for route in s.TARGETS:
            self.assertEqual(bins[route,'validation'],200)
            self.assertEqual(bins[route,'training'],0)
        self.assertTrue(all(s.schedule(i)[1]==0 for i in range(s.GAMES)))
        for index in (True,-1,800,0.0):
            with self.subTest(index=index),self.assertRaises(ValueError):s.schedule(index)

    def test_unavailable_teacher_executes_unsupervised_fallback(self):
        self.assertEqual(s.teacher_choice(frame(None)['window']),(None,0))
        self.assertIsNone(s.frame_label(frame(None),s.TARGETS[0]))
        bad=frame(None);bad['action']=0
        with self.assertRaises(ValueError):s.frame_label(bad,s.TARGETS[0])
        bad=frame(None);bad['supervised']=True
        with self.assertRaises(ValueError):s.frame_label(bad,s.TARGETS[0])

    def test_available_teacher_drives_exact_legal_index(self):
        for label in (0,1):
            self.assertEqual(s.teacher_choice(frame(label)['window']),(label,label))
            self.assertEqual(s.frame_label(frame(label),s.TARGETS[0]),label)
        for label in (True,-1,2,0.0):
            with self.subTest(label=label),self.assertRaises(ValueError):s.teacher_choice(frame(label)['window'])

    def test_recorded_boolean_and_driver_forgery_rejected(self):
        for key,value in [('action',False),('engineTeacherAction',False),('executedAction',False),
            ('supervised',1),('driver','frozen-policy'),('learnerRecipe','other'),('labelOrigin','frozen-policy')]:
            bad=frame(0);bad[key]=value
            with self.subTest(key=key),self.assertRaises(ValueError):s.frame_label(bad,s.TARGETS[0])

    def test_opponent_seat_and_absent_teacher_rejected(self):
        for key,value in [('role','opponent'),('observation',{'seat':1}),('observation',{'seat':False}),('actions',[])]:
            bad=frame(0)['window'];bad[key]=value
            with self.assertRaises(ValueError):s.teacher_choice(bad)
        bad=frame(0)['window'];bad.pop('teacher')
        with self.assertRaises(ValueError):s.teacher_choice(bad)

    def test_exact_source_scope_and_final_seeds_rejected(self):
        s.request_fields(static,request(),'a'*64)
        for key,value in [('seed',6210000),('seed',6135000),('games',False),('games',801),('workers',5),
            ('actualLearningUpdates',False),('actualLearningUpdates',1),('learnerSeat',False),
            ('primaryModelImportsAuthorized',True),('primaryModelImportsAuthorized',0),('finalBlindSeedsAuthorized',True),('sourceCommit','old'),('declaredFold','training'),('originalEpisodeIndexStride',1),('originalEpisodeIndexStride',True),
            ('engineSha256','old'),('dataCompletionSha256',None),('targetRecipes',list(reversed(s.TARGETS)))]:
            r=request();r[key]=value
            with self.subTest(key=key,value=value),self.assertRaises(ValueError):s.request_fields(static,r,'a'*64)
        for key in ('inventory','wrapper'):
            r=request();r[key]['path']='/tmp/unbound'
            with self.assertRaises(ValueError):s.request_fields(static,r,'a'*64)

    def test_original_actual_consumer_command_and_pending_rejection(self):
        proof={'actualWholeExitCode':0,'completionSha256':s.DATA_COMPLETION,
            'report':{'games':3872,'all181VisibleBothSeats':True,'acceptedStrengthOrMastery':False}}
        with patch.object(s.subprocess,'run',return_value=argparse.Namespace(stdout=json.dumps(proof))) as run:
            self.assertEqual(s.predecessor(static),proof)
            args=run.call_args.args[0]
            self.assertIn('--closed',args);self.assertEqual(args[-1],s.DATA_COMPLETION)
            self.assertTrue(run.call_args.kwargs['check'])
        for key,value in [('actualWholeExitCode',False),('actualWholeExitCode',1),('completionSha256','future')]:
            bad=copy.deepcopy(proof);bad[key]=value
            with patch.object(s.subprocess,'run',return_value=argparse.Namespace(stdout=json.dumps(bad))),self.assertRaises(ValueError):
                s.predecessor(static)

    def test_consumer_failure_retains_actual_stderr(self):
        failure=subprocess.CalledProcessError(1,['consumer'],stderr='actual failed custody')
        out=io.StringIO()
        with patch.object(s.subprocess,'run',side_effect=failure),patch.object(s.sys,'stderr',out),self.assertRaises(ValueError):
            s.predecessor(static)
        self.assertEqual(out.getvalue(),'actual failed custody')

    def test_resource_go_is_cpu_only_exact_request(self):
        a=argparse.Namespace(go_sha='g',request_sha='r',operator_sha='a'*64)
        good={'phase':request()['purpose'],'requestSha256':'r','operatorSha256':'a'*64,
            'dataCompletionSha256':s.DATA_COMPLETION,'sourceReviewed':True,'resourceAgreed':True,'cpuOnly':True,
            'actualGamesAuthorized':800,'maximumConcurrentGameWorkers':4,'declaredFold':'validation','originalEpisodeIndexStride':5,'seed':6029058,
            'actualLearningUpdatesAuthorized':0,'primaryModelImportsAuthorized':False,'finalBlindSeedsAuthorized':False}
        m=argparse.Namespace(pin=lambda *a:None,read=lambda p:good)
        s.approved(m,request(),a)
        for key,value in [('cpuOnly',False),('cpuOnly',1),('sourceReviewed',1),('requestSha256','other'),('declaredFold','training'),('originalEpisodeIndexStride',1),('actualLearningUpdatesAuthorized',False),
            ('actualLearningUpdatesAuthorized',1),('primaryModelImportsAuthorized',True),('resourceAgreed',False)]:
            bad=dict(good,**{key:value});m.read=lambda p:bad
            with self.assertRaises(ValueError):s.approved(m,request(),a)
        a.go_sha=None
        with self.assertRaises(ValueError):s.approved(m,request(),a)

    def test_report_reads_declared_validation_indexes_and_exact_config(self):
        label_path=path.parent.parent/'learning_mechanisms.py'
        if not label_path.is_file():label_path=Path(os.environ['AEGIS_QUALIFIED_LEARNING_MECHANISMS'])
        spec=importlib.util.spec_from_file_location('synthetic_validation_real_labels',label_path)
        labels=importlib.util.module_from_spec(spec);spec.loader.exec_module(labels)
        metadata={'synthetic':True};scope={'decks':[{'version':recipe,'sha256':'e'*64} for recipe in s.TARGETS]}
        cfg={'metadata':metadata,'curriculum':scope,'featureVersion':7,'seed':6029058,'games':4,'workers':4,
            'learnerDriver':'current-engine-teacher','sourceCommit':static.SOURCE,'targetRecipes':list(s.TARGETS),
            'learnerSeat':0,'originalEpisodeIndexStride':5,'declaredFold':'validation','sourceCheckpoint':None,'device':None}
        manifest=Path('/synthetic/prepared/manifest.json');data=s.RUN/'dataset';records=[];contents={}
        for i in range(4):
            recipe,seat=s.schedule(i);f=frame(0);f['learnerRecipe']=recipe
            action={'intent':{'type':'dnaDigivolve'}}
            if i%2:
                f['window']['kind']='selectCards';f['window']['request']={'options':{'digiXrosCardId':'BT19-063'}}
                action={'intent':{'type':'respondDecision','response':{'kind':'selectCards','instanceIds':['synthetic-material']}}}
            f['window']['actions']=[action,{'intent':{'type':'endTurn'}}]
            contents[f'episode-{i*5:05d}.jsonl']=json.dumps(f)+'\n'
            config={'seed':6029058+i,'decks':[recipe,recipe],'deckPins':[scope['decks'][i],scope['decks'][i]],
                'learnerSeat':seat,'teacher':True,'maxDecisions':4000,'turnLimit':60,'engineSha256':static.ENGINE}
            records.append({'index':i,'originalDatasetIndex':i*5,'config':config,'complete':True,'decisions':1,
                'engineTeacherUnavailable':0,'result':{'decisions':1,'winnerSeat':1,'recoveredPlayRejections':0}})
        def read(p):
            if p==data/'config.json':return cfg
            if p==data/'results.json':return records
            if p==manifest.parent/'metadata.log':return metadata
            if p==manifest.parent/'curriculum.log':return scope
            i=int(p.name.split('-')[1].split('.')[0])//5
            return records[i]
        helper=argparse.Namespace(CHECKOUT=Path('/synthetic/source'),MODULE_SHA={'learning_mechanisms':'synthetic'},
            SOURCE=static.SOURCE,ENGINE=static.ENGINE,MANIFEST=manifest,read=read,load=lambda *a:labels,
            safe=lambda p:None,natural=lambda row:None,unique=lambda pairs:dict(pairs),invalid=lambda x:None)
        with patch.object(s,'GAMES',4),patch.object(Path,'open',lambda p,**k:io.StringIO(contents[p.name])), patch.object(Path,'glob',return_value=[]),patch.object(Path,'rglob',return_value=[]):
            actual=s.report(helper,{'seed':6029058})
            self.assertEqual(actual['originalIndexModuloFiveEngineTeacherCounts']['training'],{})
            self.assertEqual(actual['originalIndexModuloFiveEngineTeacherCounts']['validation'],{'dnaDigivolve:seat0':2,'effectDigiXrosMaterial:seat0':2})
            self.assertTrue(actual['requiredValidationTeacherBinsCovered'])
            self.assertEqual(actual['losses'],4)
            cfg['declaredFold']='training'
            with self.assertRaises(ValueError):s.report(helper,{'seed':6029058})
            cfg['declaredFold']='validation';records[0]['originalDatasetIndex']=False
            with self.assertRaises(ValueError):s.report(helper,{'seed':6029058})



if __name__=='__main__':
    unittest.main()
