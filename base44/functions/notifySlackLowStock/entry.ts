import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getSharedSlackToken, resolveChannelId, postToChannel } from '../../shared/slackChannel.ts';
import { LOW_STOCK_CHANNEL, isBelowMinimum, singleAlertText } from '../../shared/lowStock.ts';

// Alerta inmediata: se dispara desde la automatización de entidad Supply (update).
// Solo notifica cuando el insumo CRUZA el umbral hacia abajo (antes estaba bien).
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const entityId = body?.event?.entity_id;
    if (!entityId) return Response.json({ skipped: true, reason: 'missing entity_id' });

    // Nunca confiar en el payload: releer el registro actual desde la DB.
    const supply = await base44.asServiceRole.entities.Supply.get(entityId);
    if (!supply) return Response.json({ skipped: true, reason: 'supply not found' });

    const nowBelow = isBelowMinimum(supply);

    // Reposición: si volvió sobre el mínimo, limpiar la marca y salir.
    if (!nowBelow) {
      if (supply.low_stock_alerted) {
        await base44.asServiceRole.entities.Supply.update(supply.id, {
          low_stock_alerted: false,
          low_stock_alerted_at: null,
        });
      }
      return Response.json({ skipped: true, reason: 'stock ok' });
    }

    // Ya estaba bajo el mínimo y ya se avisó → el recordatorio diario se encarga.
    if (supply.low_stock_alerted) {
      return Response.json({ skipped: true, reason: 'already alerted' });
    }

    const accessToken = await getSharedSlackToken(base44);
    if (!accessToken) return Response.json({ skipped: true, reason: 'no slack connection' });

    const channelId = await resolveChannelId(accessToken, LOW_STOCK_CHANNEL);
    await postToChannel(accessToken, channelId, singleAlertText(supply));

    await base44.asServiceRole.entities.Supply.update(supply.id, {
      low_stock_alerted: true,
      low_stock_alerted_at: new Date().toISOString(),
    });

    return Response.json({ ok: true, supply: supply.name });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}