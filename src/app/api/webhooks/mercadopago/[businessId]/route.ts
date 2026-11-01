import { syncMercadoPagoPayment } from '@/lib/payments/service';

/**
 * Mercado Pago calls this when a payment changes: /api/webhooks/mercadopago/<business>?data.id=…
 * The request carries no proof we rely on. Naora reads the payment from Mercado Pago with the
 * business's own token and applies only what Mercado Pago says, so a forged call changes nothing.
 * It answers 200 quickly for anything it does not need, so Mercado Pago stops retrying.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> },
) {
  const { businessId } = await params;
  const url = new URL(request.url);
  const body = (await request.json().catch(() => ({}))) as {
    type?: string;
    data?: { id?: string | number };
  };
  const type = url.searchParams.get('type') ?? url.searchParams.get('topic') ?? body.type;
  const paymentId = String(
    url.searchParams.get('data.id') ?? url.searchParams.get('id') ?? body.data?.id ?? '',
  );

  if (type !== 'payment' || !/^\d{1,20}$/.test(paymentId)) {
    return Response.json({ received: true, ignored: true });
  }
  try {
    const outcome = await syncMercadoPagoPayment(businessId, paymentId);
    return Response.json({ received: true, outcome });
  } catch (error) {
    // Mercado Pago retries on errors, which is what we want if it was down for a moment.
    console.error('[webhook] could not read the payment', error);
    return Response.json({ received: false }, { status: 502 });
  }
}
