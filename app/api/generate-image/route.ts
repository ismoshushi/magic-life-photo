import { NextRequest, NextResponse } from "next/server";
import { buildImagePrompt, buildStoryRenderPrompt, dataUrlToBlob, type BubbleMode, type MangaStoryScript, type MangaStyleId } from "@/lib/lifemanga";

export const runtime = "nodejs";
export const maxDuration = 300;

type GenerateImageBody = {
  apiKey?: string;
  mode: "simple" | "story" | "character";
  images: string[];
  previousPage?: string | null;
  characterImages?: string[];
  characterNames?: string[];
  style: MangaStyleId;
  isColor: boolean;
  bubbleMode: BubbleMode;
  userPrompt?: string;
  n: number;
  size: string;
  quality: string;
  script?: MangaStoryScript;
  characterPrompt?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as GenerateImageBody;
    const apiKey = body.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "缺少 OpenAI API Key。请在设置中填写，或在 Vercel 配置 OPENAI_API_KEY。" }, { status: 400 });
    }

    const imageModel = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
    const prompt = body.mode === "story" && body.script
      ? buildStoryRenderPrompt(body.script, body.style, body.bubbleMode, body.isColor)
      : body.mode === "character"
        ? body.characterPrompt || "Create a clean character reference sheet."
        : buildImagePrompt({
          style: body.style,
          isColor: body.isColor,
          bubbleMode: body.bubbleMode,
          userPrompt: body.userPrompt,
          previousPage: Boolean(body.previousPage),
          characterNames: body.characterNames || []
        });

    const form = new FormData();
    form.set("model", imageModel);
    form.set("prompt", prompt);
    form.set("n", String(Math.max(1, Math.min(body.n || 1, 4))));
    form.set("size", body.size || "1024x1536");
    form.set("quality", body.quality || "medium");

    const allImages = [
      ...(body.previousPage ? [body.previousPage] : []),
      ...(body.images || []),
      ...(body.characterImages || [])
    ];

    if (!allImages.length) {
      return NextResponse.json({ error: "请至少上传一张参考图。" }, { status: 400 });
    }

    allImages.forEach((dataUrl, index) => {
      form.append("image[]", dataUrlToBlob(dataUrl), `input_${index}.jpg`);
    });

    const res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form
    });

    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json({ error: prettifyOpenAIError(res.status, text), raw: text }, { status: res.status });
    }

    const json = JSON.parse(text) as { data?: { b64_json?: string; url?: string }[] };
    const images: string[] = [];
    for (const item of json.data || []) {
      if (item.b64_json) {
        images.push(`data:image/png;base64,${item.b64_json}`);
      } else if (item.url) {
        const imageRes = await fetch(item.url);
        const buffer = Buffer.from(await imageRes.arrayBuffer());
        images.push(`data:${imageRes.headers.get("content-type") || "image/png"};base64,${buffer.toString("base64")}`);
      }
    }

    if (!images.length) {
      return NextResponse.json({ error: "OpenAI 返回了空结果。" }, { status: 502 });
    }
    return NextResponse.json({ images });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "未知错误" }, { status: 500 });
  }
}

function prettifyOpenAIError(status: number, raw: string) {
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string; code?: string } };
    if (parsed.error?.message) return `OpenAI HTTP ${status}: ${parsed.error.message}`;
  } catch {
    // keep raw fallback
  }
  if (status === 403) return "OpenAI 拒绝请求：请确认组织已验证，并且模型有权限。";
  if (status === 429) return "OpenAI 额度或频率限制，请检查 Billing 或稍后重试。";
  if (status >= 500) return "OpenAI 服务端暂时异常，请稍后重试。";
  return `OpenAI HTTP ${status}: ${raw.slice(0, 600)}`;
}
