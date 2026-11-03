import { syncSubscription } from '@/lib/billing/service';

/**
 * Mercado Pago calls this when a Pro subscription changes. As with payments, the call only makes
 * Naora read the subscription again with its own token; a forged call changes nothing.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const body = (await request.json().catch(() => ({}))) as {
    type?: string;
    data?: { id?: string | number };
  };
  const type = url.searchParams.get('type') ?? url.searchParams.get('topic') ?? body.type;
  const id = String(url.searchParams.get('data.id') ?? body.data?.id ?? '');
  if (
    !['subscription_preapproval', 'preapproval'].includes(String(type)) ||
    !/^[\w-]{1,64}$/.test(id)
  ) {
    return Response.json({ received: true, ignored: true });
  }
  try {
    return Response.json({ received: true, outcome: await syncSubscription(id) });
  } catch (error) {
    console.error('[webhook] could not read the subscription', error);
    return Response.json({ received: false }, { status: 502 });
  }
}
