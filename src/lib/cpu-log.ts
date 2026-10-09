import { subscribe } from "node:diagnostics_channel";
import type { IncomingMessage, ServerResponse } from "node:http";

/*
 * Logs how much CPU each request and each new server instance costs, so the
 * Hobby plan's Active CPU allowance can be spent where it's measured to go.
 * Hobby has no per-route CPU metrics (that is Observability Plus), and the
 * runtime logs these lines land in are free.
 *
 * One JSON line per event, read back from `vercel logs --json`:
 *   {"cpu":"boot", "ms": CPU used before the first request, "up": uptime}
 *   {"cpu":"req", "p": route, "ms": CPU, "wall": ms, "conc": requests in
 *    flight, "first": the instance's first request (loads its modules)}
 *
 * A request's CPU is the process's CPU between its start and its finish, so
 * it includes whatever else ran meanwhile; `conc` > 1 marks those. Paths are
 * logged without the query string, and any long id-like segment (record
 * ids, profile share tokens) as ":id", so no secret reaches the logs.
 *
 * On by default in production; set CPU_LOG=0 to turn it off.
 */

type Started = { cpu: NodeJS.CpuUsage; at: number; first: boolean };

const started = new WeakMap<IncomingMessage, Started>();
let inFlight = 0;
let served = 0;

const msOf = (usage: NodeJS.CpuUsage) =>
  Math.round((usage.user + usage.system) / 100) / 10;

function routeOf(request: IncomingMessage): string {
  const path = (request.url ?? "").split("?")[0];
  return path
    .split("/")
    .map((segment) => (/^[A-Za-z0-9_-]{16,}$/.test(segment) ? ":id" : segment))
    .join("/");
}

export function startCpuLog() {
  if (process.env.CPU_LOG === "0") {
    return;
  }

  console.log(
    JSON.stringify({
      cpu: "boot",
      ms: msOf(process.cpuUsage()),
      up: Math.round(process.uptime() * 1000),
    })
  );

  subscribe("http.server.request.start", (message) => {
    const { request } = message as { request: IncomingMessage };
    inFlight++;
    started.set(request, {
      cpu: process.cpuUsage(),
      at: performance.now(),
      first: served === 0,
    });
  });

  subscribe("http.server.response.finish", (message) => {
    const { request, response } = message as {
      request: IncomingMessage;
      response: ServerResponse;
    };
    const start = started.get(request);

    if (!start) {
      return;
    }

    started.delete(request);
    const concurrent = inFlight;
    inFlight--;
    served++;

    console.log(
      JSON.stringify({
        cpu: "req",
        m: request.method,
        p: routeOf(request),
        s: response.statusCode,
        ms: msOf(process.cpuUsage(start.cpu)),
        wall: Math.round(performance.now() - start.at),
        conc: concurrent,
        ...(start.first ? { first: 1 } : {}),
        ...(request.headers.rsc ? { rsc: 1 } : {}),
        ...(request.headers["next-router-prefetch"] ? { pf: 1 } : {}),
      })
    );
  });
}
