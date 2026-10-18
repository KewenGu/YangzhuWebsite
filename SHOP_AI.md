# 商品 AI 助手

后台商品编辑器提供两项辅助功能：把已有商品资料整理为中英文文案，以及根据真实参考照片制作商品展示图。两项功能只产生待审核草稿，**不会自动保存、发布、修改价格或创建 Stripe 收款链接**。

商品 SEO/GEO 随网站构建自动完成，不依赖这里的 AI 助手。搜索标题、摘要、图片基础替代文本、购买问答及结构化数据由最新商品资料生成，编辑者无需手动设置，也不需要点击生成按钮或消耗 AI 额度。以下 AI 功能用于改善商品正文和制作补充展示图，仍需核对真实商品信息。

## 使用流程

1. 在后台的商品栏目填写中文名称和商品介绍。把已确认的材质、尺寸、包含物等填入商品细节；不知道的内容不要填写。
2. 生成文案后，逐项检查中英文名称、介绍、文化含义、规格和常见问题。选择需要的字段后应用；已有内容默认不被覆盖。搜索标题与摘要会从确认后的商品资料自动生成，不需另行审核或应用 AI 搜索字段。
3. 制作展示图时，选择实拍参考照片，填写背景或构图要求。图片必须为 JPG、PNG 或 WebP，文件不超过 6 MiB。
4. 对照实拍原图核对生成图中的符纹、题字、雕刻、尺寸比例和颜色。若这些细节被改写，丢弃生成图，继续使用原图。
5. 审核后下载生成图，通过后台正常上传入口加入商品图片，并标记为 AI 辅助图片。保留至少一张实拍图，让访客能辨别实际商品。
6. 按正常的保存、预览、发布流程上架商品。

模型不能核实物料、开光情况、来源、库存、运费、退货条件或宗教效果。提示词要求只依据已提供事实写作，但这不是事实校验保证。传统文化中的护佑、吉祥等寓意应当表述为文化象征，不能保证财富、健康、学业或其他结果。图片编辑也不能保证完全保留每一个符纹笔画，因此必须核对后再使用。

## 服务配置

服务入口位于现有 Cloudflare OAuth Worker，代码为 [`auth/shop-ai.mjs`](auth/shop-ai.mjs)，由 [`auth/worker.mjs`](auth/worker.mjs) 转发。前端使用已有后台 GitHub 登录凭据；第三方 AI 的密钥只保存在 Worker。

| 配置 | 用途 |
| --- | --- |
| `CMS_ORIGIN` | 后台页面的准确 HTTPS 来源，例如 `https://yangzhu.org` |
| `AUTH_ORIGIN` | Worker 的准确来源，必须与请求目标相同 |
| `ALLOWED_USERS` | 允许使用后台的 GitHub 用户名，逗号分隔 |
| `AI` | 已有 Workers AI 绑定，用于中英文商品文案 |
| `SHOP_COPY_MODEL` | 可选；默认 `@cf/meta/llama-3.3-70b-instruct-fp8-fast` |
| `OPENAI_API_KEY` | 图片编辑所需的 **Worker secret**，必须有对应图片模型的使用权限和额度 |
| `OPENAI_IMAGE_MODEL` | 可选；默认 `gpt-image-1.5`，也可配置账号已开通的 GPT Image 编辑模型 |
| `SHOP_AI_RATE_LIMIT` | 可选 Cloudflare rate limiter 绑定，提供额外的服务级限流 |

配置图片密钥时，在本项目目录执行：

```bash
npx wrangler secret put OPENAI_API_KEY --config auth/wrangler.toml
```

在命令的交互提示中输入密钥。不要把密钥写进仓库、`admin/`、公开配置或命令参数。此命令只说明部署步骤；实现功能时不会替管理员创建密钥、购买额度或改变现有部署。

仅更新 GitHub Pages 不会更新 Worker。先根据 [`auth/wrangler.toml`](auth/wrangler.toml) 检查原有 OAuth 来源、允许账号和 secret 配置，再部署新版 Worker：

```bash
npx wrangler deploy --config auth/wrangler.toml
```

若未配置图片密钥，文案功能仍可独立运行，图片按钮会返回明确的未配置提示。提交源码不代表图片 AI 已在线可用。

## API 契约

两个接口均使用 `POST`、`Content-Type: application/json` 和 `Authorization: Bearer <当前 GitHub 登录 token>`。只接受来自 `CMS_ORIGIN` 的请求，每次都向 GitHub 验证用户在允许列表中，并确认其对 `KewenGu/YangzhuWebsite` 有推送权限。

### `POST /shop-ai/copy`

```json
{
  "product": {
    "title": "净字吊坠",
    "title_en": "Jing Character Pendant",
    "body": "以净明派净字纹样表达清静的传统文化寓意。",
    "category": "pendants",
    "details": "图案：净字纹样",
    "facts": "仅填写已确认、允许用于商品文案的资料。"
  }
}
```

`title` 和 `body` 必填；其余字段可省略，均为纯文字。单次 JSON 不超过 48 KiB，所有字段合计不超过 12000 字。名称最多 200 字、介绍最多 6000 字、细节及补充事实各最多 4000 字、分类最多 100 字。

成功返回：

```json
{
  "draft": {
    "title_en": "Jing Character Pendant",
    "summary": "以净字纹样寄托清静之意的文化饰品。",
    "summary_en": "A pendant expressing the traditional symbolism of clarity through the Jing character.",
    "body": "经整理的中文商品介绍。",
    "body_en": "Reviewed English product description draft.",
    "details": "图案：净字纹样",
    "details_en": "Motif: Jing character",
    "faq": "问：图案是什么？\n答：净字纹样。",
    "faq_en": "Q: What is the motif?\nA: The Jing character.",
    "image_prompt": "基于真实原图制作展示图，完整保留商品及所有符纹。"
  },
  "review_required": true
}
```

所有文案字段均为字符串；`details` 和 `faq` 不是数组。细节每行一条“属性：值”，FAQ 使用问答两行、问题之间空一行，只补充文化、图案或用途说明；价格、库存、购买与配送信息由商品及商店设置自动产生，不在 FAQ 中重复维护。资料不足时细节和 FAQ 可以为空。服务端验证字段是否完整、长度和纯文字格式，并保留输入中已有的英文商品名称。响应不包含独立 SEO 字段，避免商品更新后仍沿用旧搜索文案。

### `POST /shop-ai/image`

请求字段为 `product`、`image` 和可选的 `prompt`。`product` 与文案接口结构相同；`image` 是 `{ "base64": "原图文件的 base64 编码，不含 data 前缀", "mime": "image/jpeg" }`。`prompt` 最多 2000 字，用于补充构图要求。请求 JSON 总大小最多 9 MiB，参考图解码后最多 6 MiB。

接口只接受直接上传的图片数据，不接受任意远程图片 URL，避免服务器被用于访问其他地址。它使用官方 `POST https://api.openai.com/v1/images/edits`，真正把参考图发送给图片模型，不会以纯文字重新猜测商品。每次生成一张 1024 × 1024 的高质量 WebP。对于 `gpt-image-1` 和 `gpt-image-1.5`，另外启用 `input_fidelity: high`。

返回 `{ "image": { "base64": "生成图的 base64 编码", "mime": "image/webp" }, "review_required": true }`。返回结果不会写入 GitHub，也不含提供商密钥。

接口实现依据：[OpenAI 图片编辑 API](https://developers.openai.com/api/reference/resources/images/methods/edit)。图片模型权限、费用和供应情况由管理员的 API 账户决定。

## 限制与故障处理

- 请求与响应均设置大小上限；仅接受 PNG/JPEG/WebP 的有效文件签名，拒绝 HTML 和 SVG 图片输入。
- 同一 Worker 实例中每位编辑同一种操作同时只允许一个请求；文案每分钟最多 6 次，图片每 5 分钟最多 2 次。此内存限流会随实例重启而重置，并不是全局计费额度上限。生产环境应另行配置 Cloudflare rate limiter 和提供商的使用预算。
- GitHub 验证每次最长 10 秒，文案等待最多 60 秒，图片请求最多 150 秒。超时不会自动重试，避免重复生成费用。
- `400`：资料格式不正确；`401/403`：重新登录或检查协作权限；`413`：缩短文字或压缩图片；`429`：稍后重试或检查提供商额度；`502`：提供商失败或结果无效；`503`：管理员尚未配置服务。
- 错误信息不回传上游响应内容或密钥；AI 请求结果禁止缓存。
- 上传参考照片意味着把该照片发送给配置的图片服务商。仅上传有权使用的商品照片。

本地回归验证使用模拟 GitHub 和 AI 服务，不会调用付费接口：

```bash
node --test tests/shop-ai.test.mjs tests/translation.test.mjs
```
