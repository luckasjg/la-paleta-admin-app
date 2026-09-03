import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getSharedSlackToken, resolveChannelId, postToChannel } from '../../shared/slackChannel.ts';
import { LOW_STOCK_CHANNEL, isBelowMinimum, summaryText } from '../../shared/lowStock.ts';

// Recordatorio diario: resumen consolidado de todos los insumos bajo el mínimo.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    // Listar todos los insumos paginando.
    const all = [];
    const PAGE = 500;
    for (let page = 0; page < 100; page++) {
      const batch = await base44.asServiceRole.entities.Supply.list('-created_date', PAGE, page * PAGE);
      if (!batch || batch.length === 0) break;
      all.push(...batch);
      if (batch.length < PAGE) break;
    }

    const low = all.filter(isBelowMinimum).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    if (low.length === 0) {
      return Response.json({ ok: true, low_count: 0, skipped: 'nothing below minimum' });
    }

    const accessToken = await getSharedSlackToken(base44);
    if (!accessToken) return Response.json({ skipped: true, reason: 'no slack connection' });

    const channelId = await resolveChannelId(accessToken, LOW_STOCK_CHANNEL);
    await postToChannel(accessToken, channelId, summaryText(low));

    const now = new Date().toISOString();
    await base44.asServiceRole.entities.Supply.bulkUpdate(
      low.map((s) => ({ id: s.id, low_stock_alerted: true, low_stock_alerted_at: now }))
    );

    return Response.json({ ok: true, low_count: low.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}