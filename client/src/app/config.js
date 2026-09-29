export const appConfig = {

    appName:"404 Coffee",


    apiBaseUrl:
        import.meta.env.VITE_API_BASE_URL 
        ||
        "/api",


    tokenKey:"access_token",


    refreshTokenKey:"refresh_token"

};
