// miniapp/v2/src/ui/CatalogView.js

import { state, setState } from '../core/state.js';
import { renderScreen } from '../core/router.js';
import { products, categories } from '../services/products.js';

export function renderCatalog() {
  const content = document.getElementById('content');

  renderCategories(content);
  renderProducts(content);
  renderCartButton(content);
}

/* =========================
   Categories
========================= */

function renderCategories(root) {
  const wrap = document.createElement('div');
  wrap.className = 'categories';

  categories.forEach(c => {
    const el = document.createElement('div');
    el.className = 'category' + (state.activeCategory === c.id ? ' active' : '');
    el.textContent = c.name;

    el.onclick = () => {
      setState({ activeCategory: c.id });
      renderScreen();
    };

    wrap.appendChild(el);
  });

  root.appendChild(wrap);
}

/* =========================
   Products
========================= */

function renderProducts(root) {
  const list = state.activeCategory === 'all'
    ? products
    : products.filter(p => p.category === state.activeCategory);

  list.forEach(p => {
    const qty = state.cart[p.id] || 0;

    const row = document.createElement('div');
    row.className = 'product';

    row.innerHTML = `
      <div class="product-row">
        <img src="${p.image}" class="thumb" />
        <div class="product-info">
          <strong>${p.name}</strong><br />
          <small>${p.weight}</small>
        </div>
        <div class="controls">
          <button>-</button>
          <input type="number" value="${qty}" />
          <button>+</button>
        </div>
      </div>
    `;

    row.querySelector('.thumb').onclick =
    row.querySelector('.product-info').onclick = () => {
      setState({ screen: 'product', currentProduct: p });
      renderScreen();
    };

    const [minus, input, plus] =
      row.querySelectorAll('.controls button, .controls input');

    minus.onclick = () => updateQty(p.id, qty - 1);
    plus.onclick = () => updateQty(p.id, qty + 1);
    input.onchange = e => updateQty(p.id, Number(e.target.value));

    root.appendChild(row);
  });
}

/* =========================
   Cart Button
========================= */

function renderCartButton(root) {
  const count = Object.keys(state.cart).length;
  if (!count) return;

  const btn = document.createElement('div');
  btn.className = 'button';
  btn.textContent = `Перейти до замовлення — ${count} позицій`;
  btn.onclick = () => {
    setState({ screen: 'cart' });
    renderScreen();
  };

  root.appendChild(btn);
}

/* =========================
   Helpers
========================= */

function updateQty(id, qty) {
  if (qty <= 0) delete state.cart[id];
  else state.cart[id] = qty;
  renderScreen();
}
