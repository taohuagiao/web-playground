# WEB PLAYGROUND — 浏览器炫技实验室

仓库：<https://github.com/taohuagiao/web-playground>
在线预览：<https://taohuagiao.github.io/web-playground/>

一个零依赖的单页交互实验场，用原生 **HTML / CSS / JavaScript** 手搓。没有框架、没有构建步骤、没有图片素材。

打开 `index.html` 就能玩，也可以直接扔到 GitHub Pages。

## 里面有什么

| 效果 | 怎么玩 | 实现 |
| --- | --- | --- |
| 流动极光背景 | 移动鼠标，光晕跟着走 | 手写 WebGL 片元着色器：FBM 噪声 + 域扭曲 + 鼠标光晕 + 暗角 + 胶片颗粒 |
| 粒子文字 | 在输入框打字，粒子立刻重排；点画面会炸开 | Canvas 2D 离屏采样文字像素，映射成数千颗发光粒子；弹簧回位、鼠标排斥、爆炸 |
| 磁力交互 | 指针靠近按钮 / 导航 | 指针距离计算偏移，RAF 插值回弹 |
| 3D 倾斜卡片 | 鼠标在卡片上移动 | CSS 3D `preserve-3d` + `rotateX/rotateY` + 跟随光斑 |
| 文字解码 | 滚动到对应位置 | 汉字从随机字库逐字显形 |
| 活体网络 | 鼠标在框内移动 | 节点漂浮、距离连线、鼠标吸引与高亮连线 |
| 点云星球 | 按住拖动旋转，松手有惯性 | 斐波那契球面布点 + 手写旋转矩阵 + 透视投影 |
| 液态波纹 | 点击或按住拖动 | 每个点受多个波函数叠加位移，环形波前扩散、衰减 |
| 自定义光标 | 全程 | 圆点即时跟随 + 圆环延迟跟随 + 悬停放大 |
| 配色切换 | 右上角四个圆点 | 4 套配色同时驱动着色器、粒子、网络、星球、波纹和 CSS 变量 |
| 动效开关 | 右上角开关 | 关闭装饰性自动动画，保留所有手动交互 |
| 科乐美彩蛋 | `↑ ↑ ↓ ↓ ← → ← → B A` | 派对模式 + 彩纸 |

还包含：滚动进度条、滚动入场动画、按钮涟漪、移动端布局。

## 关于「减少动态效果」

页面默认开启动效。如果系统开启了 *减少动态效果*，页面会自动把**装饰性动画幅度降到 65%**，但**不会**关掉鼠标驱动的手动交互——光标跟随、卡片倾斜、粒子排斥、拖拽旋转这些是对你操作的直接回应，不属于自动播放的动画。

想彻底关掉背景动画，点右上角的 **动效 ON/OFF** 开关即可，选择会被记住。也可以用 `?motion=off` 强制关闭、`?motion=on` 强制开启。

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

当前仓库已经开启 Pages，在线地址：<https://taohuagiao.github.io/web-playground/>

如果要从头配置：

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

- **换成你的文字**：`js/particles.js` 顶部的 `words` 数组（输入框输入的内容优先）。
- **换配色**：`js/background.js` 顶部的 `palettes` 数组（同时改 `c1/c2/c3` 和 `accent/accent2`）。
- **换文案**：直接改 `index.html`。
- **换 GitHub 链接**：`index.html` 里 `class="github-link"` 的 `href`。
- **调粒子密度**：`js/particles.js` 里 `buildTargets()` 的 `step` 计算。
- **调网络密度**：`js/network.js` 里 `count` 的计算。

## 性能与兼容

- 背景着色器限制在 1.5× DPR，粒子和网络限制在 2× DPR。
- 粒子数量上限 7200，密度会按字号自动调整。
- 系统「减少动态效果」只降低装饰动画幅度，不移除交互。
- 动效开关可随时关闭背景自动动画。
- 需要支持 WebGL 和 Canvas 2D 的现代浏览器（Chrome / Edge / Firefox / Safari 近几年的版本都可以）。
- WebGL 不可用时会自动退回纯 CSS 渐变背景，页面仍然可读。

## 许可

MIT。随便玩，随便改。
