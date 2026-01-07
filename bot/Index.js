const TelegramBot = require('node-telegram-bot-api');
const crypto = require('crypto');

const TOKEN = process.env.BOT_TOKEN;
const MANAGER_ID = Number(process.env.MANAGER_ID);

if (!TOKEN) {
  throw new Error('BOT_TOKEN is required');
}

const bot = new TelegramBot(TOKEN, { polling: true });

/* =========================
   initData validation
========================= */

function isValidInitData(initData) {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = crypto
    .createHash('sha256')
    .update(TOKEN)
    .digest();

  const hmac = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  return hmac === hash;
}

/* =========================
   Commands
========================= */

bot.onText(/\/start/, msg => {
  bot.sendMessage(
    msg.chat.id,
    '👋 Вітаю! Відкрий каталог та створи замовлення 👇',
    {
      reply_markup: {
        inline_keyboard: [[
          {
            text: '🛒 Зробити замовлення',
            web_app: {
              url: 'https://vitkovskyybussines.github.io/telegram-order-bot/miniapp/v2/'
            }
          }
        ]]
      }
    }
  );
});

/* =========================
   Mini App data
========================= */

bot.on('web_app_data', msg => {
  try {
    const payload = JSON.parse(msg.web_app_data.data);

    if (!payload.initData || !isValidInitData(payload.initData)) {
      return;
    }

    let text = '🛒 НОВЕ ЗАМОВЛЕННЯ\n\n';

    payload.items.forEach(i => {
      text += `• ${i.name} (${i.weight}) × ${i.qty}\n`;
    });

    if (payload.comment) {
      text += `\n💬 Коментар:\n${payload.comment}`;
    }

    bot.sendMessage(MANAGER_ID, text);
    bot.sendMessage(msg.chat.id, '✅ Замовлення прийнято. Дякуємо!');
  } catch (e) {
    console.error('web_app_data error', e);
  }
});
