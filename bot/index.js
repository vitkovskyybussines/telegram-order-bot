const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const crypto = require('crypto');

const TOKEN = process.env.BOT_TOKEN;
const MANAGER_ID = Number(process.env.MANAGER_ID);
const MANAGER_USERNAME = 'OlegVitkovskyy';

const bot = new TelegramBot(TOKEN, { polling: true });

const STORES_FILE = './stores.json';
const REQUESTS_FILE = './requests.json';

const SHOP_CODE_REGEX = /^SHOP-\d+$/;

let awaitingRequestText = {};
let awaitingAuth = {};

/* =========================
   Utils
========================= */

function readJson(path) {
  try {
    if (!fs.existsSync(path)) return [];
    return JSON.parse(fs.readFileSync(path, 'utf8') || '[]');
  } catch {
    return [];
  }
}

function writeJson(path, data) {
  try {
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
  } catch {}
}

function getStore(userId) {
  return readJson(STORES_FILE).find(s => s.userId === userId);
}

function nextRequestId(requests) {
  return requests.length ? Math.max(...requests.map(r => r.id)) + 1 : 1;
}

function statusText(status) {
  if (status === 'pending') return 'Очікує підтвердження';
  if (status === 'received') return 'Прийнято в роботу';
  if (status === 'processed') return 'Виконано';
  return status;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

/* =========================
   initData validation
========================= */

function isValidInitData(initData) {
  try {
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
  } catch {
    return false;
  }
}

/* =========================
   Keyboards
========================= */

const contactButton = ['📞 Звʼязок з менеджером'];

const startKeyboard = {
  reply_markup: {
    keyboard: [
      ['🔐 Авторизуватись'],
      contactButton
    ],
    resize_keyboard: true
  }
};

function storeKeyboardWithMiniApp() {
  return {
    reply_markup: {
      keyboard: [
        [
          {
            text: '🔵 Зробити замовлення',
            web_app: { url: 'https://vitkovskyybussines.github.io/telegram-order-bot/miniapp/v2/' }
          }
        ],
        ['➕ Створити заявку'],
        ['📄 Мої заявки'],
        contactButton
      ],
      resize_keyboard: true
    }
  };
}

const managerKeyboard = {
  reply_markup: {
    keyboard: [
      ['📦 Всі заявки (сьогодні)'],
      ['🟡 Очікують', '🔵 В роботі'],
      ['🟢 Виконані (сьогодні)']
    ],
    resize_keyboard: true
  }
};

/* =========================
   /start
========================= */

bot.onText(/\/start/, msg => {
  const userId = msg.from.id;

  if (userId === MANAGER_ID) {
    bot.sendMessage(userId, 'Панель менеджера', managerKeyboard);
    return;
  }

  const store = getStore(userId);

  if (!store) {
    bot.sendMessage(userId, '👋 Вітаємо! Оберіть дію:', startKeyboard);
    return;
  }

  if (store.approved) {
    bot.sendMessage(
      userId,
      `Ви авторизовані як ${store.storeCode}`,
      storeKeyboardWithMiniApp()
    );
  } else {
    bot.sendMessage(userId, 'Доступ заборонено. Зверніться до менеджера.', {
      reply_markup: { keyboard: [contactButton], resize_keyboard: true }
    });
  }
});

/* =========================
   Messages
========================= */

bot.on('message', msg => {
  try {
    const userId = msg.from.id;
    const text = msg.text;
    if (!text || text.startsWith('/')) return;

    if (text === '🔐 Авторизуватись') {
      bot.sendMessage(userId, 'Введіть код магазину (SHOP-001)');
      return;
    }

    if (text === '📞 Звʼязок з менеджером') {
      bot.sendMessage(userId, 'Звʼяжіться з менеджером:', {
        reply_markup: {
          inline_keyboard: [[
            { text: 'Написати менеджеру', url: `https://t.me/${MANAGER_USERNAME}` }
          ]]
        }
      });
      return;
    }

    if (userId === MANAGER_ID) {
      if (text === '📦 Всі заявки (сьогодні)') showManagerRequests(r => r.createdAt === today());
      if (text === '🟡 Очікують') showManagerRequests(r => r.status === 'pending');
      if (text === '🔵 В роботі') showManagerRequests(r => r.status === 'received');
      if (text === '🟢 Виконані (сьогодні)') showManagerRequests(r => r.status === 'processed' && r.createdAt === today());
      return;
    }

    const store = getStore(userId);

    if (!store) {
      if (SHOP_CODE_REGEX.test(text)) {
        awaitingAuth[userId] = text;

        bot.sendMessage(
          MANAGER_ID,
          `🔐 Запит авторизації\nМагазин: ${text}\nUser ID: ${userId}`,
          {
            reply_markup: {
              inline_keyboard: [[
                { text: '✅ Прийняти', callback_data: `auth_accept_${userId}` },
                { text: '❌ Відхилити', callback_data: `auth_reject_${userId}` }
              ]]
            }
          }
        );

        bot.sendMessage(userId, 'Запит на авторизацію надіслано менеджеру');
      }
      return;
    }

    if (!store.approved) return;

    if (awaitingRequestText[userId]) {
      createRequest(userId, store.storeCode, text);
      delete awaitingRequestText[userId];
      return;
    }

    if (text === '➕ Створити заявку') {
      awaitingRequestText[userId] = true;
      bot.sendMessage(userId, 'Введіть текст заявки');
    }

    if (text === '📄 Мої заявки') {
      showMyRequests(userId);
    }
  } catch {}
});

/* =========================
   MINI APP DATA
========================= */

bot.on('web_app_data', msg => {
  try {
    const userId = msg.from.id;
    const store = getStore(userId);
    if (!store || !store.approved) return;

    const payload = JSON.parse(msg.web_app_data.data);

    if (!payload.initData || !isValidInitData(payload.initData)) return;

    let text = 'Замовлення з каталогу:\n\n';
    payload.items.forEach(i => {
      text += `• ${i.name} (${i.weight}) × ${i.qty}\n`;
    });

    createRequest(userId, store.storeCode, text);
  } catch {}
});

/* =========================
   Requests + Callbacks
   (БЕЗ ЗМІН)
========================= */
// ⬇️ весь код нижче — ТВОЄ ОРИГІНАЛЬНЕ
