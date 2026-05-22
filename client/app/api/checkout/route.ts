import { NextRequest, NextResponse } from 'next/server';
import { calculateShippingCost, getProvinces, getCities } from '../../../lib/rajaongkir';
import { prismaMock } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { photoUrl, frameId, address1, address2 } = body;

    // Validation
    if (!photoUrl || !frameId || !address1 || !address2) {
      return NextResponse.json(
        { error: 'Missing required parameters: photoUrl, frameId, address1, and address2 are required.' },
        { status: 400 }
      );
    }

    if (!address1.cityId || !address2.cityId) {
      return NextResponse.json(
        { error: 'City ID is required for both shipping addresses.' },
        { status: 400 }
      );
    }

    // Call RajaOngkir API twice in parallel from Bandung (23)
    const [shippingCost1, shippingCost2] = await Promise.all([
      calculateShippingCost(address1.cityId),
      calculateShippingCost(address2.cityId),
    ]);

    // Pricing components according to business rules
    const BASE_PACKAGE_PRICE = 50000; // Rp50.000 (includes 2 physical prints)
    const CREATOR_ROYALTY = 5000;    // Rp5.000 (accrual system)
    const ADMIN_FEE = 1000;          // Rp1.000 payment gateway admin fee

    // Total Invoice calculation
    const totalInvoice = BASE_PACKAGE_PRICE + shippingCost1 + shippingCost2 + ADMIN_FEE;

    // Store order in simulated database in PENDING status (Royalty is NOT paid yet)
    const order = await prismaMock.order.create({
      data: {
        totalPrice: totalInvoice,
        status: 'PENDING',
        photoUrl,
        frameId,
        shippingAddress1: JSON.stringify(address1),
        shippingAddress2: JSON.stringify(address2),
        shippingCost1,
        shippingCost2,
        adminFee: ADMIN_FEE,
        creatorRoyalty: CREATOR_ROYALTY,
      },
    });

    return NextResponse.json({
      success: true,
      order,
      pricing: {
        basePackagePrice: BASE_PACKAGE_PRICE,
        shippingCost1,
        shippingCost2,
        adminFee: ADMIN_FEE,
        creatorRoyalty: CREATOR_ROYALTY,
        totalInvoice,
      },
    });
  } catch (error: any) {
    console.error('Checkout API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// Simulated Payment Webhook or Payment Status Update
export async function PATCH(req: NextRequest) {
  try {
    const { orderId, status } = await req.json();

    if (!orderId || !status) {
      return NextResponse.json(
        { error: 'Missing orderId or status in request body.' },
        { status: 400 }
      );
    }

    if (status !== 'PAID') {
      return NextResponse.json(
        { error: 'Simulated payment PATCH only accepts status: "PAID"' },
        { status: 400 }
      );
    }

    // Retrieve order
    const order = await prismaMock.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return NextResponse.json({ error: `Order ${orderId} not found.` }, { status: 404 });
    }

    if (order.status === 'PAID') {
      return NextResponse.json({
        success: true,
        message: 'Order was already PAID.',
        order,
      });
    }

    // Update order status to PAID - this triggers the creator balance accrual increment in the mock DB!
    const updatedOrder = await prismaMock.order.update({
      where: { id: orderId },
      data: { status: 'PAID' },
    });

    // Check creator's balance after accrual
    const creatorId = updatedOrder.frameId;
    const balance = await prismaMock.creatorBalance.findUnique({ where: { creatorId } });

    return NextResponse.json({
      success: true,
      message: 'Simulated payment processed successfully. Creator balance accrued.',
      order: updatedOrder,
      creatorBalance: balance,
    });
  } catch (error: any) {
    console.error('Payment callback API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    if (type === 'provinces') {
      const provinces = await getProvinces();
      return NextResponse.json({ success: true, provinces });
    }

    if (type === 'cities') {
      const provinceId = searchParams.get('provinceId');
      if (!provinceId) {
        return NextResponse.json({ error: 'Missing provinceId query parameter.' }, { status: 400 });
      }
      const cities = await getCities(provinceId);
      return NextResponse.json({ success: true, cities });
    }

    if (type === 'balance') {
      const creatorId = searchParams.get('creatorId') || 'premium-frame-creator-1';
      const balance = await prismaMock.creatorBalance.findUnique({ where: { creatorId } });
      return NextResponse.json({ success: true, balance });
    }

    if (type === 'all-balances') {
      const balances = await prismaMock.creatorBalance.findMany();
      return NextResponse.json({ success: true, balances });
    }

    const orders = await prismaMock.order.findMany();
    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

