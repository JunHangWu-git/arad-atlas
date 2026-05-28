import "server-only";

import { neopleFetch } from "./client";
import { serverListSchema, type ServerList } from "./schemas";

/** Fetch the list of DFO Global servers. */
export async function getServers(): Promise<ServerList> {
  return neopleFetch("/df/servers", undefined, serverListSchema);
}
