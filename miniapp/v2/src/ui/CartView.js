// miniapp/v2/src/ui/CartView.js

import { state, setState } from '../core/state.js';
import { renderScreen } from '../core/router.js';
import { products } from '../services/products.js';

export function renderCart() {
  const content = document.getElementById('content');
  content.innerHTML = '';

  const items = Object.keys(state.cart);

  if (!items.length) {
    content.innerHTML = '<p style="padding:16px">Кошик порожній</p>';
    renderBackButton(content);
    return;
  }

  items.forEach(id => {
    const product = products.find(p => p.id == id);
    const qty = state.cart[id];

    const row = document.createElement('div');
    row.className = 'cart-item';

    row.innerHTML = `
      <div class="cart-row">
        <div class="cart-info">
          <strong>${product.name}</strong><br />
          <small>${product.weight}</small>
        </div>

        <div class="controls">
          <button>-</button>
          <input type="number" value="${qty}" />
          <button>+</button>
        </div>
      </div>

      <button class="remove-btn">Видалити позицію</button>
    `;

    const buttons = row.querySelectorAll('.controls button');
    const input = row.querySelector('.controls input');

    buttons[0].onclick = () => updateQty(id, qty - 1);
    buttons[1].onclick = () => updateQty(id, qty + 1);
    input.onchange = e => updateQty(id, Number(e.target.value));

    row.querySelector('.remove-btn').onclick = () => {
      delete state.cart[id];
      renderScreen();
    };

    content.appendChild(row);
  });

  const textarea = document.createElement('textarea');
  textarea.placeholder = 'Коментар до замовлення (необовʼязково)';
  textarea.value = state.comment;
  textarea.onchange = e => state.comment = e.target.value;
  content.appendChild(textarea);

  const submit = document.createElement('div');
  submit.className = 'button';
  submit.textContent = 'Оформити замовлення';

  // 🔽 ЄДИНА НОВА ЛОГІКА
  submit.onclick = () => {
    const tg = window.Telegram.WebApp;

    const items = Object.keys(state.cart).map(id => {
      const product = products.find(p => p.id == id);
      return {
        id: product.id,
        name: product.name,
        weight: product.weight,
        qty: state.cart[id]
      };
    });

    const payload = {
      items,
      comment: state.comment,
      timestamp: Date.now(),
      initData: tg.initData
    };

    tg.sendData(JSON.stringify(payload));
    tg.close();
  };

  content.appendChild(submit);

  renderBackButton(content);
}

/* ========================= */

function updateQty(id, qty) {
  if (qty <= 0) delete state.cart[id];
  else state.cart[id] = qty;
  renderScreen();
}

function renderBackButton(root) {
  const back = document.createElement('div');
  back.className = 'button back';
  back.textContent = 'Повернутись до каталогу';
  back.onclick = () => {
    setState({ screen: 'catalog', scrollY: 0 });
    renderScreen();
  };
  root.appendChild(back);
}
