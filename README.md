# LifeManga Vercel

这是基于 `iam567/LifeManga` 的 Web/Vercel 复刻版。原项目是 iOS SwiftUI，本项目把核心体验迁移为 Next.js：

- 多图上传、前一张续接、角色库参考图
- 8 种漫画风格、黑白/彩色、5 种气泡文字模式
- 普通图片转漫画、故事模式先编剧再作画
- 工程、历史、收藏、角色库、任务日志、60 秒重复请求拦截
- OpenAI 调用经由 Vercel API Route 代理，支持环境变量或页面内 API Key

## 本地运行

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`。

## Vercel 部署

1. 推送本目录到 GitHub。
2. 在 Vercel 导入项目。
3. 可选：设置 `OPENAI_API_KEY`、`OPENAI_IMAGE_MODEL`、`OPENAI_SCRIPT_MODEL`。

如果不设置 `OPENAI_API_KEY`，用户也可以在页面设置里填写自己的 Key；Key 会保存在浏览器本地，并只在请求生成时发给本项目的 API Route。
