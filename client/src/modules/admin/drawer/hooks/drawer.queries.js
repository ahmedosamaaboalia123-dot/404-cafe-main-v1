import{useQuery}from'@tanstack/react-query';import{queryKeys}from'@/api/queryKeys';import{drawerApi}from'../api/drawer.api';import{toDrawerScreen,toShiftPage,toTransactionPage}from'../adapters/drawer.adapter';
export const useDrawerScreen=()=>useQuery({queryKey:queryKeys.drawer.screen,queryFn:async()=>toDrawerScreen(await drawerApi.screen()),refetchOnWindowFocus:true});
export const useDrawerShifts=p=>useQuery({queryKey:['drawer','shifts',p],queryFn:async()=>toShiftPage(await drawerApi.shifts(p)),placeholderData:x=>x});
export const useDrawerTransactions=(id,p)=>useQuery({queryKey:['drawer','transactions',String(id),p],queryFn:async()=>toTransactionPage(await drawerApi.transactions(id,p)),enabled:Boolean(id),placeholderData:x=>x});
export const useDrawerAlerts=(id,p)=>useQuery({queryKey:['drawer','alerts',String(id),p],queryFn:()=>drawerApi.alerts(id,p),enabled:Boolean(id),placeholderData:x=>x});
