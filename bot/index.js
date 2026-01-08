const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const crypto = require('crypto');

const TOKEN = process.env.BOT_TOKEN;
const MANAGER_ID = Number(process.env.MANAGER_ID);
const MANAGER_USERNAME = 'OlegVitkovskyy';

const bot = new TelegramBot(TOKEN, { polling: true });

const STORES_FILE = './stores.json';
const REQUESTS_FILE = './requests.json';

let awaitingStoreName = {};
let awaitingRequestText = {};

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
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

function getStore(userId) {
  return readJson(STORES_FILE).find(s => s.userId === userId);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function statusText(status) {
  return {
    pending: 'Очікує підтвердження',
    received: 'Прийнято в роботу',
    processed: 'Виконано'
  }[status] || status;
}

/* =========================
   Keyboards
========================= */

const startKeyboard = {
  reply_markup: {
    keyboard: [
      ['🔐 Авторизуватись'],
      ['📞 Звʼязок з менеджером']
    ],
    resize_keyboard: true
  }
};

const storeKeyboard = {
  reply_markup: {
    keyboard: [
      ['➕ Створити заявку'],
      ['📄 Мої заявки'],
      ['📞 Звʼязок з менеджером']
    ],
    resize_keyboard: true
  }
};

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
    bot.sendMessage(userId, '👋 Вітаємо!', startKeyboard);
    return;
  }

  if (store.approved) {
    bot.sendMessage(userId, `✅ Ви авторизовані\n🏪 ${store.storeName}`, storeKeyboard);
  } else {
    bot.sendMessage(userId, '❌ Авторизацію відхилено.\nМожете подати запит повторно.', startKeyboard);
  }
});

/* =========================
   Messages
========================= */

bot.on('message', msg => {
  const userId = msg.from.id;
  const text = msg.text;
  if (!text || text.startsWith('/')) return;

  if (text === '📞 Звʼязок з менеджером') {
    bot.sendMessage(userId, 'Звʼяжіться з менеджером:', {
      reply_markup: {
        inline_keyboard: [[
          { text: '✉️ Написати менеджеру', url: `https://t.me/${MANAGER_USERNAME}` }
        ]]
      }
    });
    return;
  }

  if (text === '🔐 Авторизуватись') {
    awaitingStoreName[userId] = true;
    bot.sendMessage(userId, '🏪 Введіть назву магазину');
    return;
  }

  if (awaitingStoreName[userId]) {
    delete awaitingStoreName[userId];

    const stores = readJson(STORES_FILE);
    const existing = stores.find(s => s.userId === userId);

    if (existing && existing.approved) {
      bot.sendMessage(userId, '✅ Ви вже авторизовані', storeKeyboard);
      return;
    }

    bot.sendMessage(
      MANAGER_ID,
      `🔐 Запит авторизації\n🏪 Магазин: ${text}\n👤 User ID: ${userId}`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Прийняти', callback_data: `auth_accept_${userId}` },
              { text: '❌ Відхилити', callback_data: `auth_reject_${userId}` }
            ],
            [
              { text: '✉️ Написати користувачу', url: `https://t.me/${msg.from.username || ''}` }
            ]
          ]
        }
      }
    );

    stores.push({ userId, storeName: text, approved: false });
    writeJson(STORES_FILE, stores);

    bot.sendMessage(userId, '⏳ Запит на авторизацію надіслано менеджеру');
    return;
  }

  const store = getStore(userId);
  if (!store || !store.approved) return;

  if (text === '➕ Створити заявку') {
    awaitingRequestText[userId] = true;
    bot.sendMessage(userId, '📝 Введіть текст заявки');
    return;
  }

  if (awaitingRequestText[userId]) {
    delete awaitingRequestText[userId];
    createRequest(userId, store.storeName, text);
    return;
  }

  if (text === '📄 Мої заявки') {
    showMyRequests(userId);
  }
});

/* =========================
   Requests
========================= */

function createRequest(userId, storeName, text) {
  const requests = readJson(REQUESTS_FILE);
  const id = requests.length + 1;

  const req = {
    id,
    userId,
    storeName,
    text,
    status: 'pending',
    createdAt: today()
  };

  requests.push(req);
  writeJson(REQUESTS_FILE, requests);

  bot.sendMessage(userId, `📨 Заявка №${id} створена`);

  bot.sendMessage(
    MANAGER_ID,
    `🆕 Заявка №${id}\n🏪 ${storeName}\n\n${text}`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📥 Отримана', callback_data: `status_received_${id}` }],
          [{ text: '✉️ Написати користувачу', url: `tg://user?id=${userId}` }]
        ]
      }
    }
  );
}

/* =========================
   Views
========================= */

function showMyRequests(userId) {
  const requests = readJson(REQUESTS_FILE).filter(r => r.userId === userId);
  if (!requests.length) {
    bot.sendMessage(userId, 'Заявок немає');
    return;
  }

  requests.forEach(r => {
    bot.sendMessage(userId, `№${r.id}\nСтатус: ${statusText(r.status)}\n${r.text}`);
  });
}

/* =========================
   Callbacks
========================= */

bot.on('callback_query', q => {
  const data = q.data;
  const msg = q.message;

  if (data.startsWith('auth_')) {
    const [, action, userIdStr] = data.split('_');
    const userId = Number(userIdStr);

    const stores = readJson(STORES_FILE);
    const store = stores.find(s => s.userId === userId);
    if (!store) return;

    store.approved = action === 'accept';
    writeJson(STORES_FILE, stores);

    bot.sendMessage(
      userId,
      store.approved
        ? '✅ Авторизацію підтверджено'
        : '❌ Авторизацію відхилено. Можете подати запит повторно.',
      store.approved ? storeKeyboard : startKeyboard
    );

    bot.editMessageReplyMarkup(
      {
        inline_keyboard: [
          [{ text: '✉️ Написати користувачу', url: `tg://user?id=${userId}` }]
        ]
      },
      { chat_id: msg.chat.id, message_id: msg.message_id }
    );

    bot.answerCallbackQuery(q.id);
    return;
  }

  if (data.startsWith('status_')) {
    const [, status, idStr] = data.split('_');
    const id = Number(idStr);

    const requests = readJson(REQUESTS_FILE);
    const req = requests.find(r => r.id === id);
    if (!req) return;

    req.status = status === 'received' ? 'received' : 'processed';
    writeJson(REQUESTS_FILE, requests);

    bot.sendMessage(req.userId, `📦 Заявка №${id}\nСтатус: ${statusText(req.status)}`);

    bot.editMessageReplyMarkup(
      {
        inline_keyboard: [
          [{ text: '✉️ Написати користувачу', url: `tg://user?id=${req.userId}` }]
        ]
      },
      { chat_id: msg.chat.id, message_id: msg.message_id }
    );

    bot.answerCallbackQuery(q.id);
  }
});
