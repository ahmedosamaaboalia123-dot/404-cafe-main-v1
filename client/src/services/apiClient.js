import axios from "axios";


import { appConfig } from "@/app/config";
import { useAuthStore } from "@/store/authStore";
import { refreshV1AccessTokenOnce } from "@/api/v1Client";
import { updateAdminSocketToken } from "@/services/realtime";



const apiClient = axios.create({


    baseURL: appConfig.apiBaseUrl,


    timeout:30000,


    headers:{


        "Content-Type":"application/json"


    }


});

let refreshPromise = null;

// Transient network blips (slow mobile data, single dropped request) must not
// stick the global banner: only signal outage after consecutive failures.
let consecutiveNetworkFailures = 0;
const NETWORK_FAILURE_THRESHOLD = 2;

const signalAvailable = () => {
    consecutiveNetworkFailures = 0;
    if(typeof window !== "undefined") window.dispatchEvent(new CustomEvent("api-availability",{detail:{available:true}}));
};

const signalUnavailable = () => {
    consecutiveNetworkFailures += 1;
    if(typeof window !== "undefined" && consecutiveNetworkFailures >= NETWORK_FAILURE_THRESHOLD) window.dispatchEvent(new CustomEvent("api-availability",{detail:{available:false}}));
};

// Safe to retry once: GETs are side-effect free, and keyed POSTs replay
// idempotently on the server via the same Idempotency-Key header.
const canAutoRetry = (config) => {
    if(!config || config._networkRetried) return false;
    const method = String(config.method || "get").toLowerCase();
    if(method === "get") return true;
    const headers = config.headers || {};
    return Boolean(headers["Idempotency-Key"] || headers["idempotency-key"]);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sharedRefresh = () => {
    if(!refreshPromise){
        refreshPromise = refreshV1AccessTokenOnce()
            .then((accessToken) => {
                useAuthStore.getState().setAccessToken(accessToken);
                updateAdminSocketToken(accessToken);
                return accessToken;
            })
            .finally(() => { refreshPromise = null; });
    }
    return refreshPromise;
};





// Request Interceptor

apiClient.interceptors.request.use(


(config)=>{


    const token =
    localStorage.getItem(
        appConfig.tokenKey
    );



    if(token){


        config.headers.Authorization =
        `Bearer ${token}`;


    }



    return config;


},


(error)=>{


    return Promise.reject(error);


}

);





// Response Interceptor

apiClient.interceptors.response.use(


(response)=>{

    signalAvailable();


    return response.data;


},


(error)=>{

    const noResponse = !error.response;
    const unavailable = noResponse || error.response?.status === 503;

    if(typeof window !== "undefined" && unavailable){
        signalUnavailable();
    } else if(typeof window !== "undefined") {
        signalAvailable();
    }

    // One silent retry for transient network drops before surfacing the error.
    if(noResponse && canAutoRetry(error.config)){
        error.config._networkRetried = true;
        return sleep(800).then(() => apiClient(error.config));
    }


    const originalRequest = error.config;
    const isAuthRequest = originalRequest?.url?.includes("/auth/login") || originalRequest?.url?.includes("/auth/refresh");

    // Session lifecycle is owned by v1Client: refresh through the shared
    // single-flight (safe with refresh rotation) and never wipe stored
    // tokens from this legacy client, so a stale parallel request cannot
    // burn the rotated refresh token or log a valid session out.
    if(error.response?.status === 401 && !isAuthRequest && !originalRequest?._retry){
        originalRequest._retry = true;

        return sharedRefresh()
            .then((accessToken) => {
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return apiClient(originalRequest);
            })
            .catch((refreshError) => {
                return Promise.reject(refreshError);
            });
    }

    return Promise.reject(error);


}

);



export default apiClient;
