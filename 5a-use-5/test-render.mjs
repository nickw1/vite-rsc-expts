import React from 'react';
import { renderToString } from 'react-dom/server';

console.log('React version:', React.version);

const html = renderToString(
  React.createElement('div', null, 'hello')
);

console.log(html);
