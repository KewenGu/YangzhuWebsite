# 阳翥内容发布台：管理员接入说明

## 已实现

- `/admin/` 发布入口、中文编辑界面和会长使用指南。
- 四类独立记录：8条活动、5条法会、6位成员、8条联谊，原有媒体与双语内容迁移到 `content/`。
- 图片/视频上传，中英文预览，显示顺序、首页活动推荐、下架/恢复。
- Decap GitHub editorial workflow：草稿独立保存；同一个有写权限的账号可自行发布，不要求另一个审核人。
- `npm run build` 从内容生成完整静态网页，保留 SEO 可读 HTML、原有页内链接与白金样式。
- GitHub Actions：校验、测试、构建全部成功后才通过 GitHub Pages Actions 部署；失败时保留当前网站。
- OAuth 登录桥接已实现于 `auth/worker.mjs`，已接入 `https://yangzhu-cms-auth.kewen-gu.workers.dev`，授权入口返回正确 GitHub 跳转；实际账号登录仍需验收。

## 一次性配置（网站管理员操作，会长不需要做）

1. 请会长提供他的 GitHub 用户名。在仓库 Settings → Collaborators 中邀请他，并让他接受。发布需要写权限。不要共享你的个人账号或令牌。
2. 部署 `auth/worker.mjs` 到你控制的 Cloudflare Workers 账号，使用 `auth/wrangler.toml`。该服务只负责登录；官网仍在 GitHub Pages。
3. 在 GitHub Settings → Developer settings → OAuth Apps 新建应用：
   - Homepage URL：`https://yangzhu.org/admin/`
   - Authorization callback URL：你的 Worker HTTPS 地址加 `/callback`
4. 给 Worker 设置：
   - `CMS_ORIGIN=https://yangzhu.org`
   - `AUTH_ORIGIN` 为 Worker 的精确 HTTPS origin，不含末尾斜线。
   - `ALLOWED_USERS` 为允许登录的 GitHub 用户名，逗号分隔，包含会长和维护者。
   - `GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET` 通过 Worker secret 存储。不要写进仓库或聊天。
5. 将 `admin/settings.json` 的 `authBaseUrl` 填为该 Worker 地址，运行构建，再提交部署。
6. GitHub Pages 发布来源使用 GitHub Actions（`build_type: workflow`）。工作流只发布 `dist/` 构建产物；`main` 是源代码，不直接作为网站输出。
7. 用会长账号验证：登录 → 新建草稿 → 图片上传 → 预览 → 发布 → 等待 Actions 完成 → 官网出现内容 → 下架测试条目。此线上验收尚未执行。

若登录配置未完成，正式入口会明确显示“尚未开放”，不会使用不明的第三方认证端点。只有获准账号且确有仓库写权限，认证桥接才返回登录凭据。OAuth scope 使用 `public_repo`；此为 GitHub OAuth 对公开仓库写入的权限粒度，请在授权页检查。

## 本机预览

```sh
npm ci --ignore-scripts
npm run build
npm run cms:proxy
# 另一个终端：
python3 -m http.server 8766 --bind 127.0.0.1 --directory dist
```

访问 `http://127.0.0.1:8766/admin/`。本机编辑服务仅监听回环地址；不需要 GitHub 登录。保存写入本机 `content/`，不会推送。保存后重新运行 `npm run build`，刷新网站查看结果。本机模式使用直接保存，不模拟远程草稿分支。

正式编辑器固定加载 Decap CMS 3.16.3，需能够访问 jsDelivr。后台设置、预览、媒体上传使用官方 Decap API。

## 内容来源与维护

今后修改条目请编辑 `content/<栏目>/<标识>.json`，或使用后台。根目录原有 HTML 是页面壳和迁移基线；构建会替换各栏目内容区域，不能再通过改其中的旧条目来维护内容。`scripts/migrate-content.mjs` 仅用于一次性迁移，拒绝覆盖已有记录。

- `scripts/content.mjs`：数据校验与唯一渲染逻辑。
- `scripts/build.mjs`：生成可部署 `dist/`。仅复制明确的公共文件，不发布内容源文件、凭据、开发依赖或测试。
- `scripts/cms-config.mjs`：编辑器字段配置生成器，运行后更新 `admin/config.yml`。
- `admin/content.mjs`：构建时从唯一渲染逻辑同步生成，用于实时预览。
- 公共仓库中的草稿分支并非私密；后台仅用于可公开的协会资料。
- 不把真实凭据写入源文件。历史中曾暴露的 Mailchimp key 仍需由账户所有者撤销，与新后台登录无关。
- 发布后的网页不是瞬时更新；内容已提交不等于构建完成。会长指南要求发布后打开官网核对。

## 回退

内容误改可通过后台修正后重新发布。管理员也可回退 `content/` 的对应提交再部署。构建失败不会替换已发布网站。正式启用前，应在 GitHub 确认分支保护规则不会阻止会长通过后台发布。

## 官方文档

- https://decapcms.org/docs/github-backend/
- https://decapcms.org/docs/editorial-workflows/
- https://decapcms.org/docs/decap-proxy/
- https://decapcms.org/docs/registering-events/
