# 古文匠人 · 学习闯关网页

一个**纯网页、不涉及后端**的古文学习小游戏。教师在 Excel（`data/articles.xlsx`）里维护古文目录、关卡题目、视频节点，网页自动读取并渲染：

- 目录页：展示古文卡片，点击进入详情。
- 详情页四步：
  1. 展示 1 · 游戏基本信息（10 秒后自动切换）
  2. 展示 2 · 游戏序（10 秒后自动切换）
  3. 展示 3 · 视频闯关（视频到节点暂停弹题，答对继续，答错跳回上一节点）
  4. 展示 4 · 总结与通关奖励

## 目录结构

```
Ancient Chinese Challenge/
├─ index.html                 # 目录页
├─ detail.html                # 详情/闯关页
├─ css/
│  └─ style.css               # 统一样式
├─ js/
│  ├─ excel-loader.js         # Excel 加载与数据组装
│  ├─ index.js                # 目录页逻辑
│  └─ detail.js               # 详情页与答题流程
├─ libs/
│  └─ xlsx.full.min.js        # SheetJS（本地化，避免外网依赖）
├─ data/
│  ├─ articles.xlsx           # 古文与题目数据（教师维护）
│  ├─ 字段说明.md              # Excel 字段填写指南
│  ├─ generate-template.cjs   # 一次性脚本：根据示例数据重新生成模板
│  └─ verify-template.cjs     # 一次性脚本：校验 articles.xlsx
├─ videos/                    # 存放视频文件（mp4）
├─ images/                    # 存放封面图等图片
├─ 点我启动.bat               # ★ 双击即可启动：自动开浏览器
├─ launch.ps1                 # 启动器逻辑（被点我启动.bat 调用）
├─ dev-server.cjs             # 本地静态文件服务
├─ 开发文档1.txt              # 原始需求文档
└─ README.md
```

## 本地运行

由于浏览器禁止 `file://` 协议读取本地 Excel，**必须通过本地静态服务访问**。

### 方式 1：双击「点我启动.bat」（推荐，零命令）

1. 确保电脑安装了 Node.js（<https://nodejs.org/zh-cn> 下载 LTS 版本，一路下一步）。
2. 双击文件夹中的 `点我启动.bat`，会弹出一个黑色窗口，并自动用默认浏览器打开 <http://127.0.0.1:8123/>。
3. 用完后**关掉那个黑色窗口**即可停止服务。

> `点我启动.bat` 内部会调用 `launch.ps1`，自动启动本地服务并打开浏览器。

### 方式 2：手动命令（适合开发者）

```powershell
cd "d:\project\web\Ancient Chinese Challenge"
node dev-server.cjs 8123
```

浏览器打开 <http://127.0.0.1:8123/>。

### 方式 3：使用 VSCode Live Server 扩展

安装 "Live Server" 扩展后右键 `index.html` → "Open with Live Server"。

### 方式 4：使用 Python 自带服务

```powershell
cd "d:\project\web\Ancient Chinese Challenge"
python -m http.server 8123
```

> 直接双击 `index.html` 会因浏览器同源策略报错；请务必用以上任一方式启动。

## 维护数据（不改代码）

1. 直接用 Excel / WPS / 在线 Office 打开 `data/articles.xlsx`。
2. 在 `articles` 工作表中维护文章目录与基本信息；在 `questions` 工作表中维护各关题目。
3. 字段说明详见 `data/字段说明.md`，包含题型 (`single` / `judge` / `match` / `sort`) 与正确答案填写规则。
4. 把视频文件放到 `videos/` 目录，并在 `articles.视频地址` 列填写相对路径（如 `videos/fatan.mp4`）。
5. 保存后刷新浏览器即可看到更新。

## 部署到 Gitee Pages

1. 在 Gitee 新建仓库（如 `ancient-chinese-challenge`）。
2. 在项目根目录初始化 git 并推送：

   ```powershell
   git init
   git add .
   git commit -m "init: 古文匠人学习闯关网页"
   git branch -M master
   git remote add origin https://gitee.com/<你的账号>/ancient-chinese-challenge.git
   git push -u origin master
   ```

3. 进入 Gitee 仓库 → 服务 → Gitee Pages → 选择 `master` 分支 → 启动。
4. 启动完成后访问 Gitee 给出的 URL，即可看到目录页。
5. 视频文件比较大时，建议放到 OSS / 外部 CDN，并在 Excel 的"视频地址"列填外网地址。

## 关于答案"隐藏"

本项目是纯静态网页，所有数据都会下发到学生浏览器，**懂调试工具的学生在控制台仍可看到 Excel 内容与正确答案**，这是纯前端方案的固有限制。如需真正隐藏，需要后端配合校验。

## 常见问题

- **打开页面提示"加载古文目录失败"**：通常是直接双击打开 `index.html`。请改用 `node dev-server.cjs` 等本地服务。
- **视频不播放**：检查 `视频地址` 是否正确、文件是否存在；浏览器对部分编码（如 H.265）支持有限，建议使用 H.264 mp4。
- **修改 Excel 后无变化**：浏览器可能有缓存，按 Ctrl+F5 强制刷新；或确认 `articles.xlsx` 已保存到正确路径。
- **想重置示例数据**：运行 `node data/generate-template.cjs` 会重新生成 `articles.xlsx`（覆盖现有内容）。
