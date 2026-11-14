import { NextResponse } from 'next/server';
import { TELEGRAM_BOT_TOKEN } from '../../../components/constent';
import { processMessage } from '../telegram-webhook/route';

// Store last update ID to avoid duplicates
let lastUpdateId = 0;

export async function GET() {
  try {
    // Get updates from Telegram (polling)
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}`, {
      method: 'GET',
    });

    const data = await response.json();

    if (data.ok && data.result && data.result.length > 0) {
      // Process each update
      const processedUpdates = [];
      for (const update of data.result) {
        await processMessage(update);
        processedUpdates.push(update);
        lastUpdateId = update.update_id;
      }

      return NextResponse.json({
        success: true,
        processed: processedUpdates.length,
        updates: processedUpdates,
        lastUpdateId
      });
    } else {
      return NextResponse.json({
        success: true,
        message: 'No new messages',
        lastUpdateId
      });
    }
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: (err as Error).message
    }, { status: 500 });
  }
}
