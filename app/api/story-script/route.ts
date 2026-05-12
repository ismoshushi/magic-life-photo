import { NextRequest, NextResponse } from "next/server";
import { dataUrlToBlob, type MangaStoryScript } from "@/lib/lifemanga";

export const runtime = "nodejs";
export const maxDuration = 120;

type StoryBody = {
  apiKey?: string;
  images: string[];
  previousPage?: string | null;
  userHint?: string;
  panelCount: number;
  model?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as StoryBody;
    const apiKey = body.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "缺少 OpenAI API Key。请在设置中填写，或在 Vercel 配置 OPENAI_API_KEY。" }, { status: 400 });
    }

    const model = body.model || process.env.OPENAI_SCRIPT_MODEL || "gpt-5.4-mini";
    const content: unknown[] = [
      {
        type: "text",
        text: buildStoryInstruction(Math.max(2, Math.min(body.panelCount || 6, 9)), body.userHint)
      }
    ];

    const allImages = [...(body.previousPage ? [body.previousPage] : []), ...(body.images || [])];
    if (!allImages.length) {
      return NextResponse.json({ error: "请至少上传一张参考图。" }, { status: 400 });
    }

    allImages.forEach((dataUrl) => {
      const blob = dataUrlToBlob(dataUrl);
      content.push({
        type: "image_url",
        image_url: { url: `data:${blob.type};base64,${Buffer.from(dataUrl.split(",")[1] || "", "base64").toString("base64")}` }
      });
    });

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are a professional manga storyboard writer. Return valid JSON only." },
          { role: "user", content }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 4000
      })
    });

    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json({ error: prettifyOpenAIError(res.status, text), raw: text }, { status: res.status });
    }

    const json = JSON.parse(text) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content;
    if (!raw) return NextResponse.json({ error: "OpenAI 未返回脚本内容。" }, { status: 502 });

    const script = JSON.parse(raw) as MangaStoryScript;
    if (!script.title || !Array.isArray(script.panels)) {
      return NextResponse.json({ error: "脚本 JSON 结构不完整。", raw }, { status: 502 });
    }
    return NextResponse.json({ script });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "未知错误" }, { status: 500 });
  }
}

function buildStoryInstruction(panelCount: number, userHint?: string) {
  return `
Analyze the reference photo(s) and write a ${panelCount}-panel manga script.
${userHint ? `User story direction: ${userHint}` : ""}

Return ONLY this JSON object, no markdown:
{
  "title": "<2-8 Chinese characters>",
  "synopsis": "<one or two Simplified Chinese sentences>",
  "panels": [
    {
      "description": "<English visual description: camera angle, action, mood>",
      "dialogue": "<Chinese dialogue or null>",
      "dialogueJa": "<short Japanese kana equivalent or null>",
      "narration": "<Chinese narration or null>",
      "narrationJa": "<short Japanese kana narration or null>",
      "sfx": "<Japanese katakana sound effect or null>"
    }
  ]
}

Every panel must exist. Keep dialogue short and renderable. Use null instead of empty strings.
`;
}

function prettifyOpenAIError(status: number, raw: string) {
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } };
    if (parsed.error?.message) return `OpenAI HTTP ${status}: ${parsed.error.message}`;
  } catch {
    // keep raw fallback
  }
  return `OpenAI HTTP ${status}: ${raw.slice(0, 600)}`;
}
