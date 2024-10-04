const { MongoClient } = require('mongodb');

const USERNAME = 'fralishub'; // Nome do usuário
const PASSWORD = '8907Axv??'; // Senha do usuário
const MONGODB_URI = `mongodb://${USERNAME}:${encodeURIComponent(PASSWORD)}@157.173.210.42:23012/?authSource=sunny`; // URI com autenticação
const DATABASE_NAME = 'sunny'; // Nome do banco de dados

async function connectToMongoDB() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Conexão com o MongoDB estabelecida com sucesso.');
    return client.db(DATABASE_NAME);
  } catch (error) {
    console.error('Erro ao conectar ao MongoDB:', error);
    throw error;
  }
}

module.exports = {
  connectToMongoDB,
};
