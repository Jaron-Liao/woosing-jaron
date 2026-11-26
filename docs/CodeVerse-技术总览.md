# CodeVerse 数学代码工作台 · 技术总览（v0.10）

> 更新时间：2026-11-27
> 项目路径：`D:/WorkBuddy/数学工作台/codeverse`
> 线上地址：`https://codeverse-workbench.app.workbuddy.host/?sharecode=P26ACHYNBX`
> GitHub Pages 镜像：`https://jaron-liao.github.io/woosing-jaron/`

## 一、系统架构

```
浏览器（React 18 + Vite 5 + HashRouter）
 ├─ 工作台：Monaco 编辑器 / Pyodide / Dexie(IndexedDB) / 笔记 / 算法模板 / 数据集 / 角色图鉴
 ├─ 身份：WorkBuddy SDK（手机号 OTP、微信扫码、WorkBuddy OAuth）
 │         └─ 方案 A 新增：CloudBase 自定义登录（createTicket → signInWithCustomTicket）
 ├─ 数据：cv_user_data（云端，RLS owner_id = auth.uid()）
 │         └─ 本地兜底：localStorage + IndexedDB，离线可用
 ├─ LLM：WorkBuddy keyless 流式对话（仅支持 stream:true）
 └─ 3D：three.js 直连（不引入 @react-three/fiber）
           └─ Blender 建模脚本可导出 glb 替换程序化模型

服务端（server/，零框架 Node http，单端口 $PORT）
 ├─ 静态托管 dist/（SPA 回退）
 ├─ /health /ready
 ├─ /api/wechat/{status,authorize,callback,profile,config-state}
 ├─ 分层：config / errors / logger / wechat / custom-login / index(装配)
 └─ 安全：结构化日志+reqId、类型化错误、限流、安全头、显式 CORS、请求体上限、优雅停机
```

### 为什么不用 @react-three/fiber
r3f v9 需要 React 19，本项目是 React 18.3.1，初始化会抛
`Cannot read properties of undefined (reading 'S')` 导致整页白屏。
已彻底移除，改为手写 three.js renderer + raf，与 React 生命周期解耦。

## 二、微信登录（关键结论）

### 域名硬约束（实测）
WorkBuddy OAuth 中继只接受**已发布应用的 https 域名**作为 callback_url：

| 地址 | 中继结果 |
|---|---|
| `localhost:5173` | 400 `callback_url must be an absolute https:// URL of a published application` |
| `jaron-liao.github.io/woosing-jaron` | 400 `callback_url is not a registered domain of any published application` |
| `codeverse-workbench.app.workbuddy.host` | **302 → `open.weixin.qq.com/connect/qrconnect`** |

发布域名前有 sharecode 网关，不带 `?sharecode=P26ACHYNBX` 连静态资源都会 403
「链接不完整」；根路径会下发 `__wb_rsc` cookie，之后资源才 200。

### 二维码形态
微信扫码页与中继都没有 `X-Frame-Options`，可 iframe 内嵌。
因此做了「站内弹窗二维码」：外层品牌是 CodeVerse，内层微信官方页仍写
「使用微信扫一扫登录『WorkBuddy』」（那是平台统一网站应用名，改不了，除非自备
微信开放平台网站应用资质）。弹窗保留「整页方式打开」兜底。

### 方案 A：微信 openid → 正式云端账号
依据腾讯官方 skill `TencentCloudBase/CloudBase-AI-Toolkit` 的
`auth-nodejs-cloudbase`：

1. 公众号 `snsapi_userinfo` 授权拿 code
2. 服务端 `code → openid`，以 `wx:<openid>` 作 customUserId（4–32 字符）
3. Node SDK `auth.createTicket(customUserId)` 签票
4. Web SDK `setCustomSignFunc(fn)` + **无参** `signInWithCustomTicket()` 换 session

**已实测通过**（`docs/verify-report.json`）：
```
ticket_issued: len=460
page_result: { ok:true, uid:"wx:wxwxverifytest001" }
netErrors: []
```

### 踩过的坑（重要）
- `@cloudbase/node-sdk` 的 `createTicket()` 返回 **Promise<string>**，必须 `await`；
  直接当字符串用会得到 `[object Promise]`，换 session 报 400。
- `@tencent-ai/workbuddy-cloud-sdk` **没有** `setCustomSignFunc` /
  `signInWithCustomTicket`，所以 CloudBase 票必须用官方 `@cloudbase/js-sdk` 消费。
- SDK 的 `/.cloud/auth/v1/login-wechat` 只认已在 WorkBuddy 后台授权的小程序
  appid，公众号 appid 实测 `403 小程序未授权给 WorkBuddy`，不能绕过。
- 中继写死 `snsapi_login`（PC 扫码），微信内置浏览器 UA 也一样，
  所以公众号 H5 授权必须自建，不能靠中继。

## 三、CloudBase 环境实况

| 项 | 值 |
|---|---|
| 环境名 / ID | `jaron-12305` / `jaron-12305-d2gl0tzsrf2a68c59` |
| 套餐 | 体验版，到期 2027-04-19 |
| 数据库 | **仅 PostgreSQL** `postgres-4w7pqnu0`，**没有文档数据库** |
| 已启用 | 自定义登录（私钥存 `C:/secure/cv/tcb_custom_login.json`，仓库外） |

因为无文档库，`@cloudbase/js-sdk` 的 `collection()` 会报
`DATABASE_COLLECTION_NOT_EXIST`；`app.models.$runSQL` 对自定义登录票据报
JWT `kid` 不匹配。数据层要真正落地需走 PG + 服务端代理，或用云函数。
**这是当前唯一未闭合的环节**，已如实标注，不掩盖。

## 四、3D 建模（Blender + three.js）— 已真实跑通

本机原本没装 Blender，已下载 **Blender 4.2.0 便携版**（阿里云镜像，383MB）到
`D:/WorkBuddy/数学工作台/.tools/blender-dist/`，并**离线执行成功**。

- `blender/generate_buddy.py`：基础几何拼装机械狐，Principled BSDF 材质、
  三点布光、AgX、EEVEE，球体平滑着色。
  快速导出：`blender -b --factory-startup --python blender/generate_buddy.py -- --out public/models --fast`
  完整渲染：加 `--render-views` 额外输出 preview + 正面/侧面/背面三视图。
- 实际产物（`public/models/`）：
  `codeverse-buddy.glb`（约 218KB）、`preview.png`、
  `turnaround_front.png` / `turnaround_side.png` / `turnaround_back.png`。
- `vite.config.js` 在**编译期探测** glb 是否存在，用 `define` 注入 `__BUDDY_GLB__`；
  存在就自动加载 Blender 模型，不存在静默回退到程序化 3D（无 404 噪音）。
- `src/components/BuddyModel3D.jsx`：手写 three.js renderer / 拖拽旋转 /
  滚轮缩放 / 自动转台 / 呼吸与尾巴动画；不引入 R3F。
- 首页 `Dashboard` 加「看立体 3D」切换，图鉴页加「立体建模」与「Blender 渲染」两个 tab。
- 坐标系坑：Blender Z-up、three.js Y-up；glTF 导出会自动转换（不要再旋转），
  而程序化模型必须整组 `rotation.x = -π/2` 才正立。
- three.js 与 CloudBase SDK 都做动态 import，主包保持 ~449KB，大 chunk 按需加载。

## 五、工程规范

- 配置全部走环境变量，启动时集中校验，密钥只在 `.env`（已 gitignore）。
- 错误：`AppError` 类型体系 + `normalizeError` 全局处理，客户端只见
  `{ error, message, reqId }`，不外泄堆栈。
- 日志：结构化 JSON，贯穿 reqId，不记令牌/私钥/隐私。
- 前端 `src/api.js`：Base URL 走环境变量，错误码映射中文，
  4xx 不重试、5xx 递增退避最多 3 次、网络断开触发离线提示。
- `AppBoundary`：渲染错误兜底，防止单组件异常整页白屏。
- 限流默认 90 次/分钟，安全头含 `X-Content-Type-Options`、
  `X-Frame-Options=SAMEORIGIN`、`Referrer-Policy` 等。

## 六、验证清单

| 项 | 结果 |
|---|---|
| `npm run build` | 通过，90+ 模块，无 R3F chunk |
| `npm test`（9 个后端单测） | 全过（错误归一化、state 签名/篡改/超时、限流、配置校验） |
| 服务端 `/health` `/ready` `/api/wechat/*` | 200，安全头/限流计数/结构化日志正常 |
| CloudBase 自定义登录端到端 | **通过**，uid 稳定 |
| 微信扫码点击链路 | 302 → qrconnect，二维码渲染，零 JS 错误 |
| 站内弹窗二维码 | iframe 渲染正常，390px 视口无溢出 |
| Blender 4.2 离线建模+渲染 | **成功**，glb + 4 张 PNG |
| glb 在站点加载 | badge「Blender 模型」，WebGL 正常，朝向正确 |
| 首页 3D / 图鉴 Blender 渲染 | 切换正常；4 张图全部加载，零错误 |
| 390 / 768 / 1280 三视口 | 均无横向溢出、零 JS 错误 |
| 主站 + GitHub Pages 线上烟测 | 两站 200，零 JS 错误，资源齐全 |
| GitHub Actions（npm test → build → 部署 main） | **成功**，Pages 自动重新部署 |

## 六之二、GitHub 自动化

- 源码在 `source` 分支（`Jaron-Liao/woosing-jaron`），`main` 是 Pages 发布分支。
- `.github/workflows/deploy-pages.yml`：push 到 source → `npm test` → `npm run build`
  → 校验产物（index.html / avatars）→ 推 dist 到 main。
- 依赖走 `registry.npmmirror.com`（与 package-lock 一致），`npm ci --legacy-peer-deps`。
- 曾失败一次：源码白名单漏了 `.csv`，导致 `iris.csv?raw` 无法解析；已补齐并重跑成功。
- 校验失败不会覆盖线上，Pages 保持旧内容，安全。

## 七、遗留事项

1. 数据层：PG 表 + 服务端代理（或云函数）尚未落地，微信轨数据暂未云端持久化。
2. 公众号 `WECHAT_APPID` / `WECHAT_APP_SECRET` 未提供，H5 授权未上线。
3. 上线 H5 需把主站从「静态部署」切为「Node 部署」，会改变部署形态。
4. 自定义域名若走 EdgeOne Pages，OAuth 中继大概率拒绝；
   只有「设置—数据管理—应用」里绑定的域名才可能放行，绑定后需实测。
5. Blender 已跑通，glb 与三视图已上线；后续改模型只需重跑脚本 + 重新构建。
6. `D:/Edge下载文件` 里还留有 3 份多余私钥副本（重复点击下载造成），
   建议清理——涉及个人目录，未擅自删除。
7. 数据层仍是唯一未闭合环节：该环境只有 PostgreSQL、无文档库，
   `collection()` 报 `DATABASE_COLLECTION_NOT_EXIST`，`models.$runSQL` 对自定义登录
   票据报 JWT kid 不匹配。要落地需走 PG + 服务端代理或云函数。
