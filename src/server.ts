import 'dotenv/config'; 
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';


const app = express();


app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));

app.get('/', (req, res) => {
  res.send('API está funcionando!'); // Resposta para a rota raiz
});


const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`App ouvindo na porta ${PORT}`);
});


process.on('SIGINT', () => {
  server.close(() => {
    console.log('App finalizado');
    process.exit(0);
  });
});
