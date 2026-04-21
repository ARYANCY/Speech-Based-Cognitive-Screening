require('dotenv').config({ path: '../.env' }); // Assuming .env is at root level
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const sessionRoutes = require('./routes/sessionRoutes');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Connect Database
connectDB();

// Routes
app.use('/session', sessionRoutes);

app.get('/', (req, res) => {
  res.send('Dementia Multimodal API is running...');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
