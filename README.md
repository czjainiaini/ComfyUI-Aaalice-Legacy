# ComfyUI-Aaalice-Legacy

[English](README.en.md) · 简体中文

这是 [ComfyUI-Danbooru-Gallery](https://github.com/Aaalice233/ComfyUI-Danbooru-Gallery) 的非官方维护 Fork，保留旧 Illustrious / NoobAI 工作流所需的节点，并解决它与官方 [ComfyUI-Aaalice-Nodes](https://github.com/Aaalice233/ComfyUI-Aaalice-Nodes) 的节点身份冲突。

原作者：Aaalice233。Fork 维护者：czjainiaini。沿用原项目 MIT 许可。本 Fork 的默认维护分支是 **`coexistence`**。

## 安装

1. 关闭 ComfyUI，备份旧包的词库、预设和原工作流。
2. 把原 `ComfyUI-Danbooru-Gallery` 移到 `custom_nodes` 外保留备份，或通过 Manager 禁用。**不要同时启用原旧包与本 Fork**。官方新版 `ComfyUI-Aaalice-Nodes` 保持原样，不需要打补丁。
3. 在 `ComfyUI/custom_nodes` 目录克隆：

```bash
git clone --branch coexistence https://github.com/czjainiaini/ComfyUI-Aaalice-Legacy.git
```

4. 使用 **ComfyUI 所用的 Python** 安装 `ComfyUI-Aaalice-Legacy/requirements.txt` 中的依赖。Windows 便携版示例（在便携版根目录运行）：

```powershell
.\python_embeded\python.exe -m pip install -r .\ComfyUI\custom_nodes\ComfyUI-Aaalice-Legacy\requirements.txt
```

5. 按相对路径迁移旧包的运行配置，例如 `py/prompt_selector/data.json` 词库及各功能目录的 `settings.json`。不要用旧源码覆盖本 Fork。
6. 启动 ComfyUI，硬刷新浏览器，直接导入原工作流。安装或更新后重启一次即可，日常切换新旧工作流无需重启。

## 更新

`1.0.2` 修复提示词选择器因历史来源标记或空的新版默认状态而误报“新旧接口证据冲突”（例如节点 3500）；优先使用真实保存状态判定版本。

```bash
git -C ComfyUI-Aaalice-Legacy pull --ff-only
```

只有本 Fork 需要从这里更新；新版节点继续按作者原来的方式更新。工作流、模型和其它插件不由此仓库下载或升级。

## 共存修复

旧包与新版复用了五个全局节点 ID，且旧前端继续按这些 ID 修改控件。本 Fork 给旧实现独立身份：

| 原旧节点 ID | 本 Fork 的节点 ID |
| --- | --- |
| PromptSelector | AaaliceLegacy_PromptSelector |
| GroupIsEnabled | AaaliceLegacy_GroupIsEnabled |
| SimpleNotify | AaaliceLegacy_SimpleNotify |
| SimpleStringSplit | AaaliceLegacy_SimpleStringSplit |
| FetchFromKrita | AaaliceLegacy_FetchFromKrita |

- 新版原 ID 和实现不变，旧版前端仅绑定旧身份。
- 导入完整画布 JSON 时，根据节点接口、来源标识和保存结构自动转换旧节点身份，包括子图定义。原文件、模型配置、连线、控件值不改写。
- 旧元数据执行钩子仅介入含旧节点的任务；现代任务直接委托原执行函数，使用 ContextVar 隔离执行上下文。
- 本 Fork 使用独立包名和扩展标识；样式文件从自身位置解析，可与未经修改的新版同时安装。
- 其余旧节点保留，包括参数面板、参数展开、枚举切换、提示词清理、多角色编辑和旧保存功能。

## 验证与边界

已验证：Windows / ComfyUI 0.39.0 / 前端 1.53.10 / CPU 下，与未经修改的 `ComfyUI-Aaalice-Nodes` 0.18.6（提交 `2395128`）共存；具体记录见 [VALIDATION.md](VALIDATION.md)。

这不表示旧包所有历史问题都已修复，也不表示完整 LL 出图已经验收。完整 GPU 推理、外部 LLM、画廊联网、全部元数据和 Krita 编辑仍需在实际运行环境验证。

自动转换覆盖完整画布 JSON；片段粘贴、局部合并、API prompt JSON 和 App Mode 不在保证范围内。无法确定版本的重名节点会报错，不猜测。混用两包保存后已经损坏的数据不能凭空恢复，请优先导入干净原工作流。

同一可视组只交给一套管理器控制，避免旧组管理器与新版 QuickGroupManager 争用节点 mode。旧包自己的弃用提示、缺依赖和宿主版本兼容问题仍需单独处理。

## Impact Pack 的 findInputSlot 导入错误

`1.0.3` 增加一个**手动运行**的修复工具，用于 `/extensions/ComfyUI-Impact-Pack/impact-pack.js` 报 `findInputSlot is not a function` 的情况。它复用 [Impact Pack 上游 PR #1233](https://github.com/ltdrdata/ComfyUI-Impact-Pack/pull/1233) 的一行修复：将 `connect()` 的目标从 `node.id` 改成节点对象 `node`，保留其余动态端口和连线逻辑。

1. 先关闭 ComfyUI。
2. 更新本 Fork 后，双击 `tools/修复ImpactPack.cmd`。工具尝试定位 ComfyUI 和原 Python，无法定位时询问路径。
3. 重启 ComfyUI，浏览器 Ctrl+F5，重新导入干净工作流。

工具会备份原 `impact-pack.js`；找不到唯一已知语句就停止，已修复时不重复写入。它不安装插件、不修改工作流、不改变模型配置。**仅 git pull 不会自动修改 Impact Pack，必须手动运行工具。**

也可使用 ComfyUI 的 Python 执行：

```bash
python tools/fix_impact_connect.py ../ComfyUI-Impact-Pack
```

修改 Impact Pack 后，其 Git 工作区会多出一行本地修改；如需还原，把工具打印的备份复制回 `js/impact-pack.js`。更新官方包时请保留备份并核对该补丁是否仍然需要。

## 开发测试

运行不需要 Node.js；Node 仅用于开发回归检查。

```bash
node --experimental-vm-modules --test tests/coexistence.test.mjs
python -m unittest discover -s tests -v
```

可选：设置 `AAALICE_MODERN_ROOT` 为官方新版源码目录，会增加对原版冲突检测器的集成测试。没有该目录时该项明确跳过。

源码基线：旧包 `663897c74d5aabf4437ae31381c16328472dc8f5`。本仓库不包含用户工作流、账号配置或本地运行日志。
