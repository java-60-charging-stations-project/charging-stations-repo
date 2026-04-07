import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { User } from "@/types";
import { signIn as cognitoSignIn, getTokensFromRefreshToken } from "@/services/auth/authService";
import { tokenStorage } from "@/services/tokenStorage";
import { getLogger } from "@/services/logging";
import { createAppAsyncThunk } from "./withTypes";

const logger = getLogger("authSlice");

// Types
export type AuthStatus = "idle" | "restoring" | "authenticated" | "unauthenticated";

type AuthState = {
    user: User | null;
    status: AuthStatus;
};

type LoginPayload = {
    email: string;
    password: string;
};

// Thunks
export const restoreSession = createAppAsyncThunk<User, void>(
    "auth/restoreSession",
    async () => {
        const refreshToken = tokenStorage.getRefreshToken();
        if (!refreshToken) {
            throw new Error("No refresh token available");
        }
        const result = await getTokensFromRefreshToken(refreshToken);
        tokenStorage.setAccessToken(result.session.accessToken);
        if (result.session.refreshToken !== refreshToken) {
            tokenStorage.setRefreshToken(result.session.refreshToken);
        }
        logger.debug("Session restored successfully");
        return result.user;
    },
);

export const login = createAppAsyncThunk<User, LoginPayload>(
    "auth/login",
    async (payload: LoginPayload) => {
        const { email, password } = payload;
        const result = await cognitoSignIn(email, password);
        tokenStorage.setAccessToken(result.session.accessToken);
        tokenStorage.setRefreshToken(result.session.refreshToken);
        logger.debug("Login successful");
        return result.user;
    },
);

// State

const initialState: AuthState = {
    user: null,
    status: tokenStorage.getRefreshToken() ? "restoring" : "unauthenticated",
};

// Slice
export const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        logout: (state: AuthState) => {
            state.user = null;
            state.status = "unauthenticated";
            tokenStorage.clear();
            logger.debug("Logout completed");
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(restoreSession.fulfilled, (state, action: PayloadAction<User>) => {
                state.user = action.payload;
                state.status = "authenticated";
            })
            .addCase(restoreSession.rejected, (state) => {
                state.user = null;
                state.status = "unauthenticated";
                tokenStorage.clear();
                logger.debug("Session restore failed");
            })
            .addCase(login.fulfilled, (state, action: PayloadAction<User>) => {
                state.user = action.payload;
                state.status = "authenticated";
            })
            .addCase(login.rejected, (state) => {
                state.user = null;
                state.status = "unauthenticated";
            });
    },
});

export const { logout } = authSlice.actions;

export default authSlice.reducer;
