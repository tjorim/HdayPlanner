import type { HdayEvent } from '../lib/hday';
import { api } from './client';

export type HdayDocument = { raw: string; events: HdayEvent[] };

export async function getHday(user: string): Promise<HdayDocument> {
  return api(`/api/hday/${user}`);
}

export async function putHday(
  user: string,
  doc: HdayDocument,
): Promise<string> {
  return api(`/api/hday/${user}`, { method: 'PUT', body: JSON.stringify(doc) });
}
