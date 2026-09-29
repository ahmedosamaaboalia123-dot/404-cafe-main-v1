import apiClient from "@/services/apiClient";
import { endpoints } from "@/services/endpoints";

export const CUSTOMERS_KEY = ["customers"];
export const customerKey = (id) => ["customers", id];

const unwrap = (response) => response?.data || response;

export async function getCustomers(params = { page: 1, pageSize: 100 }) {
  const response = await apiClient.get(endpoints.customers.list, { params });
  return unwrap(response);
}

export async function getCustomer(id) {
  const response = await apiClient.get(endpoints.customers.byId(id));
  return unwrap(response);
}

export async function getCustomerOrders(id) {
  const response = await apiClient.get(endpoints.customers.orders(id));
  return unwrap(response);
}

export async function createCustomer(payload) {
  const response = await apiClient.post(endpoints.customers.list, payload);
  return unwrap(response);
}

export async function updateCustomer(id, payload) {
  const response = await apiClient.put(endpoints.customers.byId(id), payload);
  return unwrap(response);
}

export async function deleteCustomer(id) {
  const response = await apiClient.delete(endpoints.customers.byId(id));
  return unwrap(response);
}

export function customersErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}