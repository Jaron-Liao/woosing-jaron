# 方案 A · 微信 openid → CloudBase 正式账号（接入手册）

> 状态：**代码已写好并通过构建/冒烟，但凭据未到位，尚未上线。**
> 本轮改动遵循腾讯官方 skill `TencentCloudBase/CloudBase-AI-Toolkit` 的 `auth-nodejs-cloudbase`。

## 一、已经做好的代码

| 文件 | 作用 |
|---|---|
| `server/config.mjs` | 新增 `CUSTOM_LOGIN_ENABLED` / `CLOUDBASE_ENV` / `CLOUDBASE_CUSTOM_LOGIN_KEY`，启动集中校验 |
| `server/custom-login.mjs`（新） | 读私钥文件 + `@cloudbase/node-sdk`，`auth.createTicket('wx:'+openid)`；customUserId 4–32 位校验；**不打印私钥内容** |
| `server/index.mjs` | 微信回调成功后签 CloudBase 票；失败自动降级为「仅身份」票；`/api/wechat/config-state` 只回 `ready/unconfigured` |
| `src/cloudbase-bridge.js`（新） | Web 侧 `setCustomSignFunc(fn)` + **无参** `signInWithCustomTicket()`；数据/文件双轨；SDK 动态加载（946KB 只在微信登录时下载） |
| `src/wechatH5.js` | status 增加 `customLoginEnabled` |
| `src/pages/Login.jsx` | 微信内拿到 session 票 → 自动换 CloudBase 登录 → 直接进站 |
| `src/cloud.js` | `currentSession` / `loadUserData` / `saveUserData` / `uploadFile` / `listFiles` / `signedUrl` 双轨分流 |
| `server/.env.example` | 占位配置，真实 `.env` 已加入 `.gitignore` |

## 二、你需要提供的两样东西

1. **CloudBase 环境 ID**（`CLOUDBASE_ENV`）——不是 `wbapp_` 开头的应用 ID。
2. **自定义登录私钥 JSON 文件**——从 CloudBase 控制台「身份认证 → 登录方式 → 自定义登录」启用后下载。

> 私钥请放到**仓库外**的安全路径，例如 `C:/secure/cv/tcb_custom_login.json`。
> 前端只需要环境变量 `VITE_CLOUDBASE_ENV=你的环境ID`，**不需要也不允许接触私钥**。

你说私钥可以用 Edge 去调取：我检查过 Edge，当前没有腾讯云控制台登录态（会跳登录页），需要你本人登录一次。我不会代你输入账号密码或读取私钥正文，只会记录路径并按脚本方式使用。

## 三、填好后的启动方式

```bash
cd codeverse
cp server/.env.example server/.env      # 填 WECHAT_* / TICKET_SECRET / CLOUDBASE_* / CUSTOM_LOGIN_ENABLED=1
# 前端环境（Vite 只打包 VITE_ 前缀）：
echo "VITE_CLOUDBASE_ENV=你的环境ID" > .env.local

set -a && source server/.env && set +a
PORT=4199 STATIC_DIR=dist node server/index.mjs
```

验证顺序：

```bash
curl -s localhost:4199/health                  # customLoginEnabled 应为 true
curl -s localhost:4199/api/wechat/config-state # 应为 {"state":"ready"}
```

然后微信内打开站点 → 点「微信一键登录」→ 应直接进站，不再要求手机号。

## 四、必须知道的三个风险（我没有替你掩盖）

1. **数据库可能不是同一个库**。WorkBuddy 轨的 `cv_user_data` 是 PostgreSQL 表（走 `/.cloud/database/rest`），CloudBase Web SDK 的 `database()` 默认面向文档数据库。**我没法在没环境 ID 的情况下验证**。若验证发现不同库，微信轨会读写到另一个集合，与手机号轨数据不互通。
2. **两套账号数据不互通**。CloudBase uid 与 WorkBuddy uid 命名空间不同，同一个人用两种登录方式会看到两份数据。要统一需要 unionid 映射表。
3. **LLM 仍走 WorkBuddy SDK**。它是 keyless 的，不依赖 session，所以方案 A 切换后 Agent 对话不受影响；但如果你要彻底脱离 WorkBuddy，需要另接 LLM 服务。

## 五、我本轮验证到的事实（避免你重复踩坑）

- `@tencent-ai/workbuddy-cloud-sdk` **没有** `setCustomSignFunc` / `signInWithCustomTicket`，所以 CloudBase 票必须用官方 `@cloudbase/js-sdk` 消费——这就是方案 A 要切 SDK 的原因。
- SDK 的 `/.cloud/auth/v1/login-wechat` 端点存在，但公众号 appid 实测返回 `403 小程序未授权给 WorkBuddy`，**不能绕过**。
- 无凭据时 `issueCustomTicket` 正确抛 `503 custom_login_not_enabled`，回调会降级，不会白屏或死循环。
- 构建通过：主包 448KB（未变胖），CloudBase SDK 独立 chunk 946KB，按需加载。
