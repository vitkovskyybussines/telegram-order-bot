import { state, setState } from '../core/state.js';
import { renderScreen } from '../core/router.js';

export function renderCart() {
  const content = document.getElementById('content');
  content.innerHTML = '';

  Object.entries(state.cart).forEach(([id, qty]) => {
    const row = document.createElement('div');
    row.textContent = `Товар ${id} × ${qty}`;
    content.appendChild(row);
  });

  const submit = document.createElement('button');
  submit.textContent = 'Оформити замовлення';
  submit.onclick = () => {
    const items = Object.entries(state.cart).map(([id, qty]) => ({
      id,
      qty
    }));

    Telegram.WebApp.sendData(
      JSON.stringify({
        type: 'order',
        items
      })
    );
  };

  const back = document.createElement('button');
  back.textContent = 'Назад';
  back.onclick = () => {
    setState({ screen: 'catalog' });
    renderScreen();
  };

  content.appendChild(submit);
  content.appendChild(back);
}
