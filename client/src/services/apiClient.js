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

    if(typeof window !== "undefined") window.dispatchEvent(new CustomEvent("api-availability",{detail:{available:true}}));


    return response.data;


},


(error)=>{

    if(typeof window !== "undefined" && (!error.response || error.response?.status === 503)){
        window.dispatchEvent(new CustomEvent("api-availability",{detail:{available:false}}));
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
