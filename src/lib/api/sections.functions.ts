// Server functions + query options for every admin section.
// To connect a real API, replace each mock call with fetch() to your backend
// (read keys from process.env inside the handler).
import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import * as M from "./mock-sections";
import { TEAM_ACCOUNTS, initialsOf } from "./team-accounts";

const opts = <T,>(key: string, fn: () => Promise<T>) =>
  queryOptions({ queryKey: ["section", key], queryFn: fn, staleTime: 30_000 });

export const getOrders = createServerFn({ method: "GET" }).handler(async () => M.mockOrders());
export const getOrder = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string().trim().min(1).max(40) }).parse(d))
  .handler(async ({ data }) => M.mockOrderDetail(data.id));
export const getOrderForm = createServerFn({ method: "GET" }).handler(async () => M.mockOrderForm());
export const getReturns =createServerFn({ method: "GET" }).handler(async () => M.mockReturns());
export const getPayments = createServerFn({ method: "GET" }).handler(async () => M.mockPayments());
export const getCustomers = createServerFn({ method: "GET" }).handler(async () => M.mockCustomers());
export const getEnquiries = createServerFn({ method: "GET" }).handler(async () => M.mockEnquiries());
export const getProducts = createServerFn({ method: "GET" }).handler(async () => M.mockProducts());
export const getCategories = createServerFn({ method: "GET" }).handler(async () => M.mockCategories());
export const getBrands = createServerFn({ method: "GET" }).handler(async () => M.mockBrands());
export const getAttributes = createServerFn({ method: "GET" }).handler(async () => M.mockAttributes());
export const getInventory = createServerFn({ method: "GET" }).handler(async () => M.mockInventory());
export const getDiscounts = createServerFn({ method: "GET" }).handler(async () => M.mockDiscounts());
export const getBundles = createServerFn({ method: "GET" }).handler(async () => M.mockBundles());
export const getDelivery = createServerFn({ method: "GET" }).handler(async () => M.mockDelivery());
export const getStaff = createServerFn({ method: "GET" }).handler(async () => M.mockStaff());
export const getActivity = createServerFn({ method: "GET" }).handler(async () => M.mockActivity());
export const getApprovals = createServerFn({ method: "GET" }).handler(async () => M.mockApprovals());
export const getReports = createServerFn({ method: "GET" }).handler(async () => M.mockReports());

const simpleKeys = ["selling", "browsing", "loyalty", "gifting", "content", "scripts", "settings"] as const;
export type SimpleKey = (typeof simpleKeys)[number];
export const getSimplePage = createServerFn({ method: "GET" })
  .inputValidator((d: { key: SimpleKey }) => z.object({ key: z.enum(simpleKeys) }).parse(d))
  .handler(async ({ data }) => M.SIMPLE_PAGES[data.key]!());

// Mock sign-in: accepts any active team email with the demo password.
// Swap this handler for a POST to your real auth endpoint later.
const DEMO_PASSWORD = "zelliny123";

export const signIn = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; password: string }) => z.object({ email: z.string().trim().min(1).max(255), password: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const v = data.email.trim().toLowerCase();
    const acc = TEAM_ACCOUNTS.find((a) => a.email.toLowerCase() === v || a.username.toLowerCase() === v);
    if (!acc || data.password !== DEMO_PASSWORD) {
      return { ok: false as const, error: "Those details didn't match our records." };
    }
    const initials = initialsOf(acc.name);
    return {
      ok: true as const,
      user: { id: acc.email, name: acc.name, initials, role: acc.role, username: acc.username },
    };
  });

export const ordersQuery = () => opts("orders", () => getOrders());
export const orderQuery = (id: string) => opts(`order-${id}`, () => getOrder({ data: { id } }));
export const orderFormQuery = () => opts("order-form", () => getOrderForm());
export const returnsQuery =() => opts("returns", () => getReturns());
export const paymentsQuery = () => opts("payments", () => getPayments());
export const customersQuery = () => opts("customers", () => getCustomers());
export const enquiriesQuery = () => opts("enquiries", () => getEnquiries());
export const productsQuery = () => opts("products", () => getProducts());
export const categoriesQuery = () => opts("categories", () => getCategories());
export const brandsQuery = () => opts("brands", () => getBrands());
export const attributesQuery = () => opts("attributes", () => getAttributes());
export const inventoryQuery = () => opts("inventory", () => getInventory());
export const discountsQuery = () => opts("discounts", () => getDiscounts());
export const bundlesQuery = () => opts("bundles", () => getBundles());
export const deliveryQuery = () => opts("delivery", () => getDelivery());
export const staffQuery = () => opts("staff", () => getStaff());
export const activityQuery = () => opts("activity", () => getActivity());
export const approvalsQuery = () => opts("approvals", () => getApprovals());
export const reportsQuery = () => opts("reports", () => getReports());
export const simplePageQuery = (key: SimpleKey) => opts(`simple-${key}`, () => getSimplePage({ data: { key } }));

export const getBrowsing = createServerFn({ method: "GET" }).handler(async () => M.mockBrowsing());
export const browsingQuery = () => opts("browsing-people", () => getBrowsing());
