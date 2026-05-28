import "server-only";

import { neopleFetch } from "./client";
import { jobsSchema, skillListSchema, type Jobs, type SkillList } from "./schemas";

/**
 * Fetch the full job / advancement tree.
 *
 * Fetched direct (no cache): the response is a single small static blob and
 * callers can layer their own caching if needed. Keeping this simple avoids a
 * cache key + invalidation surface for data that rarely changes.
 */
export async function getJobs(): Promise<Jobs> {
  return neopleFetch("/df/jobs", undefined, jobsSchema);
}

/**
 * Fetch the skill list for a job advancement.
 *
 * `jobGrowId` is REQUIRED by the live API — calling `/df/skills/{jobId}`
 * without it returns 400 (DNF901), so it is a required parameter here.
 */
export async function getSkills(jobId: string, jobGrowId: string): Promise<SkillList> {
  return neopleFetch(`/df/skills/${jobId}`, { jobGrowId }, skillListSchema);
}
