"""Apply Impact Pack PR #1233's one-line string-ID fix; no node IDs or workflows change."""
import argparse
from datetime import datetime
import os
from pathlib import Path
import re
import shutil
import tempfile

CALL = r"node\.connect\(\s*link_info\.origin_slot\s*,\s*{target}\s*,\s*(['\"])input1\1\s*\)\s*;?"
BAD = re.compile(r"^[ \t]*" + CALL.format(target=r"node\.id") + r"[ \t]*$", re.MULTILINE)
GOOD = re.compile(r"^[ \t]*" + CALL.format(target="node") + r"[ \t]*$", re.MULTILINE)


def target_file(location):
    path = Path(location).resolve()
    if path.is_file() and path.name == "impact-pack.js":
        return path
    direct = path / "js" / "impact-pack.js"
    if direct.is_file():
        return direct.resolve()
    custom = path / "custom_nodes" if (path / "custom_nodes").is_dir() else path
    matches = [p / "js" / "impact-pack.js" for p in custom.iterdir()
               if p.is_dir() and p.name.lower().replace("_", "-") == "comfyui-impact-pack"
               and (p / "js" / "impact-pack.js").is_file()]
    if len(matches) != 1:
        raise ValueError("找不到唯一的 Impact Pack；请传入它的实际目录或 js/impact-pack.js 文件。")
    return matches[0].resolve()


def repair(location):
    target = target_file(location)
    raw = target.read_bytes()
    text = raw.decode("utf-8-sig")
    # Preserve Windows line endings while matching complete executable statement lines.
    canonical = text.replace("\r\n", "\n")
    bad, good = list(BAD.finditer(canonical)), list(GOOD.finditer(canonical))
    if not bad and len(good) == 1:
        return {"status": "already_fixed", "target": str(target)}
    if len(bad) != 1 or good:
        raise ValueError("未找到唯一的已知错误语句，版本可能不同或已经使用其它修复；未修改任何文件。")
    patched = BAD.sub(lambda match: match.group().replace("node.id", "node", 1), canonical, count=1)
    if "\r\n" in text:
        patched = patched.replace("\n", "\r\n")
    encoded = (b"\xef\xbb\xbf" if raw.startswith(b"\xef\xbb\xbf") else b"") + patched.encode("utf-8")
    backup = target.with_name(target.name + ".findInputSlot-" + datetime.now().strftime("%Y%m%d-%H%M%S-%f") + ".bak")
    shutil.copy2(target, backup)
    handle, temporary = tempfile.mkstemp(prefix=".impact-connect-", suffix=".tmp", dir=target.parent)
    try:
        with os.fdopen(handle, "wb") as stream:
            stream.write(encoded)
        os.replace(temporary, target)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    return {"status": "fixed", "target": str(target), "backup": str(backup)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="关闭 ComfyUI 后运行；修复 Impact Pack 的 findInputSlot 导入异常。")
    parser.add_argument("location", nargs="?", default=str(Path(__file__).resolve().parents[2]),
                        help="ComfyUI、custom_nodes、Impact Pack 目录，或 impact-pack.js 文件")
    options = parser.parse_args()
    try:
        result = repair(options.location)
        if result["status"] == "already_fixed":
            print("该语句已修复，未重复修改。")
        else:
            print("已应用上游 PR #1233 的一行修复：" + result["target"])
            print("原文件备份：" + result["backup"])
        print("请重启 ComfyUI、浏览器 Ctrl+F5，再重新打开干净的工作流。")
    except Exception as error:
        raise SystemExit(str(error))
