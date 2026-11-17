# 文稿 → 配音动画视频

- `原文.md`：文稿。`#xxx#` 是话题标签，结尾卡片要显示。
- `参考源.md`：第一行是 `#标签# 标题`，第二行是来源链接，结尾卡片要显示。
- `config.js`：TTS 的 `api_key`（mimo-v2.5-tts，音色「茉莉」）。**不要把 key 抄进别的文件、日志或提交。**
- `sooon-logo.png`：结尾卡片用的 logo。
- `video/`：MotionHarness（帧驭）Standard 工程，由下面的流程生成。

用户说“参考 xxx 的方式做 yyy 的视频”时，按本文件的流程执行。

## 工具

用 MotionHarness CLI（`mh`）。先运行 `mh skill` 读一遍内置指南；需要细节时再按指南里列的 `--reference` 去读对应章节。

## 流程

1. **建工程**（在主题文件夹里）

   ```sh
   mh new video
   cd video
   mkdir -p assets tools && cp ../sooon-logo.png assets/
   cp ../../患有抑郁焦虑症的学生恐惧学校/video/tools/*.mjs tools/
   pnpm add @fontsource/noto-serif-sc --ignore-workspace
   ```

   在 `package.json` 里加上 `"type": "module"`，把 `mh.json` 的宽高改成 1920×1080（fps 30）。

2. **写 `src/script.js`**：逐句导出 `LINES`、`SOURCE`、`LEAD_IN`、`OUTRO`。
   - `speak`：送给 TTS 的文本。数字和符号写成读法（“一点零一”“一百七十六倍”），停顿用逗号控制，“ta们”写成“他们”。
   - `show`：屏幕上显示的文本。`[...]` 是重点词（显示成金色），`\n` 是手动换行；数字可以保留阿拉伯数字。
   - `section`：决定这句配哪段插画。连续相同 section 的句子共用一段插画。
   - `group`（可选）：同组的连续句子在屏幕上叠在一起显示，前面的句子变暗（用于排比、口号）。
   - `gap`：这句之后的静音秒数。同组内约 0.4–0.6，换段时约 1.0–1.4。
   - `SOURCE` 从 `参考源.md` 取；`LEAD_IN` 约 1.4 秒，`OUTRO` 约 6 秒（结尾卡片的时长）。

3. **生成配音**：运行 `node tools/tts.mjs`，会 4 路并发、失败自动重试，句子较多时放到后台跑。
   - 只有文本改过的句子才会重新生成；`node tools/tts.mjs 3 7` 强制重做第 3、7 句。
   - 朗读语气由 `tools/tts.mjs` 里的 `STYLE` 控制，按主题调整（例如温暖鼓励，或深夜思考感）。
   - 结果写进 `assets/voice/NN.wav` 和 `manifest.json`。

4. **排时间轴**：运行 `node tools/timeline.mjs`，生成 `src/timeline.json`，并改写 `mh.json` 的 `duration` 和 `audio`。**每次改了配音都要重跑。**

5. **写 `src/scene.js`**：结构见下一节。

6. **检查**：用关键帧拼图检查各段画面，每次换一个新的输出目录：

   ```sh
   mh preview --times '[5,14,32,...]' --contact-sheet --output-dir .tmp/previews/pN
   ```

   每个 section 至少取一帧，并且要取在动画进行中的时刻。然后渲染一小段，确认渲染和声音正常：

   ```sh
   mh render .tmp/clip-v1.mp4 --json '{"start":58,"duration":12}'
   mh preview --file .tmp/clip-v1.mp4 --times '[2,6,10]' --contact-sheet
   ```

7. **交付**：运行 `mh open`，在 Studio 里给用户看。用户确认后，再 `mh render .tmp/output-v1.mp4` 导出成片，并抽几帧检查。

## scene.js 约定

- **图层**（从下到上）：环境光 div → 插画 canvas → 文字层（字幕块 + 插画标签 + 结尾卡片）→ 静态噪点 → 暗角。
- **时间**：一切都是 `t` 的纯函数，用 `ramp`、`smooth`、`easeOut` 推导；随机数用固定种子的 `mulberry32`。任何时刻反复渲染，画面必须完全一样。
- **插画按 run 组织**：`ARTS[sectionKey] = (t, run, A) => {...}`，`run.items` 是这段包含的句子（带 `start` 和 `duration`），`A` 是这段的淡入淡出系数。插画里的动作要对准讲到关键词的时刻（如 `it.start + it.duration * 0.6`）。
- **字幕按短语浮现，不要逐字蹦**：以中文标点和破折号为界，一个短语整体淡入（约 0.8 秒，轻微上浮），起始时间按字数比例对齐配音；重点词在短语出现后约 0.6 秒再变成金色。英文句点不算断句符（会把 1.01 拆开）。
- **字幕位置**：每个 section 在 `TEXT_Y` 里指定字幕块的纵向中心。有插画的段落把字幕放在上方（约 200–260），纯文字段落放在居中（约 500）。字号按最长一行的字数自动选择。
- **插画里的中文标签用 DOM**（`mkLabel`、`lbl`），不要用 canvas 的 `fillText`。标签在初始化时就全部创建好，字体才能提前加载；每帧只显示用到的标签。
- **视觉语言**：深色背景 `#09090d`，米白色文字，琥珀金 `#e0b67c` 表示光、勇气和重点。整片可以随叙事从冷暗渐变到暖亮。默认不加配乐（用户要配乐时，在 `mh.json` 的 `audio` 里添加）。
- **结尾卡片**：logo，加一条细线，再加上 `#标签# 标题` 和来源链接，最后整体淡出。

## 已知坑

- `-x ** 2` 是语法错误（构建失败），要写成 `-(x ** 2)`。
- `mh` 报错 “Daemon version … is incompatible” 时，说明 CLI 升级后旧的守护进程还在运行。**先征得用户同意**，再结束旧的 MotionHarness 进程（它可能正承载其他项目的 Studio）。
- 不要逐帧重绘噪点，会让文件体积增大约 10 倍。
- 预览、导出等临时文件都放在 `.tmp/`。不要关闭用户的 Studio，也不要在收尾时停掉守护进程。
- 用户的回复语言是中文。
