const fs = require('fs');
const path = require('path');
const http = require('http');
const { exec } = require('child_process');
const axios = require('axios');
const { connectToMongoDB } = require('./mongodb'); // Importe a função connectToMongoDB

const IPFS_API_HOST = '157.173.210.42'; // Novo endereço IPv4 do nó IPFS
const IPFS_API_PORT = 5001; // Porta da API do novo nó IPFS

async function findUserByWalletAddress(walletAddress) {
  const db = await connectToMongoDB(); // Use a função connectToMongoDB para obter a conexão

  try {
    const collection = db.collection('usuarios');
    const user = await collection.findOne({ endereco_carteira: walletAddress });

    if (user) {
      return { success: true, user };
    } else {
      return { success: false, message: 'Usuário não encontrado no banco de dados.' };
    }
  } catch (error) {
    return { success: false, message: 'Erro ao buscar o usuário.' };
  }
}


// Função para buscar um usuário por caracteres no banco de dados
async function findUserByCharacters(characters) {
  const db = await connectToMongoDB(); // Use a função connectToMongoDB para obter a conexão

  try {
    const collection = db.collection('usuarios');
    // Realiza a busca utilizando uma expressão regular para encontrar os caracteres
    const user = await collection.findOne({ nome: { $regex: characters, $options: 'i' } });

    if (user) {
      console.log('Usuário encontrado no banco de dados:', user); // Console com o conteúdo do usuário encontrado
      return { success: true, user };
    } else {
      return { success: false, message: 'Usuário não encontrado no banco de dados.' };
    }
  } catch (error) {
    console.error('Erro ao buscar o usuário:', error); // Adicione detalhes sobre o erro aqui
    return { success: false, message: 'Erro ao buscar o usuário.' };
  }
}
async function saveCIDAndWalletAddressToMongoDB(walletAddress, cid, name) {
  const db = await connectToMongoDB();

  try {
    const userCollection = db.collection('usuarios'); // Acesse a coleção 'usuarios'

    // Verifique se já existe um usuário com o mesmo nome
    const existingUser = await userCollection.findOne({ nome: name });
    if (existingUser) {
      throw new Error('Já existe um usuário com esse nome.');
    }

    // Insere o novo usuário se o nome for único
    await userCollection.insertOne({ endereco_carteira: walletAddress, cid, nome: name });

    console.log('Dados inseridos com sucesso no MongoDB.');
  } catch (error) {
    console.error('Erro ao inserir dados no MongoDB:', error);
    // Lance o erro novamente para que ele possa ser capturado no local apropriado
    throw error;
  }
  // Não feche a conexão com o MongoDB aqui
}







async function getRawDataFromIPFS(cid) {
  try {
    console.log(`Buscando dados do CID ${cid} no IPFS...`);

    // Use o comando curl para buscar os dados do CID
    const command = `curl -X POST "http://157.173.210.42:5001/api/v0/cat?arg=${cid}"`;

    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error('Erro na execução do comando curl:', error);
          reject(error);
        } else {
          // Verifique se a saída não está vazia
          if (stdout) {
            const data = JSON.parse(stdout); // Supondo que a saída seja um objeto JSON

            resolve(data); // Retorna os dados do IPFS
          } else {
            console.error('Erro ao buscar os dados do usuário do IPFS.');
            reject(new Error('Erro ao buscar os dados do usuário do IPFS.'));
          }
        }
      });
    });
  } catch (error) {
    console.error('Erro na execução do comando curl:', error);
    throw error;
  }
}
async function getCIDByWalletAddress(walletAddress) {
  try {
    // Use a função findUserByWalletAddress para buscar o usuário no banco de dados
    const { success, user } = await findUserByWalletAddress(walletAddress);

    if (success) {
      // Obtenha o CID do usuário encontrado
      const { cid } = user;
      console.log('CID do usuário encontrado:', cid);

      // Chame a função getRawDataFromIPFS com o CID
      const userDataFromIPFS = await getRawDataFromIPFS(cid);

      // Extraia as informações necessárias do objeto userDataFromIPFS
      const { name, photo, bio } = userDataFromIPFS;

      // Adiciona o endereço da carteira para cada objeto
      const userDataWithWallet = { name, photo, bio, endereco_carteira: walletAddress, cid: cid };

      return { success: true, userData: userDataWithWallet };
    } else {
      return { success: false, message: 'Usuário não encontrado no banco de dados.' };
    }
  } catch (error) {
    return { success: false, message: 'Erro ao buscar o CID do usuário.' };
  }
}



async function uploadUserDataToIPFS(walletAddress, name, bio, photoBuffer) {
  const boundary = '----my-boundary';
  const headers = {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
  };

  // Crie um objeto JSON com as informações do usuário, incluindo metadados.
  const userObject = {
    name,
    bio,
    photo: photoBuffer.toString('base64'), // Converta a foto em base64 para armazená-la no JSON
    network: 'Sunnycoin', // Adicione a rede social como metadado.
  };

  // Converta o objeto JSON em uma string
  const userJSON = JSON.stringify(userObject);

  // Construa a carga útil com o JSON
  const payload = `--${boundary}\r\n` +
    'Content-Disposition: form-data; name="file"; filename="user.json"\r\n' +
    'Content-Type: application/json\r\n\r\n' +
    `${userJSON}\r\n`;

  const footer = `\r\n--${boundary}--\r\n`;

  const options = {
    method: 'POST',
    host: IPFS_API_HOST,
    port: IPFS_API_PORT,
    path: `/api/v0/add`,
    headers,
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          const response = JSON.parse(data);
          if (response.Hash) {
            console.log(`Dados do usuário adicionados com sucesso. CID: ${response.Hash}`);
            resolve(response.Hash);
          } else {
            reject(new Error('Erro ao adicionar os dados do usuário ao IPFS.'));
          }
        } else {
          reject(new Error(`Erro ao enviar os dados do usuário ao IPFS. Status: ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(payload);
    req.write(footer);
    req.end();
  });
}

async function getFollowFromMongoDB(currentUserWalletAddress) {
  const db = await connectToMongoDB();

  try {
    const userCollection = db.collection('follow');

    // Busca o documento com o currentUserWalletAddress especificado
    const userFollow = await userCollection.findOne({ currentUserWalletAddress });

    if (userFollow) {
      // Se o documento existir, retorna os postDataWalletAddress relacionados
      console.log('Dados de follow encontrados no MongoDB:', userFollow.postDataWalletAddress);
      return userFollow.postDataWalletAddress;
    } else {
      // Se o documento não existir, retorna um array vazio
      console.log('Nenhum dado de follow encontrado para o currentUserWalletAddress:', currentUserWalletAddress);
      return [];
    }
  } catch (error) {
    console.error('Erro ao buscar dados de follow no MongoDB:', error);
    return []; // Retorna um array vazio em caso de erro
  }
  // Não feche a conexão com o MongoDB aqui
}

async function findFollowersWithSameWalletAddress(walletAddress) {
  const db = await connectToMongoDB();

  try {
    const followCollection = db.collection('follow');

    // Busca os documentos que contêm o walletAddress no array postDataWalletAddress
    const followers = await followCollection.find({ postDataWalletAddress: walletAddress }).toArray();

    // Filtra os currentUserWalletAddress dos documentos encontrados
    const currentUserWalletAddresses = followers.reduce((acc, follower) => {
      if (follower.postDataWalletAddress.includes(walletAddress)) {
        acc.push(follower.currentUserWalletAddress);
      }
      return acc;
    }, []);

    // Retorna os currentUserWalletAddress filtrados
    return currentUserWalletAddresses;
  } catch (error) {
    console.error('Erro ao buscar dados de follow no MongoDB:', error);
    return []; // Retorna um array vazio em caso de erro
  }
  // Não feche a conexão com o MongoDB aqui
}
async function saveFollowToMongoDB(currentUserWalletAddress, postDataWalletAddress) {
  const db = await connectToMongoDB();

  try {
    const userCollection = db.collection('follow');

    // Verificar se já existe um documento com o mesmo currentUserWalletAddress
    const existingUser = await userCollection.findOne({ currentUserWalletAddress });

    if (existingUser) {
      // Se já existe, atualizar o documento
      await userCollection.updateOne(
        { currentUserWalletAddress },
        {
          $addToSet: { postDataWalletAddress },
          $set: { timestamp: new Date() }
        }
      );

      console.log('Dados de follow atualizados com sucesso no MongoDB.');
    } else {
      // Se não existe, criar um novo documento
      await userCollection.insertOne({
        currentUserWalletAddress,
        postDataWalletAddress: [postDataWalletAddress], // Armazenar o postDataWalletAddress como um array
        timestamp: new Date()
      });

      console.log('Novo objeto follow inserido com sucesso no MongoDB.');
    }
  } catch (error) {
    console.error('Erro ao atualizar dados de follow no MongoDB:', error);
  }
  // Não feche a conexão com o MongoDB aqui
}
async function followUser(currentUserWalletAddress, postDataWalletAddress) {
  try {
    console.log('currentUserWalletAddress:', currentUserWalletAddress);
    console.log('postDataWalletAddress:', postDataWalletAddress);

    if (currentUserWalletAddress && postDataWalletAddress) {
      // Simulate the existence check by checking if the addresses are the same
      if (currentUserWalletAddress === postDataWalletAddress) {
        console.log('You are already following this user.');
        return { success: false, message: 'You are already following this user.' };
      }

      // Not performing a database search, using the data directly
      await saveFollowToMongoDB(currentUserWalletAddress, postDataWalletAddress);

      return { success: true, message: `You are now following ${postDataWalletAddress}` };
    } else {
      console.log('Invalid user data:', currentUserWalletAddress, postDataWalletAddress);
      return { success: false, message: 'Invalid user data' };
    }
  } catch (error) {
    console.error('Error following the user:', error);
    throw new Error('Error following the user');
  }
}

// Função para verificar o status de follow
async function checkFollowStatus(userWallet, followWallet) {
  const db = await connectToMongoDB();

  try {
    const userCollection = db.collection('follow');

    // Verificar se já existe uma conexão entre userWallet e followWallet
    const existingConnection = await userCollection.findOne({
      currentUserWalletAddress: userWallet,
      postDataWalletAddress: followWallet
    });

    if (existingConnection) {
      return { success: true, message: 'yes' };
    } else {
      return { success: true, message: 'no' };
    }
  } catch (error) {
    console.error('Error checking follow status in MongoDB:', error);
    return { success: false, message: 'Error checking follow status' };
  }
}
// Função para deixar de seguir um usuário
async function unfollowUser(userWallet, followWallet) {
  const db = await connectToMongoDB();

  try {
      const followCollection = db.collection('follow');

      // Verificar se já existe uma conexão entre userWallet e followWallet
      const existingConnection = await followCollection.findOne({
          currentUserWalletAddress: userWallet,
          postDataWalletAddress: followWallet
      });

      if (existingConnection) {
          // Remover a conexão específica entre userWallet e followWallet
          await followCollection.updateOne(
              { currentUserWalletAddress: userWallet },
              { $pull: { postDataWalletAddress: followWallet } }
          );

          return { success: true, message: 'unfollowed successfully' };
      } else {
          return { success: true, message: 'not following this user' };
      }
  } catch (error) {
      console.error('Error unfollowing user in MongoDB:', error);
      return { success: false, message: 'Error unfollowing user' };
  }
}



// Função para encontrar dados de follow no banco de dados
async function findFollowData(currentUserWalletAddress) {
  const db = await connectToMongoDB();

  try {
    const userCollection = db.collection('follow');

    // Verificar se já existe um documento com o mesmo currentUserWalletAddress
    const existingUser = await userCollection.findOne({ currentUserWalletAddress });

    if (existingUser) {
      console.log('Dados de follow encontrados:', existingUser);
      return existingUser.postDataWalletAddress;
    } else {
      console.log('Nenhum dado de follow encontrado para o usuário:', currentUserWalletAddress);
      return null;
    }
  } catch (error) {
    console.error('Erro ao buscar dados de follow no MongoDB:', error);
    throw error;
  }
  // Não feche a conexão com o MongoDB aqui
}



module.exports = {
  findUserByWalletAddress,
  uploadUserDataToIPFS,
  findUserByCharacters,
  findFollowersWithSameWalletAddress,
  followUser,
  unfollowUser,
  getFollowFromMongoDB,
  findFollowData,
  checkFollowStatus,
  saveCIDAndWalletAddressToMongoDB,
  getCIDByWalletAddress,
  getRawDataFromIPFS,
  IPFS_API_HOST,
  IPFS_API_PORT,
};

