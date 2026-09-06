import { apiGet } from './client.js';

export async function getUpsells() {
  const data = await apiGet('/modules/upsell');
  return data;
}
