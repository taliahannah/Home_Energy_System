// server.mjs
import express from 'express';
import cors from 'cors';
import path from 'path'; 
import { fileURLToPath } from 'url';

const app = express();
const port = 5500;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors({
  origin: '*',
}));

app.use(express.static('.'));

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, '127.0.0.1', () => {
  console.log('Listening on 127.0.0.1:5500');
});
 
app.get('/', (req, res) => {
  console.log('Root route accessed');
  res.send('Root route response');
});