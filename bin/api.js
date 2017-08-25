#!/usr/bin/env babel-node
/* eslint import/first: 0 */
import '../dotenv';
import piping from 'piping';

if (process.env.NODE_ENV !== 'production') {
  piping({
    hook: true,
    ignore: /(\/\.|~$|\.json|\.scss$)/i
  });
}

if (process.env.ENABLE_PROXY === 'true') {
  require('../api/api');
} else {
  console.log('API proxy was disabled.');
}
