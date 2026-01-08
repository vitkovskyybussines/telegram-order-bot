const tg = window.Telegram.WebApp;
tg.expand();

const categories = [
  'Вся продукція',
  'Сосиски та сардельки',
  'Варені ковбаси',
  'Мʼясні делікатеси'
];

const products = [
  {
    id: 1,
    name: 'Баварські сардельки',
    weight: '500г',
    category: 'Сосиски та сардельки',
    image: 'https://via.placeholder.com/300',
    description: 'Соковиті сардельки',
    composition: 'Свинина'
  },
  {
    id: 2,
    name: 'Сосиски молочні',
    weight: '400г',
    category: 'Сосиски та сардельки',
    image: 'https://via.placeholder.com/300',
    description: 'Ніжні молочні сосиски',
    composition: 'Свинина, молоко'
  },
  {
    id: 3,
    name: 'Докторська',
    weight: '700г',
    category: 'Варені ковбаси',
    image: 'https://via.placeholder.com/300',
    description: 'Класична варена ковбаса',
    composition: 'Свинина'
  },
  {
    id: 4,
    name: 'Бекон',
    weight: '100г',
    category: 'Мʼясні делікатеси',
    image: 'https://via.placeholder.com/300',
    description: 'Ароматний бекон',
    composition: 'Свинина'
  }
];

let cart = {};
let screen = 'catalog';
let activeCategory = 'Вся продукція';
let currentProduct = null;
let comment = '';

const categoriesEl = document.getElementById('categories');
const contentEl = document.getElementById('content');
const titleEl = document.getElementById('title');

function render() {
  categoriesEl.style.display = screen === 'catalog' ? 'flex' : 'none';
  contentEl.className = 'fade';

  if (screen === 'catalog') renderCatalog();
  if (screen === 'product') renderProduct();
  if (screen === 'cart') renderCart();
}

/* ======================
   CATALOG
====================== */

function renderCatalog() {
  titleEl.textContent = 'Зробити замовлення';
  categoriesEl.innerHTML = '';
  contentEl.innerHTML = '';

  categories.forEach(c => {
    const el = document.createElement('div');
    el.className = 'category' + (c === activeCategory ? ' active' : '');
    el.textContent = c;
    el.onclick = () => {
      activeCategory = c;
      render();
    };
    categoriesEl.appendChild(el);
  });

  const list = activeCategory === 'Вся продукція'
    ? products
    : products.filter(p => p.category === activeCategory);

  list.forEach(p => {
    const qty = cart[p.id] || 0;

    const row = document.createElement('div');
    row.className = 'product';

    row.innerHTML = `
      <div class="product-row">
        <img src="${p.image}" class="thumb">
        <div class="product-info">
          <strong>${p.name}</strong><br>
          <small>${p.weight}</small>
        </div>
        <div class="controls">
          <button>-</button>
          <input type="number" value="${qty}">
          <button>+</button>
        </div>
      </div>
    `;

    row.querySelector('.thumb').onclick =
    row.querySelector('.product-info').onclick = () => {
      currentProduct = p;
      screen = 'product';
      render();
    };

    const [minus, input, plus] = row.querySelectorAll('.controls button, .controls input');
    minus.onclick = () => updateQty(p.id, qty - 1);
    plus.onclick = () => updateQty(p.id, qty + 1);
    input.onchange = e => updateQty(p.id, Number(e.target.value));

    contentEl.appendChild(row);
  });

  if (Object.keys(cart).length > 0) {
    const info = document.createElement('div');
    info.style.padding = '12px';
    info.textContent = `Позицій у кошику: ${Object.keys(cart).length}`;
    contentEl.appendChild(info);

    const btn = document.createElement('div');
    btn.className = 'button';
    btn.textContent = 'Перейти до кошика';
    btn.onclick = () => {
      screen = 'cart';
      render();
    };
    contentEl.appendChild(btn);
  }
}

/* ======================
   PRODUCT
====================== */

function renderProduct() {
  const p = currentProduct;
  let qty = cart[p.id] || 0;
  const alreadyAdded = qty > 0;

  titleEl.textContent = p.name;
  contentEl.innerHTML = `
    <div class="product">
      <img src="${p.image}" style="width:100%;border-radius:12px">
      <h3>${p.name}</h3>
      <p>${p.description}</p>
      <p><strong>Склад:</strong> ${p.composition}</p>

      <div style="display:flex; gap:10px; align-items:center;">
        <div class="controls">
          <button id="minus">-</button>
          <input id="qty" type="number" value="${qty}">
          <button id="plus">+</button>
        </div>

        <div
          class="button"
          id="add"
          style="flex:1; height:44px; display:flex; align-items:center; justify-content:center;"
        >
          ${alreadyAdded ? '✓ Додано' : 'Додати в кошик'}
        </div>
      </div>

      <div class="button back" id="back">Повернутись до каталогу</div>
    </div>
  `;

  const qtyInput = document.getElementById('qty');
  const addBtn = document.getElementById('add');

  document.getElementById('minus').onclick = () => {
    qty = Math.max(0, qty - 1);
    qtyInput.value = qty;
  };

  document.getElementById('plus').onclick = () => {
    qty++;
    qtyInput.value = qty;
  };

  addBtn.onclick = () => {
    if (qty > 0) {
      cart[p.id] = qty;
      addBtn.textContent = '✓ Додано';
    }
  };

  document.getElementById('back').onclick = () => {
    screen = 'catalog';
    render();
  };
}

/* ======================
   CART
====================== */

function renderCart() {
  titleEl.textContent = 'Кошик';
  contentEl.innerHTML = '';

  Object.keys(cart).forEach(id => {
    const p = products.find(x => x.id == id);
    const qty = cart[id];

    const row = document.createElement('div');
    row.className = 'cart-item';

    row.innerHTML = `
      <strong>${p.name}</strong><br>
      <small>${p.weight}</small>

      <div class="cart-row">
        <div class="controls">
          <button>-</button>
          <input type="number" value="${qty}">
          <button>+</button>
        </div>
        <button class="remove-btn">Видалити позицію</button>
      </div>
    `;

    const [minus, input, plus] = row.querySelectorAll('.controls button, .controls input');
    minus.onclick = () => updateQty(p.id, qty - 1);
    plus.onclick = () => updateQty(p.id, qty + 1);
    input.onchange = e => updateQty(p.id, Number(e.target.value));
    row.querySelector('.remove-btn').onclick = () => {
      delete cart[id];
      render();
    };

    contentEl.appendChild(row);
  });

  const textarea = document.createElement('textarea');
  textarea.placeholder = 'Коментар до замовлення (необовʼязково)';
  textarea.value = comment;
  textarea.onchange = e => comment = e.target.value;
  contentEl.appendChild(textarea);

  const submit = document.createElement('div');
  submit.className = 'button';
  submit.textContent = 'Оформити замовлення';
  submit.onclick = submitOrder;
  contentEl.appendChild(submit);

  const back = document.createElement('div');
  back.className = 'button back';
  back.textContent = 'Повернутись до каталогу';
  back.onclick = () => {
    screen = 'catalog';
    render();
  };
  contentEl.appendChild(back);
}

/* ======================
   HELPERS
====================== */

function updateQty(id, qty) {
  if (qty <= 0) delete cart[id];
  else cart[id] = qty;
  render();
}

function submitOrder() {
  if (!confirm('Підтвердити замовлення?')) return;

  const items = Object.keys(cart).map(id => {
    const p = products.find(x => x.id == id);
    return {
      name: p.name,
      weight: p.weight,
      qty: cart[id]
    };
  });

  tg.sendData(JSON.stringify({ items, comment }));
  cart = {};
  tg.close();
}

render();
