import { CalculationHistoryEntry } from '../types';

// Telegram Bot Configuration
const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID || '';

/**
 * Send calculation result to Telegram group
 */
export async function sendCalculationToTelegram(
  entry: CalculationHistoryEntry
): Promise<boolean> {
  // Skip if no token or chat ID configured
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('⚠️ Telegram integration not configured. Set VITE_TELEGRAM_BOT_TOKEN and VITE_TELEGRAM_CHAT_ID');
    console.log('Token:', TELEGRAM_BOT_TOKEN ? 'Present' : 'Missing');
    console.log('Chat ID:', TELEGRAM_CHAT_ID ? 'Present' : 'Missing');
    return false;
  }

  console.log('📤 Sending to Telegram...');
  console.log('Bot Token:', TELEGRAM_BOT_TOKEN.substring(0, 10) + '...');
  console.log('Chat ID:', TELEGRAM_CHAT_ID);

  try {
    const message = formatCalculationMessage(entry);
    console.log('Message prepared, length:', message.length);
    
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    console.log('Sending to URL:', url.substring(0, 50) + '...');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Telegram API error response:', errorText);
      throw new Error(`Telegram API error: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Calculation sent to Telegram successfully!', result);
    return true;
  } catch (error) {
    console.error('❌ Failed to send to Telegram:', error);
    return false;
  }
}

/**
 * Format IDR with dot thousand separators
 * Example: 20726921.42 → "20.726.921"
 */
function formatIDRforTelegram(value: number): string {
  const rounded = Math.round(value);
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Format million Rp with 3 decimal places and comma separator
 * Example: 0.1234 → "0,123"
 * Example: 2.5678 → "2,568"
 */
function formatMillionRpForTelegram(value: number): string {
  return value.toFixed(3).replace('.', ',');
}

/**
 * Format calculation entry as Telegram message
 */
function formatCalculationMessage(entry: CalculationHistoryEntry): string {
  const date = new Date(entry.dateCreated).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const productInfo = entry.tileShape
    ? `${entry.productType} (${entry.tileShape})`
    : entry.productType;

  const kilnName = entry.kilnUsed === 'average' 
    ? 'Average of kilns' 
    : entry.kilnUsed === 'big' 
      ? 'Large (old)' 
      : 'Small (new)';

  return `
🔥 <b>New Calculation by ${entry.manager}</b>

📅 Date: ${date}

📦 <b>Product:</b> ${productInfo}
📏 <b>Dimensions:</b> ${entry.dimensions.length} × ${entry.dimensions.width} × ${entry.dimensions.thickness} cm
🎨 <b>Glaze:</b> ${entry.glazePlacement}

🏭 <b>Kiln:</b> ${kilnName}
📊 <b>Loading:</b> ${entry.loadingArea.toFixed(2)} m² (${entry.loadingPieces} pcs)

💰 <b>Stone Cost:</b> ${formatMillionRpForTelegram(entry.stoneCost)} mil Rp/m²
📦 <b>Order Qty:</b> ${entry.orderQuantity} pcs

💵 <b>Indonesia Market:</b>
  • Per piece: ${formatIDRforTelegram(entry.costResult.indonesia.pricePerPcs)} IDR
  • Per m²: ${formatIDRforTelegram(entry.costResult.indonesia.pricePerSqM)} IDR
  • Margin: ${entry.costResult.indonesia.marginPercent.toFixed(1)}%

💎 <b>Abroad Market:</b>
  • Per piece: ${formatIDRforTelegram(entry.costResult.abroad.pricePerPcs)} IDR
  • Per m²: ${formatIDRforTelegram(entry.costResult.abroad.pricePerSqM)} IDR
  • Margin: ${entry.costResult.abroad.marginPercent.toFixed(1)}%

━━━━━━━━━━━━━━━━━━━━
🆔 ID: ${entry.id}
`.trim();
}

/**
 * Test Telegram connection
 */
export async function testTelegramConnection(): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('⚠️ Telegram not configured');
    return false;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: '✅ Moonjar Calculator connected successfully!',
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error('❌ Telegram connection test failed:', error);
    return false;
  }
}
