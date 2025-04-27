const path = require('path');

module.exports = {
  entry: './src/index.js',
  mode: 'development',
  // Enable WebAssembly support
  experiments: {
    asyncWebAssembly: true,
    // You can also try syncWebAssembly if asyncWebAssembly doesn't work
    // syncWebAssembly: true
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.glsl$/,
        use: 'raw-loader',
      },
      // Specific rule for WebAssembly files in node_modules
      {
        test: /\.wasm$/,
        type: "webassembly/async",
        include: /node_modules\/@dimforge\/rapier3d/
      }
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    // Make sure webpack can find and process .wasm files
    fallback: {
      fs: false,
      path: false
    }
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    compress: true,
    port: 8080,
    hot: true,
  },
  devtool: 'source-map', // Add source maps for better debugging
};