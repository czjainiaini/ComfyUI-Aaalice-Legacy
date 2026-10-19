import asyncio
import functools
import importlib.util
import sys
import types
import unittest
from pathlib import Path


class MetadataScopeTests(unittest.IsolatedAsyncioTestCase):
    async def test_modern_calls_bypass_legacy_hooks_and_context_does_not_leak(self):
        root = Path(__file__).resolve().parents[1]
        package = types.ModuleType("coexist_test_package")
        package.NODE_CLASS_MAPPINGS = {"AaaliceLegacy_SimpleStringSplit": object()}
        sys.modules[package.__name__] = package
        spec = importlib.util.spec_from_file_location(package.__name__ + ".coexistence", root / "coexistence.py")
        helper = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(helper)
        calls = []
        execution = types.SimpleNamespace()

        async def original_map(name, *, v3_data=None):
            await asyncio.sleep(0)
            return name, v3_data

        @functools.wraps(original_map)
        async def legacy_map(name, **kwargs):
            calls.append(("map", name))
            return await original_map(name, **kwargs)

        async def original_execute(server, dynprompt):
            await asyncio.sleep(0)
            return await execution._async_map_node_over_list(dynprompt["1"]["class_type"], v3_data="untouched")

        @functools.wraps(original_execute)
        async def legacy_execute(server, dynprompt):
            calls.append(("execute", dynprompt["1"]["class_type"]))
            return await original_execute(server, dynprompt)

        execution.execute = legacy_execute
        execution._async_map_node_over_list = legacy_map
        helper.scope_metadata_hooks(execution, "_async_map_node_over_list")
        old = {"1": {"class_type": "AaaliceLegacy_SimpleStringSplit"}}
        new = {"1": {"class_type": "SimpleStringSplit"}}
        results = await asyncio.gather(execution.execute(None, old), execution.execute(None, new))
        self.assertEqual(results, [("AaaliceLegacy_SimpleStringSplit", "untouched"), ("SimpleStringSplit", "untouched")])
        self.assertEqual(calls, [("execute", "AaaliceLegacy_SimpleStringSplit"), ("map", "AaaliceLegacy_SimpleStringSplit")])
        self.assertFalse(helper._active.get())
        sys.modules.pop(package.__name__, None)


if __name__ == "__main__":
    unittest.main()
