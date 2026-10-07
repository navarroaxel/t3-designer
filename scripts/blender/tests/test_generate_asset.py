"""Job boundary checks run without importing Blender or requiring a display."""
import copy
import importlib.util
import json
import math
from pathlib import Path
import tempfile
import unittest

SCRIPTS = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('generate_asset', SCRIPTS / 'generate_asset.py')
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)


class GenerateAssetTest(unittest.TestCase):
    def setUp(self):
        self.request = json.loads((SCRIPTS / 'fixtures/table-job.json').read_text())

    def test_job_is_metric_and_retains_provenance(self):
        request = worker.validate_request(self.request)
        self.assertEqual(request['dimensions'], [1.2, .75, .7])
        self.assertEqual(request['source']['dimensionalStatus'], 'estimated')

    def test_rejects_nonfinite_dimensions_units_and_unsafe_ids(self):
        for key, value in [('dimensions', [1, math.nan, 1]), ('dimensions', [1, True, 1]),
                           ('dimensions', [1, -1, 1]), ('dimensions', [1, 1]),
                           ('units', 'centimeters'), ('id', '../catalog'),
                           ('schemaVersion', True), ('kind', 'arbitrary-python')]:
            request = copy.deepcopy(self.request)
            request[key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                worker.validate_request(request)

    def test_legs_cannot_overlap_or_escape_top(self):
        self.request['parameters']['legInset'] = .3
        with self.assertRaisesRegex(ValueError, 'Legs overlap'):
            worker.validate_request(self.request)

    def test_invalid_material_and_provenance_rejected(self):
        for key, value in [('material', {'baseColor': 'wood', 'roughness': .5}),
                           ('material', {'baseColor': '#ffffff', 'roughness': math.inf}),
                           ('source', {'url': 'file:///etc/passwd', 'description': 'Example', 'dimensionalStatus': 'estimated'}),
                           ('source', {'url': 'https://name:secret@example.com/a', 'description': 'Example', 'dimensionalStatus': 'estimated'})]:
            request = copy.deepcopy(self.request)
            request[key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                worker.validate_request(request)

    def test_output_never_replaces_reference_or_prior_job(self):
        with self.assertRaisesRegex(ValueError, 'preserved sources'):
            worker.output_path(worker.ROOT / 'assets/blender/new-output')
        with tempfile.TemporaryDirectory() as temporary:
            with self.assertRaisesRegex(ValueError, 'already exists'):
                worker.output_path(temporary)
            self.assertEqual(worker.output_path(Path(temporary) / 'new-job'), (Path(temporary) / 'new-job').resolve())

    def test_support_surface_matches_the_top_in_web_axes(self):
        surface = worker.support_surfaces(self.request)[0]
        self.assertEqual(surface['position'], [0, .75, 0])
        self.assertEqual(surface['normal'], [0, 1, 0])
        self.assertAlmostEqual(surface['polygon'][0][0], -.596)
        self.assertAlmostEqual(surface['polygon'][0][1], -.346)

    def test_actual_export_validator_rejects_corrupt_glb(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / 'model.glb'
            path.write_bytes(b'not-a-glb')
            with self.assertRaisesRegex(ValueError, 'Export validation failed'):
                worker.audit_export(path, self.request['dimensions'])

    def test_the_ps5_job_is_valid_and_its_variant_is_checked(self):
        job = json.loads((SCRIPTS / 'jobs/ps5-job.json').read_text())
        self.assertEqual(worker.validate_request(job)['dimensions'], [.104, .39, .26])
        self.assertEqual(job['source']['dimensionalStatus'], 'manufacturer-specified')
        for variant in ('disc', 'digital'):
            job['parameters']['variant'] = variant
            worker.validate_request(job)
        job['parameters']['variant'] = 'slim'
        with self.assertRaises(ValueError):
            worker.validate_request(job)

    def test_the_dualsense_job_is_valid(self):
        job = json.loads((SCRIPTS / 'jobs/dualsense-job.json').read_text())
        self.assertEqual(worker.validate_request(job)['dimensions'], [.16, .066, .106])

    def test_the_fridge_job_is_valid_and_needs_its_freezer_height(self):
        job = json.loads((SCRIPTS / 'jobs/fridge-job.json').read_text())
        self.assertEqual(worker.validate_request(job)['dimensions'], [.675, 1.825, .668])
        job['parameters']['freezerHeight'] = 1.2
        with self.assertRaises(ValueError):
            worker.validate_request(job)

    def test_the_fridge_parts_and_kitchen_fixtures_have_valid_jobs(self):
        for name in ('main-board', 'desk', 'inverter', 'board', 'toilet', 'fridge-cabinet', 'fridge-door-lower', 'fridge-door-freezer', 'kitchen-sink', 'kitchen-tap'):
            job = json.loads((SCRIPTS / f'jobs/{name}-job.json').read_text())
            worker.validate_request(job)
        job['parameters']['part'] = 'bidet'
        with self.assertRaises(ValueError):
            worker.validate_request(job)

    def test_panel_parts_accept_roundness_and_bend_in_range(self):
        self.request['kind'] = 'procedural'
        part = {'name': 'Shell', 'shape': 'panel', 'dimensions': [.04, .37, .26], 'position': [0, .2, 0], 'rotation': [0, 0, 0],
                'color': '#f4f5f8', 'roughness': .3, 'metallic': 0, 'bevel': .004, 'roundness': .6, 'bend': 20}
        self.request['parameters'] = {'parts': [part]}
        self.assertEqual(worker.validate_request(self.request)['kind'], 'procedural')
        for key, value in [('bend', 120), ('roundness', 2)]:
            broken = {**part, key: value}
            self.request['parameters'] = {'parts': [broken]}
            with self.assertRaises(ValueError):
                worker.validate_request(self.request)

    def test_procedural_recipe_accepts_data_and_bounds_geometry_complexity(self):
        self.request['kind'] = 'procedural'
        part = {'name': 'Screen', 'shape': 'box', 'dimensions': [1.2, .7, .04],
                'position': [0, .4, 0], 'rotation': [0, 0, 0], 'color': '#121212',
                'roughness': .4, 'metallic': .1, 'bevel': .004}
        self.request['parameters'] = {'parts': [part]}
        self.assertEqual(worker.validate_request(self.request)['kind'], 'procedural')
        for key, value in [('shape', 'python'), ('rotation', [0, math.nan, 0]),
                           ('dimensions', [1, 0, 1]), ('bevel', 2), ('color', 'exec(code)')]:
            request = copy.deepcopy(self.request)
            request['parameters']['parts'][0][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                worker.validate_request(request)
        self.request['parameters']['parts'] = [part] * 129
        with self.assertRaises(ValueError):
            worker.validate_request(self.request)


if __name__ == '__main__':
    unittest.main()
