import { NextResponse } from 'next/server';
import { connectedWallets } from '../telegram-webhook/route';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) {
      return NextResponse.json({
        ok: false,
        error: 'Missing chatId parameter',
        allWallets: Array.from(connectedWallets.entries())
      });
    }

    const wallet = connectedWallets.get(Number(chatId));
    return NextResponse.json({
      ok: true,
      chatId: Number(chatId),
      walletAddress: wallet || null,
      allWallets: Array.from(connectedWallets.entries())
    });
  } catch (err) {
    console.error('Test wallet error:', err);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
