import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Platform {
  id: string;
  name: string;
  color: string;
  charLimit: number;
}

export interface PostDraft {
  id: string;
  title: string;
  platformId: string;
  content: string;
  createdAt: string;
}

interface ComposerState {
  platforms: Platform[];
  selectedPlatformId: string;
  postTitle: string;
  postDraft: string;
  drafts: PostDraft[];
}

const DEFAULT_PLATFORMS: Platform[] = [
  { id: "x-twitter", name: "X / Twitter", color: "#1DA1F2", charLimit: 280 },
  { id: "linkedin", name: "LinkedIn", color: "#0A66C2", charLimit: 3000 },
  { id: "instagram", name: "Instagram", color: "#E1306C", charLimit: 2200 },
  { id: "facebook", name: "Facebook", color: "#1877F2", charLimit: 5000 },
];

const initialState: ComposerState = {
  platforms: DEFAULT_PLATFORMS,
  selectedPlatformId: "x-twitter",
  postTitle: "",
  postDraft: "",
  drafts: [],
};

const composerSlice = createSlice({
  name: "composer",
  initialState,
  reducers: {
    setInitialState(state, action: PayloadAction<{ platforms: Platform[]; drafts: PostDraft[] }>) {
      if (action.payload.platforms.length > 0) {
        state.platforms = action.payload.platforms;
      }
      state.drafts = action.payload.drafts;
    },
    setPostTitle(state, action: PayloadAction<string>) {
      state.postTitle = action.payload;
    },
    setPostDraft(state, action: PayloadAction<string>) {
      state.postDraft = action.payload;
    },
    setSelectedPlatformId(state, action: PayloadAction<string>) {
      state.selectedPlatformId = action.payload;
    },
    addPlatform(state, action: PayloadAction<Platform>) {
      state.platforms.push(action.payload);
      state.selectedPlatformId = action.payload.id;
      localStorage.setItem("auradraft_platforms", JSON.stringify(state.platforms));
    },
    deletePlatform(state, action: PayloadAction<string>) {
      state.platforms = state.platforms.filter((p) => p.id !== action.payload);
      if (state.selectedPlatformId === action.payload) {
        state.selectedPlatformId = state.platforms[0]?.id || "";
      }
      localStorage.setItem("auradraft_platforms", JSON.stringify(state.platforms));
    },
    saveDraft(state, action: PayloadAction<{ id: string; createdAt: string; isNew: boolean }>) {
      const { id, createdAt, isNew } = action.payload;
      const title = state.postTitle.trim();
      const content = state.postDraft;
      const platformId = state.selectedPlatformId;

      if (!isNew) {
        // Update existing draft
        const idx = state.drafts.findIndex((d) => d.id === id);
        if (idx !== -1) {
          state.drafts[idx] = {
            id,
            title,
            platformId,
            content,
            createdAt,
          };
        }
      } else {
        // Create new draft
        state.drafts.unshift({
          id,
          title,
          platformId,
          content,
          createdAt,
        });
      }
      localStorage.setItem("auradraft_drafts", JSON.stringify(state.drafts));
    },
    deleteDraft(state, action: PayloadAction<string>) {
      state.drafts = state.drafts.filter((d) => d.id !== action.payload);
      localStorage.setItem("auradraft_drafts", JSON.stringify(state.drafts));
    },
    clearAllDrafts(state) {
      state.drafts = [];
      localStorage.removeItem("auradraft_drafts");
    },
    loadDraft(state, action: PayloadAction<PostDraft>) {
      const draft = action.payload;
      state.postTitle = draft.title;
      state.postDraft = draft.content;
      if (state.platforms.some((p) => p.id === draft.platformId)) {
        state.selectedPlatformId = draft.platformId;
      }
    },
    clearComposer(state) {
      state.postTitle = "";
      state.postDraft = "";
    }
  },
});

export const {
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
} = composerSlice.actions;

export default composerSlice.reducer;
