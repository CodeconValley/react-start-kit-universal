import path from 'path';
import webpack from 'webpack';
import CleanPlugin from 'clean-webpack-plugin';
import ExtractTextPlugin from 'extract-text-webpack-plugin';
import OfflinePlugin from 'offline-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import autoprefixer from 'autoprefixer';
import IsomorphicToolsPlugin from 'webpack-isomorphic-tools/plugin';
import { commonChunks } from '../src/config/compiler';
import isomorphicToolsConfig from './webpack-isomorphic-tools';

const projectRootPath = path.resolve(__dirname, '..');
const assetsPath = path.resolve(projectRootPath, './static/dist');

// https://github.com/halt-hammerzeit/webpack-isomorphic-tools
const isomorphicToolsPlugin = new IsomorphicToolsPlugin(isomorphicToolsConfig);

const entry = {
  main: [
    './src/client.js'
  ]
};

const context = path.resolve(__dirname, '..');

const output = {
  path: assetsPath,
  filename: '[name]-[chunkhash].js',
  chunkFilename: '[name]-[chunkhash].js',
  publicPath: '/dist/'
};

const resolve = {
  modules: ['src', 'node_modules'],
};

const moduleConfig = {
  rules: [
    {
      test: /\.js$/,
      exclude: /node_modules/,
      loader: 'babel-loader'
    },
    {
      test: /\.less$/,
      loader: ExtractTextPlugin.extract({
        fallback: 'style-loader',
        use: [
          { loader: 'css-loader', query: { importLoaders: 2, minimize: true } },
          { loader: 'postcss-loader' },
          { loader: 'less-loader' },
        ],
      }),
    },
    {
      test: isomorphicToolsPlugin.regular_expression('images'),
      use: [
        {
          loader: 'url-loader',
          query: {
            limit: 10240,
          }
        },
        {
          loader: 'image-webpack-loader',
          query: {
            bypassOnDebug: true,
          },
        },
      ]
    }
  ]
};

const plugins = [
  new webpack.LoaderOptionsPlugin({
    options: {
      postcss: [autoprefixer],
    },
  }),
  new CleanPlugin([assetsPath], { root: projectRootPath }),

  // css files from the extract-text-plugin loader
  new ExtractTextPlugin({
    filename: '[name]-[chunkhash].css',
    allChunks: true,
  }),

  new webpack.DefinePlugin({
    'process.env': {
      NODE_ENV: '"production"'
    },

    __CLIENT__: true,
    __SERVER__: false,
    __DEVELOPMENT__: false,
    __DEVTOOLS__: false
  }),

  // ignore dev config
  new webpack.IgnorePlugin(/\.\/dev/, /\/config$/),

  // optimizations
  new webpack.optimize.OccurrenceOrderPlugin(),
  new webpack.optimize.UglifyJsPlugin({
    compress: {
      warnings: false,
      drop_debugger: true,
      drop_console: true,
    },
    comments: /^!/,
  }),

  isomorphicToolsPlugin,

  new HtmlWebpackPlugin({
    filename: 'offline.html',
    template: 'webpack/offline/template.html'
  }),

  new OfflinePlugin({
    caches: {
      main: [
        // These assets don't have a chunk hash.
        // SW fetch them on every SW update.
        'offline.html'
      ],
      additional: [
        // All other assets have a chunk hash.
        // SW only fetch them once.
        // They'll have another name on change.
        ':rest:'
      ]
    },
    externals: [
      'manifest.json',
      'robots.txt',
      'favicon.ico',
      'images/touch/logo_192.png'
    ],
    // To remove a warning about additional need to have hash
    // safeToUseOptionalCaches: true,
    // 'additional' section is fetch only once.
    // updateStrategy: 'changed',
    // When using the publicPath we need to disable the "relativePaths"
    // feature of this plugin.
    relativePaths: false,
    rewrites: {
      '/': '/dist/offline.html'
    },
    AppCache: false,
    ServiceWorker: {
      // The name of the service worker script that will get generated.
      // output: config.serviceWorker.fileName,
      // Enable events so that we can register updates.
      events: true,
      // By default the service worker will be ouput and served from the
      // publicPath setting above in the root config of the OfflinePlugin.
      // This means that it would be served from /client/sw.js
      // We do not want this! Service workers have to be served from the
      // root of our application in order for them to work correctly.
      // Therefore we override the publicPath here. The sw.js will still
      // live in at the /build/client/sw.js output location therefore in
      // our server configuration we need to make sure that any requests
      // to /sw.js will serve the /build/client/sw.js file.
      // publicPath: `/${config.serviceWorker.fileName}`,

      // When the user is offline then this html page will be used at
      // the base that loads all our cached client scripts.  This page
      // is generated by the HtmlWebpackPlugin above, which takes care
      // of injecting all of our client scripts into the body.
      // Please see the HtmlWebpackPlugin configuration above for more
      // information on this page.
      navigateFallbackURL: '/dist/offline.html',
    },
  })
];

if (commonChunks) {
  const chunkKeys = Object.keys(commonChunks);
  chunkKeys.forEach((key) => {
    entry[key] = commonChunks[key];
  });

  plugins.push(
    new webpack.optimize.CommonsChunkPlugin({ names: chunkKeys }),
  );
}

const webpackConfig = {
  devtool: 'source-map',
  context,
  entry,
  output,
  module: moduleConfig,
  resolve,
  plugins
};

export default webpackConfig;
