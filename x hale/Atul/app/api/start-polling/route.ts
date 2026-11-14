import { NextResponse } from 'next/server';
import { TELEGRAM_BOT_TOKEN } from '../../../components/constent';
import { processMessage } from '../telegram-webhook/route';

// Store last update ID to avoid duplicates
let lastUpdateId = 0;
let isPolling = false;

export async function GET() {
  if (isPolling) {
    return NextResponse.json({
      success: true,
      message: 'Polling already running',
      lastUpdateId
    });
  }

  isPolling = true;

  // Start continuous polling
  pollTelegram();

  return NextResponse.json({
    success: true,
    message: 'Polling started',
    lastUpdateId
  });
}

async function pollTelegram() {
  console.log('Starting Telegram polling...');

  while (isPolling) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`, {
        method: 'GET',
      });

      const data = await response.json();

      if (data.ok && data.result && data.result.length > 0) {
        console.log(`Received ${data.result.length} updates`);
        for (const update of data.result) {
          console.log('Processing update:', update.update_id);
          await processMessage(update);
          lastUpdateId = update.update_id;
        }
      }
    } catch (err) {
      console.error('Polling error:', err);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  console.log('Polling stopped');
}

export async function POST() {
  isPolling = false;
  return NextResponse.json({
    success: true,
    message: 'Polling stopped'
  });
}
