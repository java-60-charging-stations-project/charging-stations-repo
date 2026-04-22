let accessToken: string | null = null

export const tokenStorage = {
    hasRefreshToken: () => !!sessionStorage.getItem("refreshToken"),

    getAccessToken: () => accessToken,

    setAccessToken: (token: string) => {
        accessToken = token;
        sessionStorage.setItem("accessToken", token);
    },

    setRefreshToken: (token: string) => {
        sessionStorage.setItem("refreshToken", token);
    },

    getRefreshToken: () => {
        return sessionStorage.getItem("refreshToken");
    },

    clear: () => {
        accessToken = null
        sessionStorage.removeItem("refreshToken");
        sessionStorage.removeItem("accessToken");
    }
};