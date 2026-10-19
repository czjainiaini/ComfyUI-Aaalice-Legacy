import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("impact_repair", Path(__file__).resolve().parents[1] / "tools/fix_impact_connect.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class RepairTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.target = self.root / "custom_nodes/comfyui-impact-pack/js/impact-pack.js"
        self.target.parent.mkdir(parents=True)

    def tearDown(self):
        self.temp.cleanup()

    def test_backup_and_one_line_fix_preserve_bom_and_windows_line_endings(self):
        original = b"\xef\xbb\xbf// comment\r\n  node.connect(link_info.origin_slot, node.id, 'input1');\r\n"
        self.target.write_bytes(original)
        result = module.repair(self.root)
        self.assertEqual(self.target.read_bytes(), original.replace(b"node.id", b"node"))
        self.assertEqual(Path(result["backup"]).read_bytes(), original)
        self.assertEqual(module.repair(self.root)["status"], "already_fixed")
        self.assertEqual(len(list(self.target.parent.glob("*.bak"))), 1)

    def test_unknown_or_duplicate_call_sites_are_not_modified(self):
        for original in (b"// no matching call\n", b"node.connect(link_info.origin_slot, node.id, 'input1');\n" * 2):
            self.target.write_bytes(original)
            with self.assertRaises(ValueError):
                module.repair(self.root)
            self.assertEqual(self.target.read_bytes(), original)
            self.assertFalse(list(self.target.parent.glob("*.bak")))

    def test_commented_out_call_is_not_mistaken_for_executable_code(self):
        self.target.write_text("// node.connect(link_info.origin_slot, node.id, 'input1');\n")
        with self.assertRaises(ValueError):
            module.repair(self.root)


if __name__ == "__main__":
    unittest.main()
