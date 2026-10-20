# WEB PLAYGROUND — 浏览器炫技实验室

一个零依赖的单页交互实验场，用原生 **HTML / CSS / JavaScript** 手搓。没有框架、没有构建步骤、没有图片素材。

打开 `index.html` 就能玩，也可以直接扔到 GitHub Pages。

## 里面有什么

| 效果 | 实现 |
| --- | --- |
| 流动极光背景 | 手写 WebGL 片元着色器：FBM 噪声 + 域扭曲 + 鼠标光晕 + 暗角 + 胶片颗粒 |
| 粒子文字 | Canvas 2D 离屏采样文字像素，映射成数千颗发光粒子；弹簧回位、鼠标排斥、点击爆炸、自动换词 |
| 磁力交互 | 指针靠近时按钮 / 导航轻微偏移，RAF 插值回弹 |
| 3D 倾斜卡片 | CSS 3D `preserve-3d` + 指针位置计算 `rotateX/rotateY` + 跟随光斑 |
| 文字解码 | 滚动进入视口时，汉字从随机字库逐字显形 |
| 活体网络 | Canvas 2D 节点漂浮、距离连线、鼠标吸引与高亮连线 |
| 自定义光标 | 圆点即时跟随 + 圆环延迟跟随 + 悬停放大，`mix-blend-mode: difference` |
| 配色切换 | 4 套配色，同时驱动着色器、粒子、网络和 CSS 变量，并记住选择 |
| 科乐美彩蛋 | 输入 `↑ ↑ ↓ ↓ ← → ← → B A`，触发派对模式和彩纸 |

还包含：滚动进度条、滚动入场动画、按钮涟漪、`prefers-reduced-motion` 适配、移动端布局。

## 本地运行

最简单：双击 `index.html`。

更推荐起一个本地静态服务器（避免个别浏览器对 `file://` 的限制）：

```bash
# Python 3
python -m http.server 8080

# 或 Node
npx serve .
```

然后打开 <http://localhost:8080>。

## 部署到 GitHub Pages

1. 把整个 `web-showcase` 目录推到仓库（可以放在仓库根目录，也可以放在 `docs/`）。
2. 在 GitHub 仓库的 **Settings → Pages** 里：
   - Source 选 **Deploy from a branch**
   - Branch 选 `main`，目录选 `/ (root)` 或 `/docs`
3. 等一分钟，访问 `https://<你的用户名>.github.io/<仓库名>/`。

如果部署在仓库根目录，不需要改任何路径；所有资源都是相对路径。

## 同步到一个已有的 GitHub 仓库

在本目录执行：

```bash
git init
git add .
git commit -m "feat: interactive web playground"
git branch -M main
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

如果仓库里已经有内容，先把远端拉下来再合并：

```bash
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git fetch origin
git checkout -b playground
git add .
git commit -m "feat: interactive web playground"
git push -u origin playground
```

然后在 GitHub 上开一个 Pull Request，确认没问题再合并。

## 想改的地方

- **换成你的文字**：`js/particles.js` 顶部的 `words` 数组。
- **换配色**：`js/background.js` 顶部的 `palettes` 数组（同时改 `c1/c2/c3` 和 `accent/accent2`）。
- **换文案**：直接改 `index.html`。
- **换 GitHub 链接**：`index.html` 里 `class="github-link"` 的 `href`。
- **调粒子密度**：`js/particles.js` 里 `buildTargets()` 的 `step` 计算。
- **调网络密度**：`js/network.js` 里 `count` 的计算。

## 性能与兼容

- 背景着色器限制在 1.5× DPR，粒子和网络限制在 2× DPR。
- 所有 canvas 动画在离开视口时暂停。
- 尊重 `prefers-reduced-motion`：关闭倾斜、磁力、自定义光标和文字解码动画。
- 需要支持 WebGL 和 Canvas 2D 的现代浏览器（Chrome / Edge / Firefox / Safari 近几年的版本都可以）。
- WebGL 不可用时会自动退回纯 CSS 渐变背景，页面仍然可读。

## 许可

MIT。随便玩，随便改。
