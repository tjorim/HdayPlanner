import type { HdayEvent } from '../lib/hday';
import { api } from './client';

export type HdayDocument = { raw: string; events: HdayEvent[] };

/**
 * Fetches the hday document for a given user.
 *
 * @param user - The username or identifier of the user whose hday document to retrieve
 * @returns The hday document for the specified user
 */
export async function getHday(user: string): Promise<HdayDocument> {
  return api(`/api/hday/${user}`);
}

/**
 * Stores the given hday document for the specified user.
 *
 * @param user - Identifier of the user whose hday document will be stored
 * @param doc - hday document containing `raw` content and parsed `events`
 * @returns The response string returned by the API
 */
export async function putHday(
  user: string,
  doc: HdayDocument,
): Promise<string> {
  return api(`/api/hday/${user}`, { method: 'PUT', body: JSON.stringify(doc) });
}
