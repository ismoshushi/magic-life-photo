"use client";

import { ChangeEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Camera,
  CheckCircle2,
  Cpu,
  Download,
  Eye,
  Flame,
  Heart,
  History,
  ImagePlus,
  KeyRound,
  Layers,
  Leaf,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  ScrollText,
  Settings,
  Sparkles,
  Star,
  Trash2,
  Upload,
  UserRound,
  X
} from "lucide-react";
import {
  BUBBLE_MODES,
  CHARACTER_STYLES,
  DEFAULT_SETTINGS,
  IMAGE_QUALITIES,
  IMAGE_SIZES,
  MANGA_STYLES,
  buildImagePrompt,
  hashRequest,
  uid,
  type AppSettings,
  type BubbleMode,
  type CharacterArtStyleId,
  type CharacterCard,
  type JobLog,
  type JobRecord,
  type MangaItem,
  type MangaProject,
  type MangaStoryScript,
  type MangaStyleId
} from "@/lib/lifemanga";

type Tab = "create" | "history" | "characters" | "jobs" | "settings";

const STORAGE_KEY = "lifemanga.vercel.state.v1";
const initialProject = (): MangaProject => ({
  id: uid("project"),
  name: "我的第一部漫画",
  notes: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

type PersistedState = {
  projects: MangaProject[];
  activeProjectId: string;
  items: MangaItem[];
  characters: CharacterCard[];
  jobs: JobRecord[];
  settings: AppSettings;
};

const emptyState = (): PersistedState => {
  const project = initialProject();
  return {
    projects: [project],
    activeProjectId: project.id,
    items: [],
    characters: [],
    jobs: [],
    settings: DEFAULT_SETTINGS
  };
};

export default function Page() {
  const [state, setState] = useState<PersistedState>(() => emptyState());
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>("create");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [previousPage, setPreviousPage] = useState<string | null>(null);
  const [loadedCharacterIds, setLoadedCharacterIds] = useState<string[]>([]);
  const [style, setStyle] = useState<MangaStyleId>("shonenJump");
  const [isColor, setIsColor] = useState(false);
  const [bubbleMode, setBubbleMode] = useState<BubbleMode>("chinese");
  const [storyMode, setStoryMode] = useState(false);
  const [panelCount, setPanelCount] = useState(6);
  const [userPrompt, setUserPrompt] = useState("");
  const [script, setScript] = useState<MangaStoryScript | null>(null);
  const [outputs, setOutputs] = useState<string[]>([]);
  const [phase, setPhase] = useState<"idle" | "script" | "scriptReady" | "image" | "done">("idle");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [characterModal, setCharacterModal] = useState(false);
  const [newCharacter, setNewCharacter] = useState({ name: "", bio: "", artStyle: "jpAnime" as CharacterArtStyleId, image: "" });

  const imageInput = useRef<HTMLInputElement>(null);
  const previousInput = useRef<HTMLInputElement>(null);
  const characterInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as PersistedState;
        setState({ ...emptyState(), ...parsed, settings: { ...DEFAULT_SETTINGS, ...parsed.settings } });
      } catch {
        setState(emptyState());
      }
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [loaded, state]);

  useEffect(() => {
    setStyle(state.settings.defaultStyle);
    setBubbleMode(state.settings.bubbleTextMode);
    setIsColor(state.settings.isColor);
    setStoryMode(state.settings.storyModeOn);
    setPanelCount(state.settings.panelCount);
  }, [state.settings.defaultStyle, state.settings.bubbleTextMode, state.settings.isColor, state.settings.storyModeOn, state.settings.panelCount]);

  const activeProject = state.projects.find((p) => p.id === state.activeProjectId) || state.projects[0];
  const projectItems = state.items.filter((item) => item.projectId === activeProject.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const loadedCharacters = state.characters.filter((c) => loadedCharacterIds.includes(c.id));
  const canGenerate = selectedImages.length > 0 && phase !== "script" && phase !== "image";

  const header = useMemo(() => ({
    create: ["创作", "选择照片、风格、角色与故事模式"],
    history: ["历史", "当前工程里的作品与收藏"],
    characters: ["角色库", "生成和复用角色设定稿"],
    jobs: ["任务", "请求日志、状态与重试入口"],
    settings: ["设置", "模型、尺寸、质量与 API Key"]
  }[tab]), [tab]);

  function updateSettings(patch: Partial<AppSettings>) {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  }

  function addProject() {
    const name = prompt("工程名称")?.trim();
    if (!name) return;
    const project: MangaProject = { ...initialProject(), name };
    setState((s) => ({ ...s, projects: [project, ...s.projects], activeProjectId: project.id }));
  }

  function addLog(jobId: string, level: JobLog["level"], messageText: string) {
    setState((s) => ({
      ...s,
      jobs: s.jobs.map((job) => job.id === jobId
        ? { ...job, logs: [{ id: uid("log"), jobId, time: new Date().toISOString(), level, message: messageText }, ...job.logs].slice(0, 200), message: messageText }
        : job)
    }));
  }

  function startJob(kind: JobRecord["kind"], requestHash: string) {
    const job: JobRecord = {
      id: uid("job"),
      projectId: activeProject.id,
      projectName: activeProject.name,
      status: "running",
      kind,
      style,
      startedAt: new Date().toISOString(),
      requestHash,
      message: "任务已创建",
      logs: []
    };
    setState((s) => ({ ...s, jobs: [job, ...s.jobs] }));
    return job.id;
  }

  function finishJob(jobId: string, status: JobRecord["status"], text: string, errorCode?: string) {
    setState((s) => ({
      ...s,
      jobs: s.jobs.map((job) => job.id === jobId ? { ...job, status, message: text, errorCode, finishedAt: new Date().toISOString() } : job)
    }));
    addLog(jobId, status === "done" ? "SUCCESS" : "ERROR", text);
  }

  async function readFiles(event: ChangeEvent<HTMLInputElement>, setter: (images: string[]) => void) {
    const files = Array.from(event.target.files || []);
    const loadedImages = await Promise.all(files.map(fileToDataUrl));
    setter(loadedImages);
    event.target.value = "";
  }

  async function generate() {
    setError("");
    setOutputs([]);
    if (!selectedImages.length) {
      setError("请先选择至少一张素材图。");
      return;
    }

    if (storyMode && phase !== "scriptReady") {
      await generateScript();
      return;
    }
    await generateImage(storyMode ? "story" : "simple");
  }

  async function generateScript() {
    const requestHash = hashRequest({ selectedImages, previousPage, userPrompt, panelCount, model: state.settings.scriptModel });
    const duplicate = state.jobs.find((j) => j.requestHash === requestHash && Date.now() - new Date(j.startedAt).getTime() < 60000);
    if (duplicate) {
      setError(`60 秒内有相同脚本请求，为避免重复扣费已拦截。任务：${duplicate.id}`);
      return;
    }

    const jobId = startJob("storyScript", requestHash);
    setPhase("script");
    setMessage("AI 正在读取照片并编写分镜脚本");
    addLog(jobId, "INFO", "提交故事脚本请求");

    try {
      const res = await fetch("/api/story-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: state.settings.apiKey,
          images: selectedImages,
          previousPage,
          userHint: userPrompt,
          panelCount,
          model: state.settings.scriptModel
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "脚本生成失败");
      setScript(data.script);
      setPhase("scriptReady");
      setMessage("脚本已生成，可以编辑后再作画");
      finishJob(jobId, "done", "脚本生成完成");
    } catch (err) {
      const text = err instanceof Error ? err.message : "脚本生成失败";
      setError(text);
      setPhase("idle");
      finishJob(jobId, "failed", text, "SCRIPT_ERROR");
    }
  }

  async function generateImage(mode: "simple" | "story" | "character" = "simple", character?: CharacterCard) {
    const characterImages = character ? [character.sourceImage || ""].filter(Boolean) : loadedCharacters.flatMap((c) => c.views[0]?.image ? [c.views[0].image] : []);
    const body = mode === "character"
      ? {
        mode,
        apiKey: state.settings.apiKey,
        images: characterImages,
        style,
        isColor: true,
        bubbleMode,
        n: 1,
        size: state.settings.imageSize,
        quality: state.settings.imageQuality,
        characterPrompt: buildCharacterPrompt(character!)
      }
      : {
        mode,
        apiKey: state.settings.apiKey,
        images: selectedImages,
        previousPage,
        characterImages,
        characterNames: loadedCharacters.map((c) => c.name),
        style,
        isColor,
        bubbleMode,
        userPrompt,
        n: state.settings.imageCount,
        size: state.settings.imageSize,
        quality: state.settings.imageQuality,
        script: mode === "story" ? script : undefined
      };

    const requestHash = hashRequest(body);
    const duplicate = state.jobs.find((j) => j.requestHash === requestHash && Date.now() - new Date(j.startedAt).getTime() < 60000);
    if (duplicate) {
      setError(`60 秒内有相同绘图请求，为避免重复扣费已拦截。任务：${duplicate.id}`);
      return;
    }

    const jobId = startJob(mode === "character" ? "characterSheet" : mode === "story" ? "storyRender" : "simpleImage", requestHash);
    setPhase("image");
    setMessage("AI 正在绘制漫画，复杂图可能需要 1-5 分钟");
    addLog(jobId, "INFO", "提交图片生成请求");

    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "图片生成失败");
      const images = data.images as string[];
      if (mode === "character" && character) {
        setState((s) => ({
          ...s,
          characters: s.characters.map((c) => c.id === character.id
            ? { ...c, views: [{ id: uid("view"), label: "正面设定稿", image: images[0], createdAt: new Date().toISOString() }, ...c.views], updatedAt: new Date().toISOString() }
            : c)
        }));
        setTab("characters");
      } else {
        setOutputs(images);
        const item: MangaItem = {
          id: uid("item"),
          projectId: activeProject.id,
          createdAt: new Date().toISOString(),
          style,
          inputImages: selectedImages,
          outputImages: images,
          userPrompt,
          storyScript: script || undefined,
          isFavorite: false
        };
        setState((s) => ({
          ...s,
          items: [item, ...s.items],
          projects: s.projects.map((p) => p.id === activeProject.id ? { ...p, coverItemId: item.id, updatedAt: new Date().toISOString() } : p)
        }));
      }
      setPhase("done");
      setMessage("生成完成");
      finishJob(jobId, "done", "图片生成完成");
    } catch (err) {
      const text = err instanceof Error ? err.message : "图片生成失败";
      setError(text);
      setPhase(mode === "story" && script ? "scriptReady" : "idle");
      const code = text.toLowerCase().includes("timeout") ? "TIMEOUT_UNKNOWN" : "IMAGE_ERROR";
      finishJob(jobId, code === "TIMEOUT_UNKNOWN" ? "timeoutUnknown" : "failed", text, code);
    }
  }

  function saveCharacter() {
    if (!newCharacter.name.trim() || !newCharacter.image) {
      setError("请填写角色名并上传参考照片。");
      return;
    }
    const now = new Date().toISOString();
    const character: CharacterCard = {
      id: uid("char"),
      name: newCharacter.name.trim(),
      bio: newCharacter.bio.trim(),
      artStyle: newCharacter.artStyle,
      sourceImage: newCharacter.image,
      views: [],
      createdAt: now,
      updatedAt: now
    };
    setState((s) => ({ ...s, characters: [character, ...s.characters] }));
    setNewCharacter({ name: "", bio: "", artStyle: "jpAnime", image: "" });
    setCharacterModal(false);
  }

  function resetCreate() {
    setSelectedImages([]);
    setPreviousPage(null);
    setLoadedCharacterIds([]);
    setUserPrompt("");
    setScript(null);
    setOutputs([]);
    setPhase("idle");
    setMessage("");
    setError("");
  }

  function retryJob(job: JobRecord) {
    setState((s) => ({ ...s, activeProjectId: job.projectId }));
    setStyle(job.style);
    setTab("create");
    setError("已回到创作页。请确认输入图仍在当前页面后手动重新生成，避免不知情重复扣费。");
  }

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark"><Sparkles size={22} /></div>
          <div>
            <h1>漫画人生</h1>
            <p>LifeManga Web</p>
          </div>
        </div>
        <nav>
          <NavButton tab="create" active={tab} setTab={setTab} icon={<ImagePlus size={18} />} label="创作" />
          <NavButton tab="history" active={tab} setTab={setTab} icon={<History size={18} />} label="历史" />
          <NavButton tab="characters" active={tab} setTab={setTab} icon={<UserRound size={18} />} label="角色库" />
          <NavButton tab="jobs" active={tab} setTab={setTab} icon={<ScrollText size={18} />} label="任务" />
          <NavButton tab="settings" active={tab} setTab={setTab} icon={<Settings size={18} />} label="设置" />
        </nav>
        <div className="sidebarSection">
          <div className="sidebarTitle">
            <span>工程</span>
            <button className="iconButton" onClick={addProject} title="新建工程"><Plus size={16} /></button>
          </div>
          {state.projects.map((project) => (
            <button key={project.id} className={`projectButton ${project.id === activeProject.id ? "active" : ""}`} onClick={() => setState((s) => ({ ...s, activeProjectId: project.id }))}>
              <Layers size={17} />
              <span>{project.name}</span>
            </button>
          ))}
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <h2>{header[0]}</h2>
            <p>{activeProject.name} · {header[1]}</p>
          </div>
          <div className="controls">
            {tab === "create" && <button className="btn" onClick={resetCreate}><RefreshCw size={16} />重置</button>}
            <span className={`badge ${state.settings.apiKey || process.env.NEXT_PUBLIC_HAS_OPENAI_KEY ? "good" : ""}`}><KeyRound size={14} />{state.settings.apiKey ? "已填 Key" : "未填 Key"}</span>
          </div>
        </div>

        <div className="workspace">
          {error && <div className="card" style={{ borderColor: "#dba6a0", marginBottom: 14 }}><strong>出错了：</strong> {error}</div>}
          {tab === "create" && renderCreate()}
          {tab === "history" && renderHistory()}
          {tab === "characters" && renderCharacters()}
          {tab === "jobs" && renderJobs()}
          {tab === "settings" && renderSettings()}
        </div>
      </main>

      {characterModal && (
        <div className="modalBackdrop" onClick={() => setCharacterModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="cardHeader">
              <h3 className="cardTitle"><UserRound size={18} />新建角色</h3>
              <button className="iconButton" onClick={() => setCharacterModal(false)}><X size={16} /></button>
            </div>
            <div className="stack">
              <div className="field"><label>角色名</label><input value={newCharacter.name} onChange={(e) => setNewCharacter((c) => ({ ...c, name: e.target.value }))} /></div>
              <div className="field"><label>简介</label><textarea value={newCharacter.bio} rows={3} onChange={(e) => setNewCharacter((c) => ({ ...c, bio: e.target.value }))} /></div>
              <div className="field">
                <label>设定稿风格</label>
                <select value={newCharacter.artStyle} onChange={(e) => setNewCharacter((c) => ({ ...c, artStyle: e.target.value as CharacterArtStyleId }))}>
                  {Object.entries(CHARACTER_STYLES).map(([id, info]) => <option key={id} value={id}>{info.name}</option>)}
                </select>
              </div>
              {newCharacter.image ? <img className="resultImage" src={newCharacter.image} alt="角色参考" /> : <button className="dropZone" onClick={() => characterInput.current?.click()}><Upload />上传真人参考图</button>}
              <input ref={characterInput} hidden type="file" accept="image/*" onChange={(e) => readFiles(e, (imgs) => setNewCharacter((c) => ({ ...c, image: imgs[0] || "" })))} />
              <button className="btn primary" onClick={saveCharacter}><Save size={16} />保存角色</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function renderCreate() {
    return (
      <div className="grid">
        <div className="stack">
          <section className="card">
            <div className="cardHeader"><h3 className="cardTitle"><Camera size={18} />素材图</h3><button className="btn" onClick={() => imageInput.current?.click()}><Upload size={16} />选择图片</button></div>
            <input ref={imageInput} hidden type="file" accept="image/*" multiple onChange={(e) => readFiles(e, (imgs) => setSelectedImages((old) => [...old, ...imgs]))} />
            {selectedImages.length ? <ImageThumbs images={selectedImages} remove={(i) => setSelectedImages((imgs) => imgs.filter((_, idx) => idx !== i))} /> : <button className="dropZone" onClick={() => imageInput.current?.click()}><ImagePlus />上传 1-6 张照片作为参考</button>}
          </section>

          <section className="card">
            <div className="cardHeader"><h3 className="cardTitle"><Layers size={18} />前一张续接</h3>{previousPage && <button className="btn danger" onClick={() => setPreviousPage(null)}><Trash2 size={16} />移除</button>}</div>
            <input ref={previousInput} hidden type="file" accept="image/*" onChange={(e) => readFiles(e, (imgs) => setPreviousPage(imgs[0] || null))} />
            {previousPage ? <img className="resultImage" src={previousPage} alt="前一张" /> : <button className="dropZone" onClick={() => previousInput.current?.click()}><Upload />从本地选择，或在历史里点“作为前一张”</button>}
          </section>

          <section className="card">
            <div className="cardHeader"><h3 className="cardTitle"><Sparkles size={18} />漫画风格</h3></div>
            <div className="styleGrid">
              {(Object.keys(MANGA_STYLES) as MangaStyleId[]).map((id) => <StyleChoice key={id} id={id} selected={style === id} onClick={() => setStyle(id)} />)}
            </div>
          </section>

          <section className="card">
            <div className="cardHeader"><h3 className="cardTitle"><BookOpen size={18} />故事与画面</h3></div>
            <div className="stack">
              <div className="switchRow">
                <div><strong>故事模式</strong><p className="muted small">先让 AI 写多格脚本，再编辑并作画。</p></div>
                <button className={`switch ${storyMode ? "on" : ""}`} onClick={() => setStoryMode(!storyMode)}><span /></button>
              </div>
              {storyMode && <div className="field"><label>分镜格数</label><select value={panelCount} onChange={(e) => setPanelCount(Number(e.target.value))}>{[2, 4, 6, 8, 9].map((n) => <option key={n} value={n}>{n} 格</option>)}</select></div>}
              <div className="optionGrid">
                <button className={`choice ${!isColor ? "active" : ""}`} onClick={() => setIsColor(false)}><strong>黑白</strong><span className="small muted">纯漫画墨线</span></button>
                <button className={`choice ${isColor ? "active" : ""}`} onClick={() => setIsColor(true)}><strong>彩色</strong><span className="small muted">动漫上色</span></button>
              </div>
              <div className="optionGrid">
                {BUBBLE_MODES.map((mode) => <button key={mode.id} className={`choice ${bubbleMode === mode.id ? "active" : ""}`} onClick={() => setBubbleMode(mode.id)}><strong>{mode.label}</strong><span className="small muted">{mode.hint}</span></button>)}
              </div>
              <div className="field"><label>{storyMode ? "故事方向" : "补充描述"}</label><textarea rows={4} value={userPrompt} onChange={(e) => setUserPrompt(e.target.value)} placeholder="例如：下雨天、主角戴墨镜、城市夜景、父子情..." /></div>
            </div>
          </section>

          {script && <ScriptEditor script={script} setScript={setScript} editable={phase === "scriptReady"} />}
        </div>

        <aside className="stack">
          <section className="card">
            <div className="cardHeader"><h3 className="cardTitle"><UserRound size={18} />载入角色</h3><button className="btn" onClick={() => setTab("characters")}><Plus size={16} />管理</button></div>
            {state.characters.length === 0 && <p className="muted small">角色库还是空的。先创建角色，再把设定稿加载到创作里。</p>}
            <div className="thumbGrid">
              {state.characters.map((c) => (
                <button key={c.id} className={`choice ${loadedCharacterIds.includes(c.id) ? "active" : ""}`} onClick={() => setLoadedCharacterIds((ids) => ids.includes(c.id) ? ids.filter((id) => id !== c.id) : [...ids, c.id])}>
                  <strong>{c.name}</strong><span className="small muted">{c.views.length} 张设定稿</span>
                </button>
              ))}
            </div>
          </section>

          <section className="card">
            <div className="stack">
              <button className="btn primary" disabled={!canGenerate} onClick={generate}>
                {phase === "script" || phase === "image" ? <Loader2 size={17} className="spin" /> : <Sparkles size={17} />}
                {phase === "scriptReady" ? "用这个脚本作画" : storyMode ? "生成故事脚本" : "生成漫画"}
              </button>
              {phase === "scriptReady" && <button className="btn" onClick={generateScript}><RefreshCw size={16} />重新构思脚本</button>}
              <p className="muted small">{message || "生成会调用 OpenAI，图片任务可能较慢。相同请求 60 秒内会被拦截。"}</p>
            </div>
          </section>

          {outputs.length > 0 && <section className="card"><div className="cardHeader"><h3 className="cardTitle"><CheckCircle2 size={18} />生成结果</h3></div><div className="stack">{outputs.map((img, i) => <img key={i} className="resultImage" src={img} alt={`输出 ${i + 1}`} />)}</div></section>}
          <section className="card">
            <div className="cardHeader"><h3 className="cardTitle"><ScrollText size={18} />Prompt 预览</h3></div>
            <p className="small muted" style={{ whiteSpace: "pre-wrap" }}>{buildImagePrompt({ style, isColor, bubbleMode, userPrompt, previousPage: Boolean(previousPage), characterNames: loadedCharacters.map((c) => c.name) }).slice(0, 900)}</p>
          </section>
        </aside>
      </div>
    );
  }

  function renderHistory() {
    return projectItems.length ? (
      <div className="historyGrid">
        {projectItems.map((item) => (
          <article key={item.id} className="card historyItem">
            <img src={item.outputImages[0]} alt="历史作品" />
            <div className="historyBody stack">
              <strong>{MANGA_STYLES[item.style].name}</strong>
              <span className="small muted">{new Date(item.createdAt).toLocaleString()}</span>
              <div className="controls">
                <button className="btn" onClick={() => { setPreviousPage(item.outputImages[0]); setTab("create"); }}><Layers size={16} />作为前一张</button>
                <button className="btn" onClick={() => setState((s) => ({ ...s, items: s.items.map((x) => x.id === item.id ? { ...x, isFavorite: !x.isFavorite } : x) }))}><Star size={16} />{item.isFavorite ? "取消" : "收藏"}</button>
                <a className="btn" href={item.outputImages[0]} download={`lifemanga-${item.id}.png`}><Download size={16} />下载</a>
              </div>
            </div>
          </article>
        ))}
      </div>
    ) : <EmptyCard icon={<History />} text="当前工程还没有作品。" />;
  }

  function renderCharacters() {
    return (
      <div className="stack">
        <button className="btn primary" onClick={() => setCharacterModal(true)}><Plus size={16} />新建角色</button>
        {state.characters.length ? <div className="historyGrid">{state.characters.map((c) => (
          <article key={c.id} className="card">
            <div className="cardHeader"><h3 className="cardTitle"><UserRound size={18} />{c.name}</h3><span className="badge">{CHARACTER_STYLES[c.artStyle].name}</span></div>
            <div className="thumbGrid">
              {(c.views.length ? c.views : c.sourceImage ? [{ id: "source", label: "参考图", image: c.sourceImage, createdAt: c.createdAt }] : []).map((v) => <div key={v.id}><img className="resultImage" src={v.image} alt={v.label} /><p className="small muted">{v.label}</p></div>)}
            </div>
            <p className="small muted">{c.bio}</p>
            <div className="controls">
              <button className="btn primary" onClick={() => generateImage("character", c)}><Sparkles size={16} />生成设定稿</button>
              <button className="btn" onClick={() => { setLoadedCharacterIds((ids) => ids.includes(c.id) ? ids : [...ids, c.id]); setTab("create"); }}><Layers size={16} />载入创作</button>
              <button className="btn danger" onClick={() => setState((s) => ({ ...s, characters: s.characters.filter((x) => x.id !== c.id) }))}><Trash2 size={16} />删除</button>
            </div>
          </article>
        ))}</div> : <EmptyCard icon={<UserRound />} text="角色库还是空的。" />}
      </div>
    );
  }

  function renderJobs() {
    return state.jobs.length ? <div className="stack">{state.jobs.map((job) => (
      <section key={job.id} className="card">
        <div className="cardHeader">
          <h3 className="cardTitle"><ScrollText size={18} />{job.kind}</h3>
          <span className={`badge ${job.status === "done" ? "good" : job.status === "failed" ? "bad" : ""}`}>{job.status}</span>
        </div>
        <p className="small muted">{job.projectName} · {new Date(job.startedAt).toLocaleString()} · {job.message}</p>
        <div className="controls"><button className="btn" onClick={() => retryJob(job)}><RefreshCw size={16} />回到创作页</button></div>
        <div className="logList">{job.logs.map((log) => <div key={log.id} className="logLine"><span>{new Date(log.time).toLocaleTimeString()}</span><span>{log.level}</span><span>{log.message}</span></div>)}</div>
      </section>
    ))}</div> : <EmptyCard icon={<ScrollText />} text="还没有任务日志。" />;
  }

  function renderSettings() {
    return (
      <div className="grid">
        <section className="card stack">
          <h3 className="cardTitle"><Settings size={18} />生成设置</h3>
          <div className="field"><label>OpenAI API Key</label><input type="password" value={state.settings.apiKey} onChange={(e) => updateSettings({ apiKey: e.target.value })} placeholder="sk-..." /></div>
          <div className="field"><label>默认风格</label><select value={state.settings.defaultStyle} onChange={(e) => updateSettings({ defaultStyle: e.target.value as MangaStyleId })}>{Object.entries(MANGA_STYLES).map(([id, info]) => <option key={id} value={id}>{info.name}</option>)}</select></div>
          <div className="field"><label>图片数量</label><select value={state.settings.imageCount} onChange={(e) => updateSettings({ imageCount: Number(e.target.value) })}>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}</select></div>
          <div className="field"><label>尺寸</label><select value={state.settings.imageSize} onChange={(e) => updateSettings({ imageSize: e.target.value })}>{IMAGE_SIZES.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div className="field"><label>质量</label><select value={state.settings.imageQuality} onChange={(e) => updateSettings({ imageQuality: e.target.value })}>{IMAGE_QUALITIES.map((q) => <option key={q}>{q}</option>)}</select></div>
          <div className="field"><label>脚本模型</label><input value={state.settings.scriptModel} onChange={(e) => updateSettings({ scriptModel: e.target.value })} /></div>
        </section>
        <section className="card stack">
          <h3 className="cardTitle"><Eye size={18} />默认开关</h3>
          <div className="switchRow"><span>故事模式</span><button className={`switch ${state.settings.storyModeOn ? "on" : ""}`} onClick={() => updateSettings({ storyModeOn: !state.settings.storyModeOn })}><span /></button></div>
          <div className="switchRow"><span>彩色模式</span><button className={`switch ${state.settings.isColor ? "on" : ""}`} onClick={() => updateSettings({ isColor: !state.settings.isColor })}><span /></button></div>
          <div className="field"><label>默认气泡</label><select value={state.settings.bubbleTextMode} onChange={(e) => updateSettings({ bubbleTextMode: e.target.value as BubbleMode })}>{BUBBLE_MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select></div>
          <div className="field"><label>默认分镜数</label><select value={state.settings.panelCount} onChange={(e) => updateSettings({ panelCount: Number(e.target.value) })}>{[2, 4, 6, 8, 9].map((n) => <option key={n}>{n}</option>)}</select></div>
        </section>
      </div>
    );
  }
}

function NavButton({ tab, active, setTab, icon, label }: { tab: Tab; active: Tab; setTab: (tab: Tab) => void; icon: ReactNode; label: string }) {
  return <button className={`navButton ${active === tab ? "active" : ""}`} onClick={() => setTab(tab)}>{icon}<span>{label}</span></button>;
}

function StyleChoice({ id, selected, onClick }: { id: MangaStyleId; selected: boolean; onClick: () => void }) {
  const info = MANGA_STYLES[id];
  const Icon = id === "sliceOfLife" ? Leaf : id === "sportsHotBlooded" ? Flame : id === "scifiMecha" ? Cpu : id === "horrorSuspense" ? Eye : id === "chibi4Koma" ? Heart : Sparkles;
  return (
    <button className={`choice styleChoice ${selected ? "active" : ""}`} onClick={onClick}>
      <div className={`previewMark ${id}`} style={{ background: info.preview }} />
      <div className="styleChoiceBody">
        <strong><Icon size={15} /> {info.name}</strong>
        <span className="small muted">{info.subtitle}</span>
      </div>
    </button>
  );
}

function ImageThumbs({ images, remove }: { images: string[]; remove: (index: number) => void }) {
  return <div className="thumbGrid">{images.map((image, index) => <div key={image.slice(0, 40) + index} className="thumb"><img src={image} alt={`素材 ${index + 1}`} /><button className="iconButton" onClick={() => remove(index)}><X size={14} /></button></div>)}</div>;
}

function ScriptEditor({ script, setScript, editable }: { script: MangaStoryScript; setScript: (script: MangaStoryScript) => void; editable: boolean }) {
  function patchPanel(index: number, patch: Partial<MangaStoryScript["panels"][number]>) {
    setScript({ ...script, panels: script.panels.map((p, i) => i === index ? { ...p, ...patch } : p) });
  }
  return (
    <section className="card stack">
      <div className="cardHeader"><h3 className="cardTitle"><BookOpen size={18} />脚本{editable ? "（可编辑）" : ""}</h3><span className="badge">{script.panels.length} 格</span></div>
      <div className="field"><label>标题</label><input disabled={!editable} value={script.title} onChange={(e) => setScript({ ...script, title: e.target.value })} /></div>
      <div className="field"><label>简介</label><textarea disabled={!editable} rows={2} value={script.synopsis} onChange={(e) => setScript({ ...script, synopsis: e.target.value })} /></div>
      {script.panels.map((panel, index) => (
        <div className="scriptPanel" key={index}>
          <strong>第 {index + 1} 格</strong>
          <div className="field"><label>画面描述</label><textarea disabled={!editable} rows={2} value={panel.description} onChange={(e) => patchPanel(index, { description: e.target.value })} /></div>
          <div className="field"><label>对白</label><input disabled={!editable} value={panel.dialogue || ""} onChange={(e) => patchPanel(index, { dialogue: e.target.value })} /></div>
          <div className="field"><label>旁白</label><input disabled={!editable} value={panel.narration || ""} onChange={(e) => patchPanel(index, { narration: e.target.value })} /></div>
          <div className="field"><label>拟声词</label><input disabled={!editable} value={panel.sfx || ""} onChange={(e) => patchPanel(index, { sfx: e.target.value })} /></div>
        </div>
      ))}
    </section>
  );
}

function EmptyCard({ icon, text }: { icon: ReactNode; text: string }) {
  return <section className="card dropZone">{icon}<strong>{text}</strong></section>;
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function buildCharacterPrompt(character: CharacterCard) {
  return [
    "Create a single character reference sheet from the attached photo.",
    CHARACTER_STYLES[character.artStyle].prompt,
    `Character name: ${character.name}.`,
    character.bio ? `Personality/background: ${character.bio}.` : "",
    "Include front view, side view, back view, three facial expressions, and a small color palette. Keep the design consistent and original."
  ].filter(Boolean).join("\n");
}
