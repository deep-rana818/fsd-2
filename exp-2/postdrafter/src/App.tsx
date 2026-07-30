import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "./store/store";
import {
  setInitialState,
  setPostTitle,
  setPostDraft,
  setSelectedPlatformId,
  addPlatform,
  deletePlatform,
  saveDraft,
  deleteDraft,
  clearAllDrafts,
  loadDraft,
  clearComposer,
  Platform,
  PostDraft
} from "./store/composerSlice";

// Preset standard platforms color mapping and limits
const STANDARD_PLATFORMS: Record<string, { color: string; charLimit: number }> = {
  twitter: { color: "#1DA1F2", charLimit: 280 },
  x: { color: "#202124", charLimit: 280 },
  linkedin: { color: "#0A66C2", charLimit: 3000 },
  instagram: { color: "#E1306C", charLimit: 2200 },
  facebook: { color: "#1877F2", charLimit: 5000 },
  youtube: { color: "#FF0000", charLimit: 1000 },
  tiktok: { color: "#000000", charLimit: 2200 },
  pinterest: { color: "#BD081C", charLimit: 500 },
  threads: { color: "#000000", charLimit: 500 },
};

// Helper to generate a random HSL color for custom platforms
const getRandomHSLColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash % 360);
  return `hsl(${h}, 70%, 45%)`;
};

// Templates for posts
const POST_TEMPLATES = [
  {
    name: "🚀 Product Launch",
    content: "Excited to share that AuraDraft is officially live today! 🎉\n\nIt is a clean, simple, Google-style Post Composer that simplifies content creation across multiple platforms with dynamic previews.\n\nCheck it out and let me know your thoughts! 👇\n\n#launch #productivity #saas #tools",
  },
  {
    name: "💡 Quick Tip",
    content: "Here is a quick productivity tip for content creators:\n\nCreate your core idea first, then adapt it to each platform's unique voice and formatting rather than writing separate posts from scratch.\n\nWhat is your content creation workflow? 📝",
  },
  {
    name: "🧵 Story Thread Starter",
    content: "1/ How we built our latest app in record time with Next.js and Tailwind CSS.\n\nHere is the full story from initial prototype to final production-ready app. A short thread... 🧵👇",
  },
];

// Popular emojis to insert
const POPULAR_EMOJIS = ["👍", "🔥", "🚀", "❤️", "😂", "🎉", "💡", "👀", "🧵", "👇", "✨", "💯", "✅"];

// Popular hashtags to insert
const POPULAR_HASHTAGS = ["#buildinpublic", "#productivity", "#marketing", "#indiehackers", "#coding", "#creators"];

export default function App() {
  const dispatch = useDispatch();

  // Mounting flag to prevent SSR hydration mismatch
  const [mounted, setMounted] = useState(false);

  // Redux States
  const platforms = useSelector((state: RootState) => state.composer.platforms);
  const selectedPlatformId = useSelector((state: RootState) => state.composer.selectedPlatformId);
  const postTitle = useSelector((state: RootState) => state.composer.postTitle);
  const postDraft = useSelector((state: RootState) => state.composer.postDraft);
  const drafts = useSelector((state: RootState) => state.composer.drafts);

  // Component Local UI States
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [newPlatformName, setNewPlatformName] = useState<string>("");
  const [newPlatformLimit, setNewPlatformLimit] = useState<number>(2000);

  // Simulator actions state
  const [publishingState, setPublishingState] = useState<"idle" | "connecting" | "uploading" | "success">("idle");
  const [schedulingState, setSchedulingState] = useState<"idle" | "selecting" | "success">("idle");
  const [scheduleDateTime, setScheduleDateTime] = useState<string>("");
  
  // Custom alerts/toasts
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "info" | "error" } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Run on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      // Load custom platforms from localStorage if saved
      const savedPlatforms = localStorage.getItem("auradraft_platforms");
      let platformsData: Platform[] = [];
      if (savedPlatforms) {
        try {
          platformsData = JSON.parse(savedPlatforms);
        } catch (e) {
          console.error("Error loading platforms", e);
        }
      }

      // Load drafts from localStorage
      const savedDrafts = localStorage.getItem("auradraft_drafts");
      let draftsData: PostDraft[] = [];
      if (savedDrafts) {
        try {
          draftsData = JSON.parse(savedDrafts);
        } catch (e) {
          console.error("Error loading drafts", e);
        }
      }

      dispatch(setInitialState({ platforms: platformsData, drafts: draftsData }));
    }, 0);

    return () => clearTimeout(timer);
  }, [dispatch]);

  // Toast helper
  const showToast = (text: string, type: "success" | "info" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Add platform handler
  const handleAddPlatform = (e: React.FormEvent) => {
    e.preventDefault();
    const nameTrimmed = newPlatformName.trim();
    if (!nameTrimmed) return;

    // Check if platform name already exists
    if (platforms.some((p) => p.name.toLowerCase() === nameTrimmed.toLowerCase())) {
      showToast("Platform already exists!", "error");
      return;
    }

    const key = nameTrimmed.toLowerCase();
    let color = getRandomHSLColor(nameTrimmed);
    let limit = newPlatformLimit;

    // Match against standard platforms if found
    if (STANDARD_PLATFORMS[key]) {
      color = STANDARD_PLATFORMS[key].color;
      limit = STANDARD_PLATFORMS[key].charLimit;
    }

    const newPlatform: Platform = {
      id: `platform-${Date.now()}`,
      name: nameTrimmed,
      color,
      charLimit: limit,
    };

    dispatch(addPlatform(newPlatform));
    setNewPlatformName("");
    showToast(`Added platform "${nameTrimmed}"`, "success");
  };

  // Delete platform handler
  const handleDeletePlatform = (id: string, name: string) => {
    if (platforms.length <= 1) {
      showToast("You must keep at least one platform!", "error");
      return;
    }
    
    dispatch(deletePlatform(id));
    showToast(`Removed platform "${name}"`, "info");
  };

  // Save draft handler
  const handleSaveDraft = () => {
    if (!postTitle.trim()) {
      showToast("Please enter a title to save the draft!", "error");
      return;
    }

    const isNew = !selectedDraftId;
    const idToSave = selectedDraftId || `draft-${Date.now()}`;
    const createdAt = new Date().toLocaleString();

    dispatch(saveDraft({ id: idToSave, createdAt, isNew }));
    setSelectedDraftId(idToSave);
    showToast(isNew ? "Draft saved successfully!" : "Draft updated successfully!");
  };

  // Load draft handler
  const handleLoadDraft = (draft: PostDraft) => {
    dispatch(loadDraft(draft));
    setSelectedDraftId(draft.id);
    showToast("Draft loaded!");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Delete draft handler
  const handleDeleteDraft = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(deleteDraft(id));
    if (selectedDraftId === id) {
      setSelectedDraftId(null);
    }
    showToast("Draft deleted.", "info");
  };

  // Clear composer
  const handleNewComposer = () => {
    dispatch(clearComposer());
    setSelectedDraftId(null);
    showToast("Composer cleared!", "info");
  };

  // Publish simulation
  const triggerPublish = () => {
    if (!postTitle.trim() || !postDraft.trim()) {
      showToast("Please fill in both title and draft content before publishing!", "error");
      return;
    }
    
    setPublishingState("connecting");
    
    setTimeout(() => {
      setPublishingState("uploading");
      setTimeout(() => {
        setPublishingState("success");
        setTimeout(() => {
          setPublishingState("idle");
          showToast(`Posted successfully to ${activePlatform?.name}! 🎉`);
        }, 2000);
      }, 1500);
    }, 1200);
  };

  // Schedule simulation
  const triggerSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleDateTime) {
      showToast("Please select a date and time!", "error");
      return;
    }

    setSchedulingState("success");
    setTimeout(() => {
      setSchedulingState("idle");
      setScheduleDateTime("");
      showToast(`Scheduled for ${new Date(scheduleDateTime).toLocaleString()}! 📅`);
    }, 2500);
  };

  // Helper inserts
  const insertEmoji = (emoji: string) => {
    if (!textareaRef.current) return;
    const text = postDraft;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const newText = text.substring(0, start) + emoji + text.substring(end);
    dispatch(setPostDraft(newText));
    
    // Focus back and set selection
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + emoji.length;
      }
    }, 50);
  };

  const insertHashtag = (hashtag: string) => {
    const text = postDraft.trim();
    if (text.endsWith(hashtag)) return;
    const separator = text.length === 0 ? "" : text.endsWith(" ") ? "" : " ";
    dispatch(setPostDraft(text + separator + hashtag + " "));
    
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  const loadTemplate = (templateContent: string) => {
    dispatch(setPostDraft(templateContent));
    showToast("Template loaded into composer.");
  };

  // Get active platform properties
  const activePlatform = platforms.find((p) => p.id === selectedPlatformId) || platforms[0];
  const charLimit = activePlatform?.charLimit || 2000;
  const charsRemaining = charLimit - postDraft.length;
  const isOverLimit = charsRemaining < 0;
  const percentUsed = Math.min((postDraft.length / charLimit) * 100, 100);

  // SVG Circular progress radius logic
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentUsed / 100) * circumference;

  // Visual helper gradient for avatars based on post title
  const getAvatarGradient = (title: string) => {
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h1 = Math.abs(hash % 360);
    const h2 = (h1 + 120) % 360;
    return `linear-gradient(135deg, hsl(${h1}, 75%, 70%), hsl(${h2}, 75%, 60%))`;
  };

  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f8f9fa]">
        <div className="text-zinc-500 flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-t-[#1a73e8] border-zinc-200 animate-spin"></div>
          <span className="text-xs font-semibold text-zinc-600">Loading Post Composer...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full flex flex-col bg-[#f8f9fa] min-h-screen text-[#202124]">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg transition-all duration-300 bg-[#323232] border-[#323232] text-white">
          <span className="text-xs font-medium">{toastMessage.text}</span>
          <button 
            onClick={() => setToastMessage(null)}
            className="ml-3 text-xs text-[#8ab4f8] font-bold uppercase hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Google-Style Top Navbar Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#dadce0] px-6 py-3 flex flex-row items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-[#202124] tracking-tight">
            Post Composer
          </h1>
        </div>

        {/* Clear Composer & Status */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-[#5f6368] bg-[#f1f3f4] px-2.5 py-1 rounded-md">
            Redux Active
          </span>
          
          <button
            onClick={handleNewComposer}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-md border border-[#dadce0] bg-white hover:bg-[#f8f9fa] text-[#1a73e8] transition"
          >
            Clear Sheet
          </button>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Hand: Workspace Suite (8 columns) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
          
          {/* Container 1: Platforms Manager (Google Filter Chip style) */}
          <section className="bg-white border border-[#dadce0] rounded-lg p-5 shadow-sm">
            <div className="border-b border-[#f1f3f4] pb-3 mb-4">
              <h2 className="text-sm font-semibold text-[#202124]">
                Target Channels & Character Rules
              </h2>
              <p className="text-[11px] text-[#5f6368] mt-0.5">
                Add, manage and assign constraints for your social destinations.
              </p>
            </div>

            {/* Google Form-like Inline Row */}
            <form onSubmit={handleAddPlatform} className="flex flex-col sm:flex-row gap-2.5 mb-5">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Platform Name (e.g., TikTok, Medium, Threads)"
                  value={newPlatformName}
                  onChange={(e) => setNewPlatformName(e.target.value)}
                  className="w-full text-xs bg-white border border-[#dadce0] focus:border-[#1a73e8] outline-none rounded-md px-3.5 py-2 text-[#202124] placeholder-zinc-400 focus:ring-1 focus:ring-[#1a73e8] transition"
                />
              </div>

              <div className="w-full sm:w-28">
                <input
                  type="number"
                  placeholder="Char Limit"
                  value={newPlatformLimit}
                  onChange={(e) => setNewPlatformLimit(Math.max(1, parseInt(e.target.value) || 2000))}
                  title="Character limit threshold"
                  className="w-full text-xs bg-white border border-[#dadce0] focus:border-[#1a73e8] outline-none rounded-md px-3 py-2 text-[#202124] text-center focus:ring-1 focus:ring-[#1a73e8] transition"
                />
              </div>

              <button
                type="submit"
                className="px-5 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white font-semibold rounded-md text-xs transition duration-150 shrink-0 shadow-sm"
              >
                Add Platform
              </button>
            </form>

            {/* Platform Chips (Filter Chip aesthetic) */}
            <div className="flex flex-wrap gap-2">
              {platforms.map((platform) => {
                const isActive = platform.id === selectedPlatformId;
                return (
                  <div
                    key={platform.id}
                    onClick={() => dispatch(setSelectedPlatformId(platform.id))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs cursor-pointer select-none transition-all duration-150 ${isActive
                        ? "bg-[#e8f0fe] border-[#1a73e8] text-[#1967d2] font-semibold"
                        : "bg-[#f1f3f4] hover:bg-[#e8eaed] border-transparent text-[#3c4043]"
                      }`}
                  >
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: platform.color }}
                    />
                    <span>{platform.name}</span>
                    <span className={`text-[10px] px-1 py-0.5 rounded font-mono ${isActive ? "bg-white border border-[#d2e3fc]" : "bg-[#dadce0] text-[#5f6368]"
                      }`}>
                      {platform.charLimit}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePlatform(platform.id, platform.name);
                      }}
                      className="text-[#5f6368] hover:text-[#ea4335] hover:bg-[#f1f3f4]/80 p-0.5 rounded-full transition ml-0.5"
                      title={`Delete ${platform.name}`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Container 2: Title and Platform Selector (Form details) */}
          <section className="bg-white border border-[#dadce0] rounded-lg p-5 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              
              {/* Post Title Field */}
              <div className="md:col-span-8 flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#5f6368]">Post Title</label>
                <input
                  type="text"
                  placeholder="Enter sheet title to organize your draft..."
                  value={postTitle}
                  onChange={(e) => dispatch(setPostTitle(e.target.value))}
                  className="w-full text-xs bg-white border border-[#dadce0] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none rounded-md px-3.5 py-2.5 text-[#202124] transition placeholder-zinc-400"
                />
              </div>

              {/* Selector Select Box */}
              <div className="md:col-span-4 flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#5f6368]">Post Destination</label>
                <div className="relative">
                  <select
                    value={selectedPlatformId}
                    onChange={(e) => dispatch(setSelectedPlatformId(e.target.value))}
                    className="w-full text-xs bg-white border border-[#dadce0] focus:border-[#1a73e8] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] rounded-md px-3 py-2.5 text-[#202124] appearance-none cursor-pointer transition"
                  >
                    {platforms.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#5f6368]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* Container 3: Post Draft Editor (Google Docs / Keep composer layout) */}
          <section className="bg-white border border-[#dadce0] rounded-lg p-5 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#f1f3f4] pb-2">
              <span className="text-sm font-semibold text-[#202124]">Composer Editor</span>
              
              {/* Templates Dropdown */}
              <div className="relative group">
                <button
                  type="button"
                  className="px-3 py-1 text-xs rounded-md border border-[#dadce0] bg-[#f8f9fa] hover:bg-[#f1f3f4] text-[#3c4043] transition flex items-center gap-1 cursor-pointer font-medium"
                >
                  <span>Select Template</span>
                  <svg className="w-3.5 h-3.5 text-[#5f6368]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                <div className="absolute right-0 mt-1 w-52 rounded-md bg-white border border-[#dadce0] shadow-md p-1 hidden group-hover:block hover:block z-20">
                  {POST_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      onClick={() => loadTemplate(tmpl.content)}
                      className="w-full text-left text-xs hover:bg-[#f1f3f4] text-[#3c4043] hover:text-[#202124] p-2 rounded transition"
                    >
                      {tmpl.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Google Keep style toolbar for quick helpers */}
            <div className="flex flex-wrap items-center gap-2 bg-[#f8f9fa] p-2 rounded border border-[#e8eaed]">
              
              {/* Emojis list */}
              <div className="flex items-center gap-1.5 border-r border-[#dadce0] pr-2.5 py-0.5">
                {POPULAR_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => insertEmoji(emoji)}
                    className="hover:scale-120 transition duration-100 p-0.5 rounded hover:bg-[#e8eaed] text-xs"
                    title={`Insert ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Hashtags list */}
              <div className="flex flex-wrap items-center gap-1">
                {POPULAR_HASHTAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => insertHashtag(tag)}
                    className="text-[10px] font-medium px-2 py-1 rounded bg-white border border-[#dadce0] text-[#5f6368] hover:text-[#1a73e8] hover:border-[#d2e3fc] hover:bg-[#e8f0fe] transition"
                  >
                    {tag}
                  </button>
                ))}
              </div>

            </div>

            {/* Textarea drafting */}
            <div className="relative">
              <textarea
                ref={textareaRef}
                rows={8}
                placeholder={`Draft your content here. Post details will align with rules for ${activePlatform?.name || "the target channel"}...`}
                value={postDraft}
                onChange={(e) => dispatch(setPostDraft(e.target.value))}
                className={`w-full text-sm bg-white border outline-none rounded-md px-4 py-4 text-[#202124] placeholder-zinc-400 transition resize-y ${isOverLimit
                    ? "border-[#ea4335] focus:ring-1 focus:ring-[#ea4335]"
                    : "border-[#dadce0] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
                  }`}
              />

              {/* Float visual counter inside textarea */}
              <div className="absolute bottom-4 right-4 flex items-center gap-2.5 bg-white border border-[#dadce0] px-2.5 py-1 rounded-md shadow-sm select-none">
                
                {/* SVG circular progress indicator */}
                <svg className="w-4.5 h-4.5 -rotate-90">
                  <circle
                    cx="9"
                    cy="9"
                    r={radius}
                    fill="none"
                    stroke="#f1f3f4"
                    strokeWidth="2"
                  />
                  <circle
                    cx="9"
                    cy="9"
                    r={radius}
                    fill="none"
                    stroke={
                      isOverLimit 
                        ? "#ea4335" 
                        : percentUsed > 80 
                          ? "#fbbc05" 
                          : "#1a73e8"
                    }
                    strokeWidth="2"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-200"
                  />
                </svg>

                <div className="text-[10px] font-mono text-[#5f6368]">
                  <span className={`font-bold ${isOverLimit ? 'text-[#ea4335]' : percentUsed > 80 ? 'text-[#fbbc05]' : 'text-[#202124]'}`}>
                    {postDraft.length}
                  </span>
                  <span> / {charLimit}</span>
                </div>
              </div>
            </div>

            {/* Overlimit Warning Banner */}
            {isOverLimit && (
              <div className="flex items-center gap-2.5 p-3 bg-[#fce8e6] border border-[#fad2cf] rounded-md text-xs text-[#c5221f]">
                <svg className="w-4 h-4 shrink-0 text-[#d93025]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>
                  Length limit exceeded by <strong>{Math.abs(charsRemaining)}</strong> characters. Consider formatting or editing before posting.
                </span>
              </div>
            )}
          </section>

        </div>

        {/* Right Hand: Channel Live Previews & Actions (4 columns) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
          
          {/* Container 4: Live Channel Preview (Light feed layouts) */}
          <section className="bg-white border border-[#dadce0] rounded-lg p-5 shadow-sm flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-semibold text-[#202124]">
                Google Preview Sandbox
              </h2>
              <p className="text-[11px] text-[#5f6368] mt-0.5">
                Simulated view of your drafted feed card under target constraints.
              </p>
            </div>

            {/* Light Preview card */}
            <div className="rounded-lg border border-[#dadce0] bg-[#f8f9fa] p-0.5 shadow-sm relative overflow-hidden">
              
              {/* Header Badge */}
              <div className="flex items-center gap-1.5 px-4 py-2 border-b border-[#dadce0] bg-white">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: activePlatform?.color }}
                />
                <span className="text-[10px] font-bold text-[#5f6368] uppercase tracking-wider font-mono">
                  {activePlatform?.name} Feed Layout
                </span>
              </div>

              {/* Feed Card Rendering */}
              <div className="p-4 min-h-[220px] bg-white">
                
                {/* 1. X/Twitter Light Preview */}
                {(activePlatform?.name.toLowerCase().includes("x") || activePlatform?.name.toLowerCase().includes("twitter")) && (
                  <div className="flex flex-col gap-2.5 font-sans text-sm text-[#0f1419]">
                    <div className="flex gap-2.5">
                      <div
                        className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center font-bold text-white text-xs select-none shadow-sm"
                        style={{ background: getAvatarGradient(postTitle || "User") }}
                      >
                        {postTitle ? postTitle.slice(0, 2).toUpperCase() : "ME"}
                      </div>
                      <div className="flex flex-col leading-tight">
                        <div className="flex items-center gap-0.5">
                          <span className="font-bold text-[#0f1419] hover:underline cursor-pointer">You</span>
                          {/* Verified Checkmark (blue) */}
                          <svg className="w-4 h-4 text-[#1d9bf0] fill-current" viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                          </svg>
                        </div>
                        <span className="text-[#536471] text-xs">@yourhandle · Just now</span>
                      </div>
                    </div>
                    
                    <div className="text-[#0f1419] text-sm whitespace-pre-line break-words leading-relaxed pl-11">
                      {postTitle && <span className="font-extrabold block text-black mb-1">{postTitle}</span>}
                      {postDraft || <span className="text-zinc-400 italic">Content draft will display here...</span>}
                    </div>

                    <div className="border-t border-[#f1f3f4] mt-2 pt-2.5 pl-11 flex justify-between text-[#536471] text-xs max-w-sm select-none">
                      <span className="hover:text-[#1d9bf0] cursor-pointer flex items-center gap-1">
                        💬 <span>0</span>
                      </span>
                      <span className="hover:text-[#00ba7c] cursor-pointer flex items-center gap-1">
                        🔄 <span>0</span>
                      </span>
                      <span className="hover:text-[#f91880] cursor-pointer flex items-center gap-1">
                        ❤️ <span>0</span>
                      </span>
                      <span className="hover:text-[#1d9bf0] cursor-pointer flex items-center gap-1">
                        📊 <span>0</span>
                      </span>
                    </div>
                  </div>
                )}

                {/* 2. LinkedIn Light Preview */}
                {activePlatform?.name.toLowerCase().includes("linkedin") && (
                  <div className="flex flex-col gap-3 font-sans text-[13px] text-[#202124]">
                    <div className="flex gap-2">
                      <div
                        className="w-10 h-10 rounded-sm shrink-0 flex items-center justify-center font-bold text-white text-xs select-none shadow-sm"
                        style={{ background: getAvatarGradient(postTitle || "User") }}
                      >
                        {postTitle ? postTitle.slice(0, 2).toUpperCase() : "ME"}
                      </div>
                      <div className="flex flex-col leading-tight">
                        <div className="flex items-center gap-0.5">
                          <span className="font-bold text-[#000000] hover:underline hover:text-[#0a66c2] cursor-pointer text-xs">You</span>
                          <span className="text-[10px] text-zinc-500 font-medium">· 1st</span>
                        </div>
                        <span className="text-[#5f6368] text-[10px] truncate max-w-[190px]">Content Creator & Architect</span>
                        <span className="text-[#5f6368] text-[9px] mt-0.5">Just now · 🌐</span>
                      </div>
                    </div>
                    
                    <div className="text-[#202124] text-[13px] whitespace-pre-line break-words leading-relaxed">
                      {postTitle && <span className="font-bold block text-black mb-1">{postTitle}</span>}
                      {postDraft || <span className="text-zinc-400 italic">LinkedIn text will appear here...</span>}
                    </div>

                    <div className="border-t border-[#f1f3f4] mt-2.5 pt-1.5 flex justify-between text-[#5f6368] text-xs font-semibold select-none">
                      <span className="hover:bg-zinc-150 px-2 py-1 rounded cursor-pointer flex items-center gap-1">
                        👍 <span>Like</span>
                      </span>
                      <span className="hover:bg-zinc-150 px-2 py-1 rounded cursor-pointer flex items-center gap-1">
                        💬 <span>Comment</span>
                      </span>
                      <span className="hover:bg-zinc-150 px-2 py-1 rounded cursor-pointer flex items-center gap-1">
                        🔄 <span>Repost</span>
                      </span>
                      <span className="hover:bg-zinc-150 px-2 py-1 rounded cursor-pointer flex items-center gap-1">
                        ✉️ <span>Send</span>
                      </span>
                    </div>
                  </div>
                )}

                {/* 3. Instagram Light Preview */}
                {activePlatform?.name.toLowerCase().includes("instagram") && (
                  <div className="flex flex-col gap-2.5 font-sans text-xs text-[#262626]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full p-[1.5px] shrink-0"
                          style={{ background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' }}
                        >
                          <div
                            className="w-full h-full rounded-full border border-white flex items-center justify-center font-bold text-white text-[9px] select-none"
                            style={{ background: getAvatarGradient(postTitle || "User") }}
                          >
                            {postTitle ? postTitle.slice(0, 2).toUpperCase() : "ME"}
                          </div>
                        </div>
                        <span className="font-bold text-[#262626] hover:underline cursor-pointer">your_handle</span>
                      </div>
                      <span className="text-[#262626] font-bold text-xs cursor-pointer">•••</span>
                    </div>
                    
                    {/* Visual box representing Instagram image post */}
                    <div
                      className="w-full h-28 rounded-md flex flex-col justify-end p-3 text-white font-bold relative overflow-hidden shadow-inner group cursor-pointer"
                      style={{ background: getAvatarGradient(postTitle || "Instagram Draft Image") }}
                    >
                      <div className="absolute inset-0 bg-black/15 group-hover:bg-black/25 transition"></div>
                      <div className="z-10 bg-white/90 backdrop-blur-sm px-2.5 py-1.5 rounded text-[#202124] border border-black/5 max-w-[80%]">
                        <p className="text-[9px] uppercase tracking-wider text-[#1a73e8] font-bold">Featured Draft</p>
                        <p className="text-[10px] truncate font-semibold">{postTitle || "Image Title"}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[#262626] py-0.5 px-0.5">
                      <div className="flex items-center gap-2.5">
                        <span className="hover:scale-110 cursor-pointer">❤️</span>
                        <span className="hover:scale-110 cursor-pointer">💬</span>
                        <span className="hover:scale-110 cursor-pointer">✈️</span>
                      </div>
                      <span className="hover:scale-110 cursor-pointer">📥</span>
                    </div>

                    <div className="px-0.5">
                      <span className="font-bold text-black mr-1">your_handle</span>
                      {postTitle && <span className="font-semibold text-[#1a73e8] block my-0.5">{postTitle}</span>}
                      <span className="text-[#3c4043] whitespace-pre-line break-words text-[11px]">
                        {postDraft || <span className="text-zinc-400 italic">Instagram captions will appear here...</span>}
                      </span>
                    </div>
                  </div>
                )}

                {/* 4. Custom/Generic Light Preview */}
                {!activePlatform?.name.toLowerCase().includes("x") &&
                  !activePlatform?.name.toLowerCase().includes("twitter") &&
                  !activePlatform?.name.toLowerCase().includes("linkedin") &&
                  !activePlatform?.name.toLowerCase().includes("instagram") && (
                    <div className="flex flex-col gap-3 font-sans text-xs text-[#202124]">
                      <div className="flex items-center justify-between pb-1.5 border-b border-[#dadce0]">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: activePlatform?.color }}
                          />
                          <span>{activePlatform?.name} feed</span>
                        </div>
                        <span className="text-[10px] text-[#5f6368] font-mono">Custom channel</span>
                      </div>

                      <div className="flex flex-col gap-2">
                        {postTitle && (
                          <h4 className="font-semibold text-black text-xs bg-[#f8f9fa] px-2.5 py-1.5 rounded border border-[#dadce0]">
                            {postTitle}
                          </h4>
                        )}

                        <div className="bg-white border border-[#dadce0] rounded p-3 min-h-[90px] text-[#202124] whitespace-pre-line break-words leading-relaxed text-[11.5px]">
                          {postDraft || <span className="text-zinc-400 italic">Draft text will appear here...</span>}
                        </div>
                      </div>

                      <div className="text-[9px] text-[#5f6368] flex justify-end gap-1 font-mono select-none">
                        <span>Preview rendered at</span>
                        <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  )}

              </div>
            </div>
          </section>

          {/* Action Suite (Google style Flat white card) */}
          <section className="bg-white border border-[#dadce0] rounded-lg p-5 shadow-sm flex flex-col gap-3 relative overflow-hidden">
            
            <div>
              <h2 className="text-sm font-semibold text-[#202124]">
                Actions & Deployment
              </h2>
              <p className="text-[11px] text-[#5f6368] mt-0.5">
                Save sheet progress locally or simulate publishing to the connected platform.
              </p>
            </div>

            {/* Secondary operations */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="w-full py-2.5 px-3 bg-white border border-[#dadce0] hover:bg-[#f8f9fa] text-[#3c4043] font-semibold rounded-md text-xs flex items-center justify-center gap-1.5 transition duration-150 cursor-pointer shadow-sm"
              >
                <svg className="w-4 h-4 text-[#5f6368]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                <span>{selectedDraftId ? "Update Sheet" : "Save Sheet"}</span>
              </button>

              <button
                type="button"
                onClick={() => setSchedulingState("selecting")}
                className="w-full py-2.5 px-3 bg-white border border-[#dadce0] hover:bg-[#f8f9fa] text-[#3c4043] font-semibold rounded-md text-xs flex items-center justify-center gap-1.5 transition duration-150 cursor-pointer shadow-sm"
              >
                <svg className="w-4 h-4 text-[#5f6368]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Schedule Sheet</span>
              </button>
            </div>

            {/* Primary button */}
            <button
              type="button"
              onClick={triggerPublish}
              disabled={publishingState !== "idle" || isOverLimit}
              className={`w-full py-3 px-4 bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold rounded-md text-xs flex items-center justify-center gap-2 transition duration-150 shadow-sm cursor-pointer ${(publishingState !== "idle" || isOverLimit) ? "opacity-50 cursor-not-allowed hover:bg-[#1a73e8]" : ""
                }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <span>Simulate Publishing</span>
            </button>

            {/* Publishing Simulation Overlays */}
            {publishingState !== "idle" && (
              <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center p-6 text-center animate-fade-in z-30">
                {publishingState === "connecting" && (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-7 h-7 rounded-full border-2 border-t-[#1a73e8] border-zinc-200 animate-spin"></div>
                    <p className="text-xs font-semibold text-[#5f6368]">Linking API credentials to {activePlatform?.name}...</p>
                  </div>
                )}
                {publishingState === "uploading" && (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-7 h-7 rounded-full border-2 border-t-[#1a73e8] border-zinc-200 animate-spin"></div>
                    <p className="text-xs font-semibold text-[#5f6368]">Resolving dynamic preview layouts...</p>
                  </div>
                )}
                {publishingState === "success" && (
                  <div className="flex flex-col items-center gap-2 animate-bounce">
                    <div className="w-9 h-9 rounded-full bg-[#e6f4ea] border border-[#34a853]/20 flex items-center justify-center text-[#137333] font-bold">
                      ✓
                    </div>
                    <p className="text-xs font-bold text-[#137333] uppercase tracking-wider">Sheet Published!</p>
                    <p className="text-[10px] text-[#5f6368]">Simulation successful.</p>
                  </div>
                )}
              </div>
            )}

            {/* Scheduling Simulation Overlays */}
            {schedulingState !== "idle" && (
              <div className="absolute inset-0 bg-white/95 flex flex-col justify-center p-5 z-30">
                {schedulingState === "selecting" && (
                  <form onSubmit={triggerSchedule} className="flex flex-col gap-3">
                    <div className="flex justify-between items-center pb-2 border-b border-[#dadce0]">
                      <span className="text-xs font-bold text-[#202124] uppercase tracking-wider">Schedule Calendar</span>
                      <button
                        type="button"
                        onClick={() => setSchedulingState("idle")}
                        className="text-[#1a73e8] hover:underline text-xs font-semibold"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] text-[#5f6368] font-bold uppercase">Target Datetime</label>
                      <input
                        type="datetime-local"
                        required
                        value={scheduleDateTime}
                        onChange={(e) => setScheduleDateTime(e.target.value)}
                        className="text-xs bg-white border border-[#dadce0] rounded-md p-2 text-[#202124] focus:outline-none focus:border-[#1a73e8]"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold rounded-md text-xs transition duration-150"
                    >
                      Confirm Schedule
                    </button>
                  </form>
                )}

                {schedulingState === "success" && (
                  <div className="flex flex-col items-center justify-center gap-2 animate-pulse">
                    <div className="w-9 h-9 rounded-full bg-[#e8f0fe] border border-[#d2e3fc] flex items-center justify-center text-[#1a73e8] font-bold">
                      📅
                    </div>
                    <p className="text-xs font-bold text-[#1967d2] uppercase tracking-wider">Scheduled successfully!</p>
                    <p className="text-[10px] text-[#5f6368]">Simulation finished.</p>
                  </div>
                )}
              </div>
            )}

          </section>

        </div>

        {/* Bottom Section: Local Sheets Archive (12 Columns) */}
        <section className="lg:col-span-12 bg-white border border-[#dadce0] rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#f1f3f4] pb-3 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[#202124] flex items-center gap-2">
                <span>Local Sheet Archive</span>
                <span className="text-[10px] bg-[#f1f3f4] text-[#5f6368] px-2 py-0.5 rounded font-mono font-semibold">
                  storage
                </span>
              </h2>
              <p className="text-[11px] text-[#5f6368] mt-0.5">
                Retrieve or update saved composer drafts in local memory.
              </p>
            </div>
            
            {drafts.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm("Delete all saved draft sheets?")) {
                    dispatch(clearAllDrafts());
                    setSelectedDraftId(null);
                    showToast("Cleared all draft sheets.", "info");
                  }
                }}
                className="text-xs font-semibold text-[#ea4335] hover:underline transition"
              >
                Clear All Sheets
              </button>
            )}
          </div>

          {/* Draft Grid cards */}
          {drafts.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-[#dadce0] rounded-lg bg-[#f8f9fa]">
              <span className="text-2xl block mb-1.5 select-none">📁</span>
              <p className="text-xs text-[#5f6368] font-semibold">Archive is currently empty.</p>
              <p className="text-[10px] text-zinc-400 mt-0.5">Enter details above and click &apos;Save Sheet&apos; to populate this section.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {drafts.map((draft) => {
                const draftPlatform = platforms.find((p) => p.id === draft.platformId);
                const isSelected = selectedDraftId === draft.id;

                return (
                  <div
                    key={draft.id}
                    onClick={() => handleLoadDraft(draft)}
                    className={`p-4 rounded-lg border cursor-pointer relative overflow-hidden transition-all duration-150 group flex flex-col justify-between min-h-[130px] ${isSelected
                        ? "bg-[#f6fafe] border-[#1a73e8] shadow-sm"
                        : "bg-white border-[#dadce0] hover:border-[#9aa0a6] hover:bg-[#f8f9fa]"
                      }`}
                  >
                    <div>
                      {/* Top Row: title & badge */}
                      <div className="flex justify-between items-start gap-2 mb-1.5">
                        <h3 className="font-bold text-[#202124] text-xs truncate max-w-[65%] group-hover:text-[#1a73e8] transition">
                          {draft.title}
                        </h3>

                        <div 
                          className="px-2 py-0.5 rounded text-[9px] font-bold text-white uppercase tracking-wider flex items-center gap-1 shadow-sm"
                          style={{ backgroundColor: draftPlatform?.color || "#5f6368" }}
                        >
                          <span>{draftPlatform?.name || "Deleted"}</span>
                        </div>
                      </div>

                      {/* Snippet */}
                      <p className="text-[#5f6368] text-[11px] line-clamp-3 leading-normal mb-3 whitespace-pre-line">
                        {draft.content || <span className="italic text-zinc-400">No content drafted</span>}
                      </p>
                    </div>

                    {/* Bottom Row */}
                    <div className="flex items-center justify-between border-t border-[#f1f3f4] pt-2 mt-auto">
                      <span className="text-[9px] text-[#9aa0a6] font-mono">{draft.createdAt}</span>
                      
                      <button
                        type="button"
                        onClick={(e) => handleDeleteDraft(draft.id, e)}
                        className="text-[#5f6368] hover:text-[#ea4335] p-1 rounded-full hover:bg-zinc-200/50 transition"
                        title="Delete sheet"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </main>

    </div>
  );
}
