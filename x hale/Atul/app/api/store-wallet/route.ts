import { NextResponse } from 'next/server';
import { connectedWallets } from '../telegram-webhook/route';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { chatId, walletAddress } = body;

    if (!chatId || !walletAddress) {
      return NextResponse.json({ ok: false, error: 'Missing chatId or walletAddress' }, { status: 400 });
    }

    // Store the wallet address for this chat ID
    connectedWallets.set(Number(chatId), walletAddress);
    console.log(`✅ Stored wallet ${walletAddress} for chat ${chatId}`);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Store wallet error:', err);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
