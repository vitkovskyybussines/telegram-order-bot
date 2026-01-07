import { state, setState } from '../core/state.js';
import { renderScreen } from '../core/router.js';

export function renderCart() {
  const content = document.getElementById('content');

  Object.entries(state.cart).forEach(([id, qty]) => {
    const row = document.createElement('div');
    row.textContent = `Товар ${id} × ${qty}`;
    content.appendChild(row);
  });

  const back = document.createElement('button');
  back.textContent = 'Назад';
  back.onclick = () => {
    setState({ screen: 'catalog' });
    renderScreen();
  };

  content.appendChild(back);
}
