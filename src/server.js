const path = require('path');

// Use Node's built-in .env loader so the app can start even when
// the optional `dotenv` package is not installed locally.
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(path.resolve(process.cwd(), '.env'));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

const app = require('./app');
const connectDB = require('./config/database');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    process.exit(1);
  }
};

startServer();
