# 美国阳翥道教协会网站

美国阳翥道教协会的双语静态网站，展示协会介绍、成员、活动、法会、国际联谊与文化商店。

- [官网](https://yangzhu.org/)
- [内容发布后台](https://yangzhu.org/admin/)
- 中文页面使用根路径，英文页面位于 `/en/`，例如 `/en/about.html`

## 项目如何工作

网站内容保存在 `content/` 下的 JSON 文件中。构建脚本读取这些内容，生成中文和英文页面，并把网站资源复制到 `dist/`。推送 `main` 分支后，GitHub Actions 会自动执行测试、构建并发布到 GitHub Pages。

内容后台使用 Decap CMS。管理员通过 GitHub 登录后编辑内容；保存并发布会提交内容变更，随后由同一套构建流程更新官网。

## 本地开发

环境要求：Node.js 22 或更高版本，以及 npm。

```bash
npm ci
npm test
npm run build
python3 -m http.server 8766 --bind 127.0.0.1 --directory dist
```

然后打开：

- 中文首页：`http://127.0.0.1:8766/`
- 英文首页：`http://127.0.0.1:8766/en/`

构建会重新生成 `dist/`，所以请预览构建结果，不要直接修改 `dist/`。`dist/` 是生成目录，已被 Git 忽略。

### 本机内容编辑预览

需要测试 CMS 编辑流程时，先构建网站，再在另一个终端启动本地代理：

```bash
npm run build
npm run cms:proxy
python3 -m http.server 8766 --bind 127.0.0.1 --directory dist
```

本机预览不会发布到官网。完整使用说明见 [`admin/guide.html`](admin/guide.html)。

## 内容发布

第一次使用后台前，需要接受管理员发出的 GitHub 协作邀请。登录后台后，可以管理以下栏目：

- 活动
- 协会法会
- 主要成员
- 国际联谊
- 在线商店（商品、款式、独立价格与实物图、Stripe 付款链接、人工库存及 AI 文案草稿）
- 商店设置（全店共用的中英文配送、退换及公开客服说明）

常用发布流程是：填写中文内容，上传图片或视频，使用“一键补齐英文”填充缺失的英文栏位，检查人名、日期和译文，先保存草稿，再发布。

正文中空一行即可分段，不需要输入 HTML。上传素材支持 JPG、PNG、WebP、GIF、MP4 和 WebM，单个文件不超过 20MB。`order` 数字越小越靠前；关闭“在网站上显示”可以下架内容。仓库目前公开，请勿上传身份证件、私人联系方式或未获许可公开的资料。

## 内容与资源目录

```text
content/
├── activities/     # 协会活动
├── ceremonies/     # 协会法会
├── members/        # 主要成员
├── relations/      # 国际联谊
├── products/       # 商品与款式图录
└── settings/       # 商店公开配送、退换与客服设置

assets/             # 图片、视频和其他公开资源
assets/uploads/     # CMS 上传的媒体文件
admin/              # CMS 后台、编辑器和发布指南
auth/               # GitHub OAuth / Cloudflare Worker 配置
scripts/            # 内容读取、SEO、CMS 配置和构建脚本
tests/              # 内容、表单、翻译和 SEO 测试
```

页面源文件是根目录中的 `index.html`、`about.html`、`members.html`、`activities.html`、`ceremonies.html`、`relations.html` 和 `shop.html`。共用前端代码主要位于 `home.css`、`home.js`、`includes.js` 和 `new-script.js`；商店样式和交互位于 `shop.css`、`shop.js`。

## 文化商店

以下为当前代码中的功能，推送并完成部署后才会反映到官网。构建会生成 `/shop.html`、`/en/shop.html`，以及每款已发布商品的独立中英文页面 `/shop/<id>.html` 与 `/en/shop/<id>.html`。商品内容在初始 HTML 中，无需运行 JavaScript 即可阅读。原有外部商店链接已指向本站商店。

后台可为每个款式设置独立名称、照片、规格、美元价格、Stripe 付款链接及人工库存。每个可购买款式需有独立、已核对的收款链接；`variants` 非空时停用父商品的统一付款链接。只有价格有效、标记有货且库存不为0的已核对商品或款式显示购买按钮。库存留空表示未录入；库存为0停止本站购买入口。付款后不会自动扣库存，修改网站售价或库存不会同步 Stripe。

「商店设置」统一维护公开客服邮箱、配送和退换规则，并生成 `/shop-policies.html`、`/en/shop-policies.html`。未确认的信息可留空，页面不会猜测费率、期限或承诺。其他款式可设为咨询购买；下架商品不会生成页面或进入站点地图。Stripe Payment Links 负责结账，订单、收款通知和退款仍在 Stripe 后台处理，本站不接收银行卡资料。

商品 SEO 与生成式搜索所需的公开内容随发布自动更新，无需编辑者填写 SEO 栏位或点击额外按钮。系统根据当前名称、介绍和真实细节生成中英文搜索标题与摘要；图片说明可选填，留空时自动生成基础替代文本。单款 Product、多款式 ProductGroup、已核对商品的 Offer、购买问答、分享信息和商品索引也由同一份内容生成，价格、款式链接和售罄状态与页面保持一致。

这些自动处理不调用付费 AI，也不依赖 AI 服务是否启用。管理员只需维护商品事实、照片、收款资料和商店规则；搜索排名、富结果和 AI 引用仍由各平台决定。

后台提供 AI 中英文文案与参考图生成，结果必须手动审核和应用。前端付款链接不需要 Stripe 私密密钥。**后台 AI 服务需要单独部署 Worker；图片生成还需要配置 `OPENAI_API_KEY`。** 仅推送 GitHub Pages 不会启用新的 AI 接口。

商品发布与 SEO 说明见 [`SHOP.md`](SHOP.md)，AI 服务配置见 [`SHOP_AI.md`](SHOP_AI.md)，初始商品与照片来源见 [`docs/SHOP_CATALOG.md`](docs/SHOP_CATALOG.md)。

## 构建与部署

本地提交前建议运行：

```bash
npm test
npm run build
```

GitHub Actions 配置位于 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)，触发条件是向 `main` 推送、创建针对 `main` 的 Pull Request，或手动运行工作流。

工作流使用 Node.js 22，安装依赖后运行测试和构建，并将 `dist/` 发布到 GitHub Pages。若 CMS 刚提交了内容，先同步远程 `main` 再推送自己的代码，避免覆盖远程提交：

```bash
git pull --rebase origin main
git push origin main
```

## SEO 与分享信息

SEO 由 [`scripts/seo.mjs`](scripts/seo.mjs) 和构建流程统一生成。公开页面包含页面标题、描述、canonical、中文/英文 `hreflang`、社交分享图片和结构化数据；站点地图同时列出两种语言，`robots.txt` 指向站点地图。

具体规则和验证方式见 [`SEO.md`](SEO.md)。部署后可检查 `/en/about.html`、语言切换和 `/sitemap.xml`，并在 Google Search Console 提交 `https://yangzhu.org/sitemap.xml`。部署不会自动提交 Search Console，也不保证立即收录或排名。

## 安全与配置

公开前端不应包含 Mailchimp、EmailJS、GitHub OAuth 或 Cloudflare 的私密密钥。OAuth 和部署相关配置放在 Cloudflare / GitHub 的 secrets 中；[`auth/wrangler.toml`](auth/wrangler.toml) 只保存非敏感配置和变量名。

如果发现密钥曾经出现在历史提交中，应立即在对应服务后台撤销并重新生成，而不是只从当前文件删除。

## 常见检查

```bash
# 检查工作区和待提交文件
git status

# 运行全部项目测试
npm test

# 重新生成本地网站
npm run build
```

如果网站没有反映最新内容，先确认构建工作流是否成功，再等待 GitHub Pages 更新并刷新浏览器缓存。CMS 的登录、媒体、发布和冲突处理说明集中在 [`admin/guide.html`](admin/guide.html)。
