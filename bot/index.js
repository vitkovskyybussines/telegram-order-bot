const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const crypto = require('crypto');

const TOKEN = process.env.BOT_TOKEN;
const MANAGER_ID = Number(process.env.MANAGER_ID);
const MINI_APP_URL = process.env.MINI_APP_URL;

const bot = new TelegramBot(TOKEN, { polling: true });

const STORES_FILE = './stores.json';
const REQUESTS_FILE = './requests.json';

let awaitingAuth = {};
let awaitingRequest = {};

/* =========================
   Utils
========================= */

function readJson(path) {
  if (!fs.existsSync(path)) return [];
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function writeJson(path, data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

function getStore(userId) {
  return readJson(STORES_FILE).find(s => s.userId === userId);
}

function nextId(list) {
  return list.length ? Math.max(...list.map(i => i.id)) + 1 : 1;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

/* =========================
   Keyboards
========================= */

function startKeyboard(isAuthorized) {
  const rows = [];

  if (isAuthorized) {
    rows.push([
      {
        text: '🟦 Зробити замовлення',
        web_app: { url: MINI_APP_URL }
      }
    ]);
    rows.push(['➕ Створити заявку', '📄 Мої заявки']);
  } else {
    rows.push(['🔐 Авторизуватись']);
  }

  rows.push(['📞 Звʼязок з менеджером']);

  return {
    reply_markup: {
      keyboard: rows,
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
    bot.sendMessage(userId, '👨‍💼 Панель менеджера', managerKeyboard);
    return;
  }

  const store = getStore(userId);
  bot.sendMessage(
    userId,
    store ? `✅ Ви авторизовані\n🏪 ${store.storeName}` : '👋 Вітаємо!',
    startKeyboard(!!store)
  );
});

/* =========================
   Messages
========================= */

bot.on('message', msg => {
  const userId = msg.from.id;
  const text = msg.text;
  if (!text || text.startsWith('/')) return;

  const store = getStore(userId);

  /* ===== Заявка (ПРІОРИТЕТ) ===== */
  if (awaitingRequest[userId] && store) {
    createRequest(userId, store.storeName, text);
    delete awaitingRequest[userId];
    return;
  }

  /* ===== Авторизація ===== */
  if (awaitingAuth[userId]) {
    const storeName = text.trim();
    awaitingAuth[userId] = storeName;

    bot.sendMessage(
      MANAGER_ID,
      `🔐 Запит авторизації\n🏪 Магазин: ${storeName}\n👤 User ID: ${userId}`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Прийняти', callback_data: `auth_accept_${userId}` },
              { text: '❌ Відхилити', callback_data: `auth_reject_${userId}` }
            ],
            [
              {
                text: '✉️ Написати користувачу',
                url: `tg://user?id=${userId}`
              }
            ]
          ]
        }
      }
    );

    bot.sendMessage(userId, '⏳ Запит на авторизацію надіслано менеджеру');
    return;
  }

  /* ===== Кнопки ===== */
  if (text === '🔐 Авторизуватись') {
    if (store) {
      bot.sendMessage(userId, '✅ Ви вже авторизовані', startKeyboard(true));
    } else {
      awaitingAuth[userId] = true;
      bot.sendMessage(userId, '🏪 Введіть назву магазину');
    }
    return;
  }

  if (text === '➕ Створити заявку') {
    if (!store) return;
    awaitingRequest[userId] = true;
    bot.sendMessage(userId, '✍️ Введіть текст заявки');
    return;
  }

  if (text === '📄 Мої заявки') {
    showMyRequests(userId);
    return;
  }

  if (text === '📞 Звʼязок з менеджером') {
    bot.sendMessage(
      userId,
      '📞 Менеджер:',
      { reply_markup: { inline_keyboard: [[{ text: 'Написати', url: `tg://user?id=${MANAGER_ID}` }]] } }
    );
  }

  /* ===== Менеджер ===== */
  if (userId === MANAGER_ID) {
    handleManagerCommands(text);
  }
});

/* =========================
   Mini App
========================= */

bot.on('web_app_data', msg => {
  const userId = msg.from.id;
  const store = getStore(userId);
  if (!store) return;

  const payload = JSON.parse(msg.web_app_data.data);

  let text = '🛒 Замовлення з каталогу:\n\n';
  payload.items.forEach(i => {
    text += `• ${i.name} × ${i.qty}\n`;
  });

  createRequest(userId, store.storeName, text);
});

/* =========================
   Requests
========================= */

function createRequest(userId, storeName, text) {
  const requests = readJson(REQUESTS_FILE);
  const id = nextId(requests);

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

  bot.sendMessage(userId, `✅ Заявка №${id} створена`);
  bot.sendMessage(
    MANAGER_ID,
    `🆕 Заявка №${id}\n🏪 ${storeName}\n\n${text}`,
    {
      reply_markup: {
        inline_keyboard: [[{ text: '📥 В роботу', callback_data: `status_received_${id}` }]]
      }
    }
  );
}

/* =========================
   Views
========================= */

function showMyRequests(userId) {
  const list = readJson(REQUESTS_FILE).filter(r => r.userId === userId);
  if (!list.length) {
    bot.sendMessage(userId, '📭 Заявок немає');
    return;
  }

  list.forEach(r =>
    bot.sendMessage(userId, `№${r.id}\n${r.text}\nСтатус: ${r.status}`)
  );
}

function handleManagerCommands(text) {
  const list = readJson(REQUESTS_FILE);
  let filtered = [];

  if (text.includes('Всі')) filtered = list.filter(r => r.createdAt === today());
  if (text.includes('Очікують')) filtered = list.filter(r => r.status === 'pending');
  if (text.includes('В роботі')) filtered = list.filter(r => r.status === 'received');
  if (text.includes('Виконані')) filtered = list.filter(r => r.status === 'processed');

  if (!filtered.length) {
    bot.sendMessage(MANAGER_ID, 'Немає заявок');
    return;
  }

  filtered.forEach(r =>
    bot.sendMessage(MANAGER_ID, `№${r.id}\n🏪 ${r.storeName}\n${r.text}`)
  );
}

/* =========================
   Callbacks
========================= */

bot.on('callback_query', q => {
  const data = q.data;
  const userId = Number(data.split('_').pop());

  if (data.startsWith('auth_accept')) {
    const stores = readJson(STORES_FILE);
    stores.push({
      userId,
      storeName: awaitingAuth[userId],
      approved: true
    });
    writeJson(STORES_FILE, stores);
    delete awaitingAuth[userId];

    bot.sendMessage(userId, '✅ Авторизацію підтверджено', startKeyboard(true));
  }

  if (data.startsWith('auth_reject')) {
    delete awaitingAuth[userId];
    bot.sendMessage(userId, '❌ Авторизацію відхилено');
  }

  if (data.startsWith('status_received')) {
    const id = Number(data.split('_')[2]);
    const list = readJson(REQUESTS_FILE);
    const req = list.find(r => r.id === id);
    if (!req) return;

    req.status = 'received';
    writeJson(REQUESTS_FILE, list);

    bot.sendMessage(req.userId, `📦 Заявка №${id} в роботі`);
  }

  bot.answerCallbackQuery(q.id);
});
