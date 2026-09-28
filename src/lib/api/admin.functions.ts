// The single place data is fetched. To connect a real API, replace the
// mock calls inside each handler with fetch() to your backend
// (read keys from process.env inside the handler).
import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { mockDashboard, mockShell } from "./mock-data";
import type { DateRange } from "./types";

const rangeSchema = z.enum(["Today", "7d", "30d", "90d", "YTD"]);

export const getShell = createServerFn({ method: "GET" }).handler(async () => {
  // e.g. return fetch(`${process.env.API_URL}/me`).then(r => r.json())
  return mockShell();
});

export const getDashboard = createServerFn({ method: "GET" })
  .inputValidator((d: { range: DateRange }) => z.object({ range: rangeSchema }).parse(d))
  .handler(async ({ data }) => {
    // e.g. return fetch(`${process.env.API_URL}/dashboard?range=${data.range}`).then(r => r.json())
    return mockDashboard(data.range);
  });

export const shellQuery = () =>
  queryOptions({ queryKey: ["shell"], queryFn: () => getShell(), staleTime: 60_000 });

export const dashboardQuery = (range: DateRange) =>
  queryOptions({
    queryKey: ["dashboard", range],
    queryFn: () => getDashboard({ data: { range } }),
    staleTime: 30_000,
  });
