import 'dotenv/config';
import app, {connectDB} from './app.js';

await connectDB();

const PORT = process.env.PORT || 4000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ API escuchando en http://localhost:${PORT}`);
});
