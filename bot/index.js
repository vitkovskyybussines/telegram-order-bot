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

/* =========================
   Utils
========================= */

function readJson(path) {
  try {
    if (!fs.existsSync(path)) return [];
    return JSON.parse(fs.readFileSync(path, 'utf8'));
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
  if (status === 'pending') return 'Очікує підтвердження';
  if (status === 'received') return 'Прийнято в роботу';
  if (status === 'processed') return 'Виконано';
  return status;
}

/* =========================
   Keyboards
========================= */

const startKeyboard = {
  reply_markup: {
    keyboard: [
      ['🔐 Запросити доступ'],
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
    bot.sendMessage(userId, '⏳ Ваш запит очікує підтвердження', {
      reply_markup: { keyboard: [['📞 Звʼязок з менеджером']], resize_keyboard: true }
    });
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

  if (text === '🔐 Запросити доступ') {
    if (store) {
      bot.sendMessage(userId, store.approved
        ? '✅ Ви вже авторизовані'
        : '⏳ Ваш запит вже очікує підтвердження');
      return;
    }

    awaitingStoreName[userId] = true;
    bot.sendMessage(userId, '🏪 Вкажіть назву магазину або точки');
    return;
  }

  if (awaitingStoreName[userId]) {
    delete awaitingStoreName[userId];

    const stores = readJson(STORES_FILE);
    stores.push({
      userId,
      storeName: text,
      approved: false,
      createdAt: today()
    });
    writeJson(STORES_FILE, stores);

    const username = msg.from.username
      ? `@${msg.from.username}`
      : 'немає';

    bot.sendMessage(
      MANAGER_ID,
      `🔐 Запит доступу\n\n🏪 Магазин: ${text}\n👤 ${username}\n🆔 ${userId}\n🔗 https://t.me/${msg.from.username || 'user?id=' + userId}`,
      {
        reply_markup: {
          inline_keyboard: [[
            { text: '✅ Прийняти', callback_data: `auth_accept_${userId}` },
            { text: '❌ Відхилити', callback_data: `auth_reject_${userId}` }
          ]]
        }
      }
    );

    bot.sendMessage(userId, '⏳ Запит надіслано менеджеру');
    return;
  }

  if (!store || !store.approved) {
    bot.sendMessage(userId, '⛔ Доступ відсутній');
    return;
  }

  if (text === '➕ Створити заявку') {
    bot.sendMessage(userId, 'Введіть текст заявки');
    awaitingStoreName[userId] = 'request';
    return;
  }

  if (awaitingStoreName[userId] === 'request') {
    delete awaitingStoreName[userId];
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
  const id = requests.length ? Math.max(...requests.map(r => r.id)) + 1 : 1;

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

  bot.sendMessage(userId, `🆕 Заявка №${id}\nСтатус: Очікує підтвердження`);

  bot.sendMessage(
    MANAGER_ID,
    `🆕 Заявка №${id}\n🏪 ${storeName}\n\n${text}\nСтатус: Очікує підтвердження`,
    {
      reply_markup: {
        inline_keyboard: [[
          { text: '📥 Отримана', callback_data: `status_received_${id}` }
        ]]
      }
    }
  );
}

/* =========================
   Views
========================= */

function showMyRequests(userId) {
  const requests = readJson(REQUESTS_FILE).filter(r => r.userId === userId);
  if (!requests.length) return bot.sendMessage(userId, 'Заявок немає');

  requests.forEach(r =>
    bot.sendMessage(userId, `№${r.id}\nСтатус: ${statusText(r.status)}\n${r.text}`)
  );
}

function showManagerRequests(filterFn) {
  const requests = readJson(REQUESTS_FILE).filter(filterFn);
  if (!requests.length) return bot.sendMessage(MANAGER_ID, 'Заявок немає');

  requests.forEach(r =>
    bot.sendMessage(
      MANAGER_ID,
      `№${r.id}\n🏪 ${r.storeName}\nСтатус: ${statusText(r.status)}\n${r.text}`
    )
  );
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

    if (action === 'accept') {
      store.approved = true;
      writeJson(STORES_FILE, stores);
      bot.sendMessage(userId, `✅ Доступ надано\n🏪 ${store.storeName}`, storeKeyboard);
    } else {
      bot.sendMessage(userId, '❌ Доступ відхилено');
    }

    bot.editMessageReplyMarkup({}, { chat_id: msg.chat.id, message_id: msg.message_id });
    bot.answerCallbackQuery(q.id);
  }

  if (data.startsWith('status_')) {
    const [, newStatus, idStr] = data.split('_');
    const id = Number(idStr);

    const requests = readJson(REQUESTS_FILE);
    const req = requests.find(r => r.id === id);
    if (!req) return;

    if (newStatus === 'received') {
      req.status = 'received';
      writeJson(REQUESTS_FILE, requests);

      bot.sendMessage(req.userId, `📦 Заявка №${id}\nСтатус: Прийнято в роботу`);

      bot.editMessageReplyMarkup(
        { inline_keyboard: [[{ text: '⚙️ Виконано', callback_data: `status_processed_${id}` }]] },
        { chat_id: msg.chat.id, message_id: msg.message_id }
      );
    }

    if (newStatus === 'processed') {
      req.status = 'processed';
      writeJson(REQUESTS_FILE, requests);

      bot.sendMessage(req.userId, `✅ Заявка №${id} виконана`);
      bot.editMessageReplyMarkup({}, { chat_id: msg.chat.id, message_id: msg.message_id });
    }

    bot.answerCallbackQuery(q.id);
  }
});
