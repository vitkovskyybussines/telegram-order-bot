import { state, setState } from '../core/state.js';
import { renderScreen } from '../core/router.js';

const products = [
  { id: 1, name: 'Баварські сардельки' },
  { id: 2, name: 'Сосиски молочні' }
];

export function renderCatalog() {
  const content = document.getElementById('content');

  products.forEach(p => {
    const qty = state.cart[p.id] || 0;

    const row = document.createElement('div');
    row.innerHTML = `
      <strong>${p.name}</strong>
      <button>-</button>
      <span>${qty}</span>
      <button>+</button>
      <button>Деталі</button>
    `;

    const buttons = row.querySelectorAll('button');

    buttons[0].onclick = () => updateQty(p.id, qty - 1);
    buttons[1].onclick = () => updateQty(p.id, qty + 1);
    buttons[2].onclick = () => {
      setState({ screen: 'product', currentProduct: p });
      renderScreen();
    };

    content.appendChild(row);
  });

  if (Object.keys(state.cart).length) {
    const btn = document.createElement('button');
    btn.textContent = 'Перейти до кошика';
    btn.onclick = () => {
      setState({ screen: 'cart' });
      renderScreen();
    };
    content.appendChild(btn);
  }
}

function updateQty(id, qty) {
  if (qty <= 0) delete state.cart[id];
  else state.cart[id] = qty;
  renderScreen();
}
