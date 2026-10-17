import { subscribe } from "node:diagnostics_channel";
import type { IncomingMessage, ServerResponse } from "node:http";

/*
 * Logs how much CPU each request and each new server instance costs, so the
 * Hobby plan's Active CPU allowance can be spent where it's measured to go.
 * Hobby has no per-route CPU metrics (that is Observability Plus), and the
 * runtime logs these lines land in are free.
 *
 * One JSON line per event, read back from `vercel logs --json`:
 *   {"cpu":"boot", "ms": CPU used starting the instance, "up": uptime}
 *   {"cpu":"req", "p": route, "ms": CPU, "wall": ms, "conc": requests in
 *    flight, "cold": the request the instance was started for}
 *
 * A request's CPU is the process's CPU between its start and its finish, so
 * it includes whatever else ran meanwhile; `conc` > 1 marks those. Paths are
 * logged without the query string, and any long id-like segment (record
 * ids, profile share tokens) as ":id", so no secret reaches the logs.
 *
 * On Vercel, Next loads this module from inside the request that started
 * the instance, so that request began before the subscriptions below and
 * was never seen to start. It is timed from the boot line instead and
 * marked "cold": a cold start costs the boot line's ms plus the cold
 * line's. `conc` on other lines does not count a cold request still in
 * flight.
 *
 * On by default in production; set CPU_LOG=0 to turn it off.
 */

type Started = { cpu: NodeJS.CpuUsage; at: number };

const started = new WeakMap<IncomingMessage, Started>();
let inFlight = 0;

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

  const boot: Started = { cpu: process.cpuUsage(), at: performance.now() };

  console.log(
    JSON.stringify({
      cpu: "boot",
      ms: msOf(boot.cpu),
      up: Math.round(process.uptime() * 1000),
    })
  );

  subscribe("http.server.request.start", (message) => {
    const { request } = message as { request: IncomingMessage };
    inFlight++;
    started.set(request, { cpu: process.cpuUsage(), at: performance.now() });
  });

  subscribe("http.server.response.finish", (message) => {
    const { request, response } = message as {
      request: IncomingMessage;
      response: ServerResponse;
    };
    const start = started.get(request);
    let concurrent: number;

    if (start) {
      started.delete(request);
      concurrent = inFlight;
      inFlight--;
    } else {
      // A cold request: it never counted itself into inFlight.
      concurrent = inFlight + 1;
    }

    const from = start ?? boot;

    console.log(
      JSON.stringify({
        cpu: "req",
        m: request.method,
        p: routeOf(request),
        s: response.statusCode,
        ms: msOf(process.cpuUsage(from.cpu)),
        wall: Math.round(performance.now() - from.at),
        conc: concurrent,
        ...(start ? {} : { cold: 1 }),
        ...(request.headers.rsc ? { rsc: 1 } : {}),
        ...(request.headers["next-router-prefetch"] ? { pf: 1 } : {}),
      })
    );
  });
}
