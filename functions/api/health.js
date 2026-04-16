import { handleOptions, json } from '../_utils/http.js';

export async function onRequest(context) {
  const optionsResponse = handleOptions(context.request);
  if (optionsResponse) return optionsResponse;

  return json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}
