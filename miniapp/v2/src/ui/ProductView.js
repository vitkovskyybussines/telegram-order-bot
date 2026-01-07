import { state, setState } from '../core/state.js';
import { renderScreen } from '../core/router.js';

export function renderProduct() {
  const p = state.currentProduct;
  const content = document.getElementById('content');

  content.innerHTML = `
    <h2>${p.name}</h2>
    <button id="back">Назад</button>
  `;

  document.getElementById('back').onclick = () => {
    setState({ screen: 'catalog', currentProduct: null });
    renderScreen();
  };
}
