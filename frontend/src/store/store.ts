import { configureStore, type Action, type ThunkAction } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import { restoreSession } from "./authSlice";
import { tokenStorage } from "@/services/tokenStorage";

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});

if (tokenStorage.getRefreshToken()) {
  store.dispatch(restoreSession());
}

export type AppStore = typeof store;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
export type AppThunk<ThunkReturnType = void> = ThunkAction<ThunkReturnType, RootState, unknown, Action>;