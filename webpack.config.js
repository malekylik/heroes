const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { CheckerPlugin } = require('awesome-typescript-loader');

const options = require('./config.json');

const config = {
  entry: {
    main: './src/index.ts',
  },
  output: {
    filename: '[name].[hash].js',
    chunkFilename: '[name].[hash].js',
    path: path.resolve(__dirname, 'dist')
  },
  devServer: {
    contentBase: './dist',
    historyApiFallback: {
      rewrites: [
        { from: '/', to: '/heroes.html' },
      ]
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
      inject: false,
      hash: true,
      template: './src/index.html',
      filename: 'heroes.html',
    }),
    new CleanWebpackPlugin(['dist'], {
      verbose: false,
      exclude: ['src'],
    }),
    new CheckerPlugin(),

  ],
  module: {
    rules: [
      {
        test: /\.cpp.ts?$/,
        use: [
          'awesome-typescript-loader',
          {
            loader: 'preprocessor-js-loader',
            options: { path: options.CCompiler.path , option: options.CCompiler.preprocessorFlag }
          },
        ],
      },
      {
        test: /\.ts?$/,
        use: 'awesome-typescript-loader',
      },
    ]
  },
  optimization: {
    splitChunks: {
        cacheGroups: {
          vendor: {
                test: /node_modules/,
                name: 'vendor',
                chunks: 'initial',
                enforce: true
            }
        }
    },
    minimizer: [new TerserPlugin()],
  },
  resolve: {
    alias: {
      memory: path.resolve(__dirname, 'src/memory'),
      utils: path.resolve(__dirname, 'src/utils'),
      render: path.resolve(__dirname, 'src/render'),
    },
    extensions: ['.js', '.ts']
  },
  resolveLoader: {
    modules: ['node_modules', path.resolve(__dirname, 'src', 'loaders')],
    extensions: ['.js', '.json'],
    mainFields: ['loader', 'main']
  }
};

module.exports = (env, argv) => {

  if (argv.mode === 'production') {
    config.mode = 'production';
    config.devtool = 'none';
    config.optimization.minimizer = [new TerserPlugin()];
  } else {
    config.mode = 'development';
    config.devtool = 'eval-source-map';
  }

  return config;
};
