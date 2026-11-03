import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "../lib/env";
import dns from "node:dns";

// Configure DNS defaults
try {
  dns.setDefaultResultOrder?.("ipv4first");
  dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
} catch {
  // Ignore in environments where setServers is restricted
}

// In Node.js, dns.lookup calls getaddrinfo directly and ignores dns.setServers.
// When an ISP/router DNS returns ENOTFOUND or REFUSED, fall back to c-ares resolve4/resolve6.
const globalDns = dns as any;
if (!globalDns.__lookup_fallback_installed) {
  globalDns.__lookup_fallback_installed = true;
  const originalLookup = dns.lookup;

  dns.lookup = function (
    hostname: string,
    options: any,
    callback?: (err: NodeJS.ErrnoException | null, address: any, family?: number) => void
  ) {
    let cb = callback;
    let opts = options;
    if (typeof options === "function") {
      cb = options;
      opts = {};
    } else if (typeof options === "number") {
      opts = { family: options };
    } else if (!options) {
      opts = {};
    }

    originalLookup(hostname, opts, (err, address, family) => {
      if (!err) {
        return cb!(null, address, family);
      }

      const fam = opts.family === 6 ? 6 : 4;
      const resolver = fam === 6 ? dns.resolve6 : dns.resolve4;

      resolver(hostname, (resErr, addresses) => {
        if (resErr || !addresses || addresses.length === 0) {
          const altResolver = fam === 6 ? dns.resolve4 : dns.resolve6;
          const altFam = fam === 6 ? 4 : 6;
          return altResolver(hostname, (altErr, altAddresses) => {
            if (altErr || !altAddresses || altAddresses.length === 0) {
              return cb!(err, undefined as any, undefined as any);
            }
            if (opts.all) {
              return cb!(
                null,
                altAddresses.map((addr) => ({ address: addr, family: altFam }))
              );
            }
            cb!(null, altAddresses[0], altFam);
          });
        }

        if (opts.all) {
          return cb!(
            null,
            addresses.map((addr) => ({ address: addr, family: fam }))
          );
        }
        cb!(null, addresses[0], fam);
      });
    });
  } as any;
}

declare global {
  var _postgresClient: postgres.Sql | undefined;
}

const client =
  globalThis._postgresClient ??
  postgres(env.DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis._postgresClient = client;
}

export const db = drizzle(client, { schema });

export type Db = typeof db;
