import { configureStore } from "@reduxjs/toolkit";
import composerReducer from "./composerSlice";

export const store = configureStore({
  reducer: {
    composer: composerReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
