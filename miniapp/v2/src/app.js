import { renderScreen } from './core/router.js';
import { initTelegram } from './services/telegram.js';

initTelegram();
renderScreen();
