export type MangaStyleId =
  | "shonenJump"
  | "sliceOfLife"
  | "darkSeinen"
  | "retroGekiga"
  | "chibi4Koma"
  | "sportsHotBlooded"
  | "scifiMecha"
  | "horrorSuspense";

export type BubbleMode = "chinese" | "japanese" | "english" | "empty" | "none";
export type JobStatus = "running" | "done" | "failed" | "timeoutUnknown";

export type MangaPanel = {
  description: string;
  dialogue?: string | null;
  dialogueJa?: string | null;
  narration?: string | null;
  narrationJa?: string | null;
  sfx?: string | null;
};

export type MangaStoryScript = {
  title: string;
  synopsis: string;
  panels: MangaPanel[];
};

export type MangaProject = {
  id: string;
  name: string;
  notes?: string;
  coverItemId?: string;
  createdAt: string;
  updatedAt: string;
};

export type CharacterCard = {
  id: string;
  name: string;
  bio?: string;
  artStyle: CharacterArtStyleId;
  sourceImage?: string;
  views: { id: string; label: string; image: string; createdAt: string }[];
  createdAt: string;
  updatedAt: string;
};

export type MangaItem = {
  id: string;
  projectId: string;
  createdAt: string;
  style: MangaStyleId;
  inputImages: string[];
  outputImages: string[];
  userPrompt?: string;
  storyScript?: MangaStoryScript;
  isFavorite: boolean;
};

export type JobLog = {
  id: string;
  jobId: string;
  time: string;
  level: "INFO" | "SUCCESS" | "WARNING" | "ERROR" | "DETAIL";
  message: string;
};

export type JobRecord = {
  id: string;
  projectId: string;
  projectName: string;
  status: JobStatus;
  kind: "simpleImage" | "storyScript" | "storyRender" | "characterSheet";
  style: MangaStyleId;
  startedAt: string;
  finishedAt?: string;
  requestHash: string;
  message: string;
  errorCode?: string;
  logs: JobLog[];
};

export type AppSettings = {
  apiKey: string;
  imageCount: number;
  imageSize: string;
  imageQuality: string;
  scriptModel: string;
  defaultStyle: MangaStyleId;
  bubbleTextMode: BubbleMode;
  isColor: boolean;
  storyModeOn: boolean;
  panelCount: number;
};

export type CharacterArtStyleId =
  | "jpAnime"
  | "usComics"
  | "krManhwa"
  | "kawaii"
  | "chibi"
  | "render3D"
  | "semiReal"
  | "watercolor"
  | "pixelArt";

export const DEFAULT_SETTINGS: AppSettings = {
  apiKey: "",
  imageCount: 1,
  imageSize: "1024x1536",
  imageQuality: "medium",
  scriptModel: "gpt-5.4-mini",
  defaultStyle: "shonenJump",
  bubbleTextMode: "chinese",
  isColor: false,
  storyModeOn: false,
  panelCount: 6
};

export const IMAGE_SIZES = ["1024x1024", "1024x1536", "1536x1024", "2048x2048", "2160x3840", "3840x2160", "auto"];
export const IMAGE_QUALITIES = ["low", "medium", "high", "auto"];

export const BUBBLE_MODES: { id: BubbleMode; label: string; hint: string }[] = [
  { id: "chinese", label: "中文", hint: "气泡中渲染中文台词" },
  { id: "japanese", label: "日文假名", hint: "气泡中渲染短日文假名" },
  { id: "english", label: "英文", hint: "气泡中渲染英文翻译" },
  { id: "empty", label: "留空", hint: "画气泡但不写字" },
  { id: "none", label: "无气泡", hint: "完全不画对话框" }
];

export const MANGA_STYLES: Record<MangaStyleId, { name: string; subtitle: string; icon: string; preview: string; prompt: string }> = {
  shonenJump: {
    name: "经典少年 Jump",
    subtitle: "清晰线条、强动作感、热血分镜",
    icon: "bolt",
    preview: "linear-gradient(135deg,#fff 0 40%,#f2cf55 40% 48%,#fff 48% 58%,#111 58% 62%,#fff 62%)",
    prompt: "Modern mainstream Weekly Shonen Jump manga style. Clean confident inking, strong line-weight variation, expressive eyes, dynamic but readable poses, sharp hair silhouettes, sparse screen-tone, generous white space, crisp printed manga readability."
  },
  sliceOfLife: {
    name: "日常治愈",
    subtitle: "温柔、干净、生活感",
    icon: "leaf",
    preview: "linear-gradient(135deg,#ffe3ea,#fff0c8,#dbeecf)",
    prompt: "Gentle modern Japanese slice-of-life manga style. Soft clean ink lines, calm warm composition, simplified uncluttered backgrounds, delicate shading, lots of negative space, clean speech bubbles."
  },
  darkSeinen: {
    name: "暗黑剧情",
    subtitle: "成熟比例、强明暗、电影感",
    icon: "masks",
    preview: "linear-gradient(135deg,#111,#393734 48%,#f4ead8 49%,#191713)",
    prompt: "Modern seinen manga style. Sharp confident inking, strong contrast, large solid-black shadow shapes versus clean white skin, mature stylized proportions, cinematic silhouettes, controlled screen tones."
  },
  retroGekiga: {
    name: "复古剧画",
    subtitle: "70-80 年代印刷质感",
    icon: "book",
    preview: "repeating-linear-gradient(0deg,#e9d59f,#e9d59f 5px,#c7a869 6px)",
    prompt: "Retro 1970s-80s Japanese gekiga manga style. Realistic but stylized hand-inked lines, deliberate crosshatching for clothing and backgrounds, vintage screen-tone patterns, finished printed page feel."
  },
  chibi4Koma: {
    name: "萌系四格",
    subtitle: "Q 版、轻松、可爱喜剧",
    icon: "heart",
    preview: "radial-gradient(circle at 20% 20%,#ff8ab0 0 4px,transparent 5px),radial-gradient(circle at 65% 55%,#f7b7cf 0 4px,transparent 5px),#fff0f5",
    prompt: "Cute chibi 4-koma comedy manga style. Super-deformed rounded character proportions, large simple eyes, clean thin confident ink lines, almost no shading, airy composition, tasteful cute symbols."
  },
  sportsHotBlooded: {
    name: "运动热血",
    subtitle: "速度线、汗水、爆发力",
    icon: "flame",
    preview: "linear-gradient(135deg,#f7b733,#dd3f2f)",
    prompt: "Modern sports manga style. Dynamic action, dramatic foreshortened poses, intense determined expressions, purposeful speed lines, sweat drops and motion effects, simplified backgrounds."
  },
  scifiMecha: {
    name: "科幻机甲",
    subtitle: "机械细节、透视、冷光",
    icon: "cpu",
    preview: "linear-gradient(135deg,#12314b,#0b1119 70%),linear-gradient(90deg,#44d7ff,#44d7ff)",
    prompt: "Detailed sci-fi mecha manga style. Mechanical and architectural elements with precise ruler-clean lines, accurate perspective, thoughtful screen tones on metal surfaces, hard sci-fi atmosphere."
  },
  horrorSuspense: {
    name: "悬疑氛围",
    subtitle: "心理紧张、非血腥恐怖",
    icon: "eye",
    preview: "linear-gradient(135deg,#777,#1d1c1a 70%)",
    prompt: "Atmospheric mystery-thriller manga style. Controlled crosshatching, cinematic chiaroscuro, long shadows, off-kilter camera angles, empty corridors, suspenseful psychological mood. No blood, wounds, gore, monsters, body horror, weapons, death, or harm."
  }
};

export const CHARACTER_STYLES: Record<CharacterArtStyleId, { name: string; prompt: string }> = {
  jpAnime: { name: "日漫", prompt: "Modern Japanese anime/manga character illustration, clean cel-shaded coloring, crisp confident lineart, expressive eyes." },
  usComics: { name: "美漫", prompt: "Modern American graphic-novel character illustration, bold confident inking, strong line-weight variation, dramatic tasteful shadows." },
  krManhwa: { name: "韩漫", prompt: "Modern Korean webtoon character illustration, polished glossy digital color, refined eyes, cinematic lighting." },
  kawaii: { name: "可爱", prompt: "Soft kawaii illustration style with pastel palette, rounded shapes, gentle peaceful atmosphere, adult character structure." },
  chibi: { name: "Q 版", prompt: "Stylized chibi super-deformed cartoon style applied to an adult character, simplified rounded body, cute comedic mascot aesthetic." },
  render3D: { name: "3D 渲染", prompt: "Modern 3D-animated film character illustration, soft realistic lighting, stylized rendered look." },
  semiReal: { name: "半写实", prompt: "Semi-realistic illustration halfway between anime and realism, smooth realistic skin shading, polished portrait aesthetic." },
  watercolor: { name: "水彩", prompt: "Traditional watercolor illustration style, soft loose washes, visible paper texture, romantic hand-painted feel." },
  pixelArt: { name: "像素", prompt: "16-bit JRPG pixel-art character portrait, visible square pixels, limited vivid retro palette, deliberate dithering." }
};

export function effectivePrompt(style: MangaStyleId, isColor: boolean) {
  const cleanRule = "Clean confident ink lines, generous white space, no sketchy pencil roughness, readable at thumbnail size.";
  const mode = isColor
    ? "FULL COLOR manga illustration with vivid harmonious colors, clean cel-shading, strong linework."
    : "PURE BLACK AND WHITE manga ink art, no colors, solid blacks and sparse screen-tone.";
  return `${mode}\n\nSTYLE GUIDE:\n${MANGA_STYLES[style].prompt}\n\n${cleanRule}`;
}

export function buildImagePrompt(input: {
  style: MangaStyleId;
  isColor: boolean;
  bubbleMode: BubbleMode;
  userPrompt?: string;
  previousPage: boolean;
  characterNames: string[];
}) {
  const bubble = {
    chinese: "Render clean speech bubbles with Simplified Chinese text when dialogue is implied.",
    japanese: "Render clean speech bubbles with short Japanese kana text.",
    english: "Render clean speech bubbles with concise English text.",
    empty: "Draw clean empty speech bubbles but leave them completely blank.",
    none: "Do not draw speech bubbles or caption boxes."
  }[input.bubbleMode];
  const prev = input.previousPage ? "One attached image is the previous manga page; continue its style, character design, and story flow." : "";
  const chars = input.characterNames.length
    ? `Recurring character references are attached: ${input.characterNames.join(", ")}. Match their faces, hair, outfits, and design exactly.`
    : "";
  return [
    "Transform the user's real-life reference photo(s) into a polished manga page.",
    effectivePrompt(input.style, input.isColor),
    bubble,
    prev,
    chars,
    input.userPrompt ? `USER DIRECTION: ${input.userPrompt}` : "",
    "Keep the final image original, safe, fully clothed, non-graphic, and compositionally readable."
  ].filter(Boolean).join("\n\n");
}

export function buildStoryRenderPrompt(script: MangaStoryScript, style: MangaStyleId, bubbleMode: BubbleMode, isColor: boolean) {
  const lines = [
    "Create a single full Japanese manga page using the supplied photos as references.",
    effectivePrompt(style, isColor),
    `Layout ${script.panels.length} panels in a clear manga grid with gutters and varied panel sizes.`,
    bubbleMode === "none" ? "Do not draw any speech bubbles or caption boxes." : "",
    bubbleMode === "empty" ? "Draw bubbles/caption boxes where relevant, but leave them empty." : "",
    `Title: ${script.title}`,
    `Synopsis: ${script.synopsis}`,
    "Panels:"
  ];
  script.panels.forEach((panel, index) => {
    lines.push(`Panel ${index + 1}: ${panel.description}`);
    if (bubbleMode === "chinese") {
      if (panel.dialogue) lines.push(`Speech bubble Chinese text: ${panel.dialogue}`);
      if (panel.narration) lines.push(`Narration Chinese text: ${panel.narration}`);
    } else if (bubbleMode === "japanese") {
      if (panel.dialogueJa || panel.dialogue) lines.push(`Speech bubble short Japanese kana: ${panel.dialogueJa || panel.dialogue}`);
      if (panel.narrationJa || panel.narration) lines.push(`Narration short Japanese: ${panel.narrationJa || panel.narration}`);
    } else if (bubbleMode === "english") {
      if (panel.dialogue) lines.push(`Speech bubble natural English translation of: ${panel.dialogue}`);
      if (panel.narration) lines.push(`Narration natural English translation of: ${panel.narration}`);
    }
    if (panel.sfx && bubbleMode !== "none") lines.push(`Stylized sound effect lettering: ${panel.sfx}`);
  });
  return lines.filter(Boolean).join("\n");
}

export function hashRequest(value: unknown) {
  const str = JSON.stringify(value);
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
  }
  return Math.abs(hash).toString(36);
}

export function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function dataUrlToBlob(dataUrl: string) {
  const [meta, base64] = dataUrl.split(",");
  const mime = /data:(.*?);base64/.exec(meta)?.[1] || "image/jpeg";
  const bytes = Buffer.from(base64, "base64");
  return new Blob([bytes], { type: mime });
}
