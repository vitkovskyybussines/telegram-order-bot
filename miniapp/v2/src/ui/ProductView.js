// miniapp/v2/src/ui/ProductView.js

import { state } from '../core/state.js';
import { setState } from '../core/state.js';
import { renderScreen } from '../core/router.js';

export function renderProduct() {
  const p = state.currentProduct;
  if (!p) return;

  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="product">
      <img src="${p.image}" style="width:100%;border-radius:12px" />

      <h3>${p.name}</h3>
      <p>${p.description}</p>
      <p><strong>Склад:</strong> ${p.composition}</p>

      <div class="controls">
        <button id="minus">-</button>
        <input id="qty" type="number" value="${state.cart[p.id] || 0}" />
        <button id="plus">+</button>
      </div>

      <div class="button" id="add">Додати в кошик</div>
      <div class="button back" id="back">Повернутись до каталогу</div>
    </div>
  `;

  let qty = state.cart[p.id] || 0;

  document.getElementById('minus').onclick = () => {
    qty = Math.max(0, qty - 1);
    document.getElementById('qty').value = qty;
  };

  document.getElementById('plus').onclick = () => {
    qty++;
    document.getElementById('qty').value = qty;
  };

  document.getElementById('add').onclick = () => {
    if (qty > 0) state.cart[p.id] = qty;
    else delete state.cart[p.id];

    setState({ screen: 'catalog', currentProduct: null });
    renderScreen();
  };

  document.getElementById('back').onclick = () => {
    setState({ screen: 'catalog', currentProduct: null });
    renderScreen();
  };
}
