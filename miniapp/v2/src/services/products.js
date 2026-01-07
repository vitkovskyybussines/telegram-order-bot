// miniapp/v2/src/services/products.js

export const categories = [
  { id: 'all', name: 'Вся продукція' },
  { id: 'sausages', name: 'Сосиски та сардельки' },
  { id: 'boiled', name: 'Варені ковбаси' },
  { id: 'delicacies', name: 'Мʼясні делікатеси' }
];

export const products = [
  {
    id: 1,
    name: 'Баварські сардельки',
    weight: '500г',
    category: 'sausages',
    image: 'https://via.placeholder.com/300',
    description: 'Соковиті сардельки',
    composition: 'Свинина'
  },
  {
    id: 2,
    name: 'Сосиски молочні',
    weight: '400г',
    category: 'sausages',
    image: 'https://via.placeholder.com/300',
    description: 'Ніжні молочні сосиски',
    composition: 'Свинина, молоко'
  },
  {
    id: 3,
    name: 'Докторська',
    weight: '700г',
    category: 'boiled',
    image: 'https://via.placeholder.com/300',
    description: 'Класична варена ковбаса',
    composition: 'Свинина'
  },
  {
    id: 4,
    name: 'Бекон',
    weight: '100г',
    category: 'delicacies',
    image: 'https://via.placeholder.com/300',
    description: 'Ароматний бекон',
    composition: 'Свинина'
  }
];
