// app.js

import express from 'express';
import cors from 'cors'
import route from './routes/route.js';

const app = express();
const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json({ extended: false }));

app.use('/api', route);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
