const axios = require('axios');
const { connectToMongoDB } = require('./mongodb');
const { IPFS_API_HOST, IPFS_API_PORT } = require('./users');
const FormData = require('form-data');
const http = require('http');
const { Readable } = require('stream');
const util = require('util');
const { exec } = require('child_process');
const { Blob } = require('buffer');
const path = require('path');



const fs = require('fs');
const maxBufferInBytes = 1024 * 1024 * 1024 * 2; // 2 GB
// Array para armazenar os CIDs já selecionados
let selectedCIDs = [];
let functionCallCount = 0; // Contagem de chamadas da função
let lastProcessedIndex = 0; // Índice do último post processado
// Array para armazenar os CIDs coletados
let collectedCIDs = [];
const userProgressIndex = {};

let collectedCIDsPerUser = {};
let selectedUserCIDs = {};
// Objetos para armazenar os temporizadores de expiração e os CIDs já retornados
const userLastCidsExpirationTimers = {};
const userLastCids = {};

async function saveCIDToMongoDB(userWallet, cid, mediaType) {
  const db = await connectToMongoDB();

  try {
    const postsCollection = db.collection('posts');
    const postDocument = {
      cid,
      userWallet,
      mediaType, // Adicione mediaType ao postDocument
    };
    await postsCollection.insertOne(postDocument);

    // Obtenha o cliente a partir do banco de dados e feche a conexão com o MongoDB
    const client = db.client;
    client.close();

    console.log('Conexão com o MongoDB fechada com sucesso.');
  } catch (error) {
    console.error('Erro ao inserir dados no MongoDB:', error);
  }
}


async function saveCIDToMongoDB(userWallet, cid, mediaType) {
  const db = await connectToMongoDB();

  try {
    const postsCollection = db.collection('posts');
    const postDocument = {
      cid,
      userWallet,
      mediaType, // Adicione mediaType ao postDocument
    };
    await postsCollection.insertOne(postDocument);

    // Obtenha o cliente a partir do banco de dados e feche a conexão com o MongoDB
    const client = db.client;
    client.close();

    console.log('Conexão com o MongoDB fechada com sucesso.');
  } catch (error) {
    console.error('Erro ao inserir dados no MongoDB:', error);
  }
}
async function saveReportToMongoDB(walletAddress, randomCID, reportReason) {
  const db = await connectToMongoDB();

  try {
      const reportsCollection = db.collection('reports');

      // Verificar se o randomCID já está associado ao walletAddress
      const existingDocument = await reportsCollection.findOne({ walletAddress, randomCID });
      if (existingDocument) {
          console.log('Post is already saved.');
          return { success: false, message: 'Post is already saved.' };
      }

      // Inserir o novo documento se não for duplicado
      const document = {
          walletAddress,
          randomCID,
          reportReason // Adicionando o reportReason ao documento
      };
      await reportsCollection.insertOne(document);

      console.log('Dados inseridos com sucesso na coleção "reports".');
      return { success: true, message: 'Post salvo com sucesso.' };

  } catch (error) {
      console.error('Erro ao inserir dados na coleção "reports":', error);
      return { success: false, message: 'Erro ao salvar os dados.' };

  } finally {
      // Fechar a conexão com o MongoDB
      await db.client.close();
  }
}

async function savefavoritesToMongoDB(walletAddress, randomCID) {
  const db = await connectToMongoDB();

  try {
    const favoritesCollection = db.collection('favorites');

    // Check if randomCID is already associated with walletAddress
    const existingDocument = await favoritesCollection.findOne({ walletAddress, randomCID });
    if (existingDocument) {
      console.log('Post is already saved.');
      return { success: false, message: 'Post is already saved.' };
    }

    // Insert the new document if it's not a duplicate
    const document = {
      walletAddress,
      randomCID,
    };
    await favoritesCollection.insertOne(document);

    console.log('Data successfully inserted into the "favorites" collection.');
    return { success: true, message: 'Post successfully saved.' };

  } catch (error) {
    console.error('Error inserting data into the "favorites" collection:', error);
    return { success: false, message: 'Error saving data.' };

  } finally {
    // Close the connection to MongoDB
    await db.client.close();
  }
}


async function findRandomCIDByWalletAddress(walletAddress) {
  const db = await connectToMongoDB(); // Use a função connectToMongoDB para obter a conexão

  try {
    const collection = db.collection('favorites');
    // Realiza a busca na coleção "favorites" pelo walletAddress fornecido e ordena os resultados pelo campo randomCID em ordem decrescente
    const userFavorites = await collection.find({ walletAddress }).sort({ randomCID: -1 }).toArray();

    if (userFavorites && userFavorites.length > 0) {
      // Exibe os favoritos no console
      console.log('Favoritos encontrados para o walletAddress:', userFavorites.map(favorite => favorite.randomCID));
      return { success: true, userFavorites };
    } else {
      return { success: false, message: 'Nenhum favorito encontrado para o walletAddress fornecido.' };
    }
  } catch (error) {
    console.error('Erro ao buscar os favoritos:', error); // Adicione detalhes sobre o erro aqui
    return { success: false, message: 'Erro ao buscar os favoritos.' };
  }
}

async function getPostDataByCID(userId) {
  try {
    // Obtenha um CID aleatório usando a função getRandomCIDAndFetchPostData
    const randomCID = await getRandomCIDAndFetchPostData(userId);
    
    // Passe o CID aleatório para a função getPostDataFromIPFS
    const postDataFromIPFS = await getPostDataFromIPFS(randomCID);

    // Inclua o randomCID no objeto postDataFromIPFS
    postDataFromIPFS.randomCID = randomCID;

    // Extraia as informações diretamente do objeto postDataFromIPFS
    const { walletAddress, name, textContent, media, profileImage, timestamp } = postDataFromIPFS;

    // Retorne os dados do post e inclua o userId
    return { success: true, postData: { walletAddress, name, textContent, media, profileImage, timestamp, randomCID } };
  } catch (error) {
    return { success: false, message: 'Erro ao buscar os dados do post com base no CID aleatório.' };
  }
}


async function getpostfollow(postDataWalletAddress) {
  try {
    // Obtém dados do post com base no postDataWalletAddress
    const postData = await getCIDsByPostDataWalletAddress(postDataWalletAddress);

    // Extraia as informações do objeto postData
    const { walletAddress, name, textContent, media, profileImage, timestamp } = postData;

    return { success: true, postData: { walletAddress, name, textContent, media, profileImage, timestamp } };
  } catch (error) {
    return { success: false, message: 'Erro ao buscar os dados do post com base no endereço da carteira do usuário.' };
  }
}

async function processVideoPostsFromIPFS() {
  try {
      // Conecta-se ao banco de dados MongoDB
      const db = await connectToMongoDB();
      const postsCollection = db.collection('posts');

      // Consulta todos os documentos com `mediaType: 'video'` na coleção
      const videoPosts = await postsCollection.find({ mediaType: 'video' }).toArray();

      // Ordena os posts por número de likes decrescente
      const topLikedVideoPosts = videoPosts
          .sort((a, b) => b.likesCounter - a.likesCounter)
          .slice(0, 10); // Seleciona os 10 posts com mais likes

      // Combina `topLikedVideoPosts` e `videoPosts` para criar uma lista de posts misturada
      const mixedVideoPosts = [...topLikedVideoPosts, ...videoPosts];

      // Conjunto para rastrear os CIDs dos vídeos processados
      const videoCIDs = new Set();
      const ipfsData = [];

      // Determina a quantidade de posts a processar
      const postsToProcess = 2;

      // Processa `postsToProcess` posts a partir do índice `lastProcessedIndex`
      for (let i = 0; i < postsToProcess; i++) {
          const currentPostIndex = lastProcessedIndex + i;
          // Verifica se o índice está dentro dos limites de `mixedVideoPosts`
          if (currentPostIndex >= mixedVideoPosts.length) {
              console.log('Nenhum post único adicional para processar.');
              break;
          }

          const post = mixedVideoPosts[currentPostIndex];

          // Verifica se o post existe
          if (!post) {
              break;
          }

          const cid = post.cid;

          // Verifica se o CID já foi processado
          if (!videoCIDs.has(cid)) {
              console.log('Buscando dados do IPFS para o CID de vídeo:', cid);

              // Busca os dados do IPFS para o CID do vídeo
              const dataFromIPFS = await getPostDataFromIPFS(cid);

              // Adiciona os dados obtidos e o CID à lista de dados do IPFS
              ipfsData.push({ ...dataFromIPFS, cid });

              // Adiciona o CID ao conjunto de CIDs já processados
              videoCIDs.add(cid);
          }
      }

      // Atualiza o índice do último post processado
      lastProcessedIndex += postsToProcess;

      // Retorna os dados do IPFS e os CIDs de vídeo processados
      return { success: true, ipfsData, videoCIDs };
  } catch (error) {
      console.error('Erro ao buscar ou processar os dados do IPFS para vídeos:', error);
      return { success: false, message: 'Erro ao buscar ou processar os dados do IPFS para vídeos.' };
  }
}


async function getCIDtimelineFromIPFS(userId, walletAddress) {
  try {
    console.log(`User ID recebido: ${userId}`);
    console.log(`Wallet Address recebido: ${walletAddress}`);
    
    // Conecte-se ao banco de dados MongoDB
    const db = await connectToMongoDB();
    console.log('Conexão com o MongoDB estabelecida com sucesso.');
    const postsCollection = db.collection('posts');

    // Encontre os documentos que têm o walletAddress fornecido e ordene por timestamp decrescente
    const userWalletPosts = await postsCollection.find({ userWallet: walletAddress }).sort({ timestamp: -1 }).toArray();

    // Verifique se há posts encontrados
    if (userWalletPosts.length === 0) {
      console.log('Nenhum post encontrado para este usuário.');
      return { success: true, ipfsData: [], cids: [] };
    }

    // Extraia os CIDs dos documentos encontrados
    const allCids = userWalletPosts.map(post => post.cid);
    console.log('Todos os CIDs:', allCids);

    // Buscar os dados dos CIDs recentes
    const ipfsData = [];
    for (const cid of allCids) {
      console.log('Buscando dados do IPFS para o CID:', cid);
      const dataFromIPFS = await getPostDataFromIPFS(cid);
      ipfsData.push({ ...dataFromIPFS, cid });
    }
    console.log('Dados IPFS obtidos:', ipfsData);

    // Retorna os dados do IPFS associados aos CIDs encontrados
    return { success: true, ipfsData, cids: allCids };
  } catch (error) {
    console.error('Erro ao buscar ou processar os dados do IPFS:', error);
    return { success: false, message: 'Erro ao buscar ou processar os dados do IPFS.' };
  }
}

async function countCommentsByCID(cid) {
  try {
    // Conecte-se ao banco de dados MongoDB
    const db = await connectToMongoDB();
    const postsCollection = db.collection('posts');

    // Encontre o documento que possui o cid fornecido
    const post = await postsCollection.findOne({ cid: cid });

    // Verifique se o documento foi encontrado e tem comentários
    if (post && post.comment) {
      const commentCount = post.comment.length;

      console.log(`O documento com o CID ${cid} possui ${commentCount} comentários.`);

      // Retorna a contagem de comentários
      return { success: true, commentCount: commentCount };
    } else {
      console.log(`O documento com o CID ${cid} não foi encontrado ou não possui comentários.`);
      return { success: false, message: 'Documento não encontrado ou sem comentários.' };
    }
  } catch (error) {
    console.error('Erro ao buscar ou processar os dados do MongoDB:', error);
    return { success: false, message: 'Erro ao buscar ou processar os dados do MongoDB.' };
  }
}



async function getCIDsAndFetchFromIPFS(postDataWalletAddress, userId) {
  try {
      // Verifica se já existe um array de CIDs para o usuário
      if (!collectedCIDsPerUser[userId]) {
          collectedCIDsPerUser[userId] = [];
      }

      const db = await connectToMongoDB();
      const postsCollection = db.collection('posts');

      // Encontre aleatoriamente 3 documentos que têm o postDataWalletAddress
      const postsWithWallet = await postsCollection
          .aggregate([
              { $match: { userWallet: { $in: postDataWalletAddress } } }, // Filtra pelos wallets
              { $sample: { size: 3 } } // Seleciona aleatoriamente 3 documentos
          ])
          .toArray();

      // Para cada documento encontrado, buscar os dados associados no IPFS
      const ipfsData = [];
      for (const post of postsWithWallet) {
          // Verifica se o CID já foi coletado antes para o usuário
          if (!collectedCIDsPerUser[userId].includes(post.cid)) {
              console.log(`Buscando dados do IPFS para o CID ${post.cid}, do usuário ${userId}`);
              const dataFromIPFS = await getPostDataFromIPFS(post.cid);
              // Adiciona o randomCID ao objeto dataFromIPFS
              dataFromIPFS.randomCID = post.cid;
              ipfsData.push(dataFromIPFS);
              // Adiciona o CID coletado à lista de CIDs para o usuário
              collectedCIDsPerUser[userId].push(post.cid);
          } else {
              console.log(`CID ${post.cid} já foi coletado anteriormente para o usuário ${userId}. Ignorando...`);
          }
      }

      // Verifica se todos os CIDs foram coletados
      const totalPostsWithWallet = await postsCollection.countDocuments({ userWallet: { $in: postDataWalletAddress } });
      if (collectedCIDsPerUser[userId].length >= totalPostsWithWallet) {
          console.log(`Todos os CIDs para o usuário ${userId} foram coletados. Removendo usuário de collectedCIDsPerUser.`);
          delete collectedCIDsPerUser[userId];
      }

      return { success: true, ipfsData };
  } catch (error) {
      console.error('Erro ao buscar ou processar os dados do IPFS:', error);
      return { success: false, message: 'Erro ao buscar ou processar os dados do IPFS.' };
  }
}
async function saveAndCountLikes(randomCID, walletAddress) {
  try {
    const db = await connectToMongoDB();
    const postsCollection = db.collection('posts');

    // Primeiro, tenta encontrar o documento pelo randomCID no campo cid
    let postData = await postsCollection.findOne({ 'cid': randomCID });

    // Se não encontrou pelo cid, tenta encontrar pelo randomCID no campo comment
    if (!postData) {
      postData = await postsCollection.findOne({ 'comment': randomCID });

      // Se encontrou pelo comment, adiciona o walletAddress ao array like1 dentro do comment
      if (postData) {
        // Remove o walletAddress se já existir no array like1
        await postsCollection.updateOne(
          { 'comment': randomCID },
          { $pull: { 'like1': walletAddress } }
        );

        // Adiciona o walletAddress ao array like1
        await postsCollection.updateOne(
          { 'comment': randomCID },
          { $push: { 'like1': walletAddress } }
        );

        console.log('WalletAddress adicionado com sucesso ao array like1 do documento com randomCID:', randomCID);

        // Contando os likes únicos no array like1
        const updatedPostData = await postsCollection.findOne({ 'comment': randomCID });
        const uniqueLike1Wallets = new Set(updatedPostData.like1 || []); // Garantir que updatedPostData.like1 exista
        console.log('Likes contados pelo campo like1:', uniqueLike1Wallets.size);
        return { success: true, count: uniqueLike1Wallets.size };
      }
    }

    // Se não encontrou nenhum post pelo cid ou comment, retorna mensagem de erro
    if (!postData) {
      console.error('No post found with the provided randomCID or comment.');
      return { success: false, message: 'No post found with the provided randomCID or comment.' };
    }

    // Remove o walletAddress se já existir no array likes
    await postsCollection.updateOne(
      { '_id': postData._id },
      { $pull: { 'likes': walletAddress } }
    );

    // Adiciona um novo like no array likes
    await postsCollection.updateOne(
      { '_id': postData._id },
      { $push: { 'likes': walletAddress } }
    );

    console.log('WalletAddress adicionado com sucesso ao array likes do documento com randomCID:', randomCID);

    // Verifique se o campo 'likes' existe no documento atualizado
    postData = await postsCollection.findOne({ '_id': postData._id });
    const likesCount = postData.likes ? postData.likes.length : 0;
    console.log('Likes atualizados e contados com sucesso:', likesCount);
    return { success: true, count: likesCount };

  } catch (error) {
    console.error('Erro ao contar likes:', error);
    return { success: false, message: 'Error saving and counting likes.' };
  }
}
async function countLikes(randomCID) {
  try {
    const db = await connectToMongoDB();
    const postsCollection = db.collection('posts');

    // Primeira tentativa: Encontra o documento que tem o randomCID fornecido no campo 'comment'
    let postData = await postsCollection.findOne({ 'comment': randomCID });

    // Se encontrou no campo 'comment', conta os likes no array 'like1'
    if (postData) {
      // Se o post não tiver like1 ou a lista de like1 estiver vazia
      if (!postData.like1 || postData.like1.length === 0) {
        return { success: true, count: 0 };
      }

      // Filtra os likes únicos por walletAddress no array 'like1'
      const uniqueLike1Wallets = new Set(postData.like1);
      return { success: true, count: uniqueLike1Wallets.size };
    }

    // Segunda tentativa: Encontra o documento que tem o randomCID fornecido no campo 'cid'
    postData = await postsCollection.findOne({ 'cid': randomCID });

    // Verifica se o documento foi encontrado na segunda consulta
    if (!postData) {
      return { success: false, message: 'No post found with the provided randomCID.' };
    }

    // Se o post não tiver likes ou a lista de likes estiver vazia
    if (!postData.likes || postData.likes.length === 0) {
      return { success: true, count: 0 };
    }

    // Filtra os likes únicos por walletAddress no array 'likes'
    const uniqueLikes = new Set(postData.likes.map(like => like.walletAddress));

    // Retorna o número total de wallets diferentes que deram like
    return { success: true, count: uniqueLikes.size };

  } catch (error) {
    console.error('Error counting likes:', error);
    return { success: false, message: 'Error counting likes.' };
  }
}

async function getRandomCIDAndFetchPostData(userId) {
  try {
    const db = await connectToMongoDB();
    const postsCollection = db.collection('posts');

    // Consulte todos os documentos na coleção
    const allPosts = await postsCollection.find().toArray();

    // Inicializa um objeto para armazenar os pares userId-CID
    if (!selectedUserCIDs[userId]) {
      selectedUserCIDs[userId] = {};
    }

    // Verifique se todos os CIDs únicos foram selecionados
    if (Object.keys(selectedUserCIDs[userId]).length >= allPosts.length) {
      console.log(`Todos os CIDs únicos para o userId ${userId} já foram selecionados.`);
      return null; // Retorna null se todos os CIDs únicos já foram selecionados
    }

    // Filtrar os posts com mais likes (top 10 ou quantia desejada)
    const topLikedPosts = allPosts
      .sort((a, b) => b.likesCounter - a.likesCounter) // Ordena por likes decrescente
      .slice(0, 10); // Seleciona os top 10 com mais likes (você pode ajustar essa quantidade)

    // Combina todos os posts com os top liked posts para obter uma lista de posts misturada
    const mixedPosts = [...allPosts, ...topLikedPosts];

    let randomCID, randomPost;
    do {
      // Gere um índice aleatório entre 0 e o número total de documentos misturados
      const randomIndex = Math.floor(Math.random() * mixedPosts.length);

      // Selecione o post aleatório
      randomPost = mixedPosts[randomIndex];

      // Obtenha o CID do documento
      randomCID = randomPost.cid;
    } while (selectedUserCIDs[userId][randomCID]); // Verifica se o CID já foi selecionado para o userId

    // Adiciona o CID selecionado à lista de CIDs selecionados para o userId
    selectedUserCIDs[userId][randomCID] = true;

    return randomCID; // Retorna o CID aleatório
  } catch (error) {
    console.error(`Erro ao buscar um CID aleatório para o userId ${userId} da coleção "posts":`, error);
    throw error;
  }
}


async function fetchFileFromIPFS(cid) {
  console.log(`Recebida solicitação para o CID: ${cid}`);
  console.log(`Buscando arquivo do CID ${cid} no IPFS...`);

  const command = `curl -X POST "http:/157.173.210.42:5001/api/v0/cat?arg=${cid}"`;

  return new Promise((resolve, reject) => {
    exec(command, { encoding: 'binary' }, (error, stdout, stderr) => {
      if (error) {
        console.error('Erro na execução do comando curl:', error);
        reject(error);
      } else {
        try {
          // Verifica se stdout está retornando dados
          if (!stdout || typeof stdout !== 'string') {
            console.error('Dados do IPFS não encontrados.');
            reject(new Error('Dados do IPFS não encontrados'));
            return;
          }

          // Converte os dados para um Buffer
          const fileBuffer = Buffer.from(stdout, 'binary');

          // Exibe os dados recuperados do IPFS no console
          console.log('Dados do IPFS:');
          console.log(fileBuffer.toString());

          // Resolve com os dados recuperados do IPFS
          resolve(fileBuffer);
        } catch (err) {
          console.error('Erro ao exibir os dados do arquivo:', err);
          reject(new Error('Erro ao exibir os dados do arquivo'));
        }
      }
    });
  });
}
async function getPostrandomCIDFromIPFS(randomCID) {
  try {
    console.log(`Buscando dados do CID ${randomCID} no IPFS...`);

    const apiUrl = `http://157.173.210.42:5001/api/v0/cat?arg=${randomCID}`;
    
    const response = await axios.post(apiUrl, {}, { timeout: 60000 }); // Defina o timeout para 60 segundos

    // Se a resposta estiver OK (status 200), retorne os dados junto com o randomCID
    if (response.status === 200) {
      const data = response.data;
      data.randomCID = randomCID; // Adiciona o randomCID ao objeto data
      return data;
    } else {
      console.error('Erro ao buscar os dados do usuário do IPFS.');
      throw new Error('Erro ao buscar os dados do usuário do IPFS.');
    }
  } catch (error) {
    console.error('Erro ao buscar informações do post com base no CID aleatório:', error.message);
    throw error;
  }
}

async function getPostDataFromIPFS(cid) {
  try {
    console.log(`Buscando dados do CID ${cid} no IPFS...`);

    const apiUrl = `http://157.173.210.42:5001/api/v0/cat?arg=${cid}`;
    
    const response = await axios.post(apiUrl, {}, { timeout: 60000 }); // Defina o timeout para 60 segundos

    // Se a resposta estiver OK (status 200), retorne os dados
    if (response.status === 200) {
      const data = response.data;
      return data;
    } else {
      console.error('Erro ao buscar os dados do usuário do IPFS.');
      throw new Error('Erro ao buscar os dados do usuário do IPFS.');
    }
  } catch (error) {
    console.error('Erro ao buscar informações do post com base no CID aleatório.', error.message);
    throw error;
  }
}
// Função para enviar dados para o IPFS
async function uploadFileToIPFS(formData) {
  try {
    const options = {
      method: 'POST',
      headers: formData.getHeaders(),
      data: formData,
      url: 'http://157.173.210.42:5001/api/v0/add', // Atualize este URL de acordo com a rota do seu serviço IPFS
    };

    const response = await axios(options);

    if (response.status === 200) {
      const { Hash } = response.data;
      console.log(`Dados enviados com sucesso para o IPFS. CID: ${Hash}`);
      return Hash; // Retornar o CID
    } else {
      throw new Error(`Erro ao enviar os dados para o IPFS. Status: ${response.status}`);
    }
  } catch (error) {
    console.error('Erro ao enviar para o IPFS:', error);
    throw new Error(`Erro ao enviar para o IPFS: ${error.message}`);
  }
}



async function uploadPostDataToIPFS(userWallet, name, textContent, media, profileImage) {
  const boundary = '----my-boundary';
  const headers = {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
  };

  // Crie um objeto JSON com as informações do post, incluindo metadados e a imagem de perfil.
  const postObject = {
    walletAddress: userWallet, // Utilize userWallet como walletAddress
    name,
    textContent,
    media,
    profileImage, // Adicione a imagem de perfil aqui
    timestamp: new Date().toISOString(), // Adicione a data e hora como metadado.
  };

  // Converta o objeto JSON em uma string
  const postJSON = JSON.stringify(postObject);

  // Construa a carga útil com o JSON
  const payload = `--${boundary}\r\n` +
    'Content-Disposition: form-data; name="file"; filename="post.json"\r\n' +
    'Content-Type: application/json\r\n\r\n' +
    `${postJSON}\r\n`;

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
            console.log(`Dados do post adicionados com sucesso. CID: ${response.Hash}`);
            resolve(response.Hash);
          } else {
            reject(new Error('Erro ao adicionar os dados do post ao IPFS.'));
          }
        } else {
          reject(new Error(`Erro ao enviar os dados do post ao IPFS. Status: ${res.statusCode}`));
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

async function uploadCommentDataToIPFS(userWallet, name, textContent, profileImage, randomCID) {
  const boundary = '----my-boundary';
  const headers = {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
  };

  // Crie um objeto JSON com as informações do comentário, incluindo metadados e a imagem de perfil.
  const commentObject = {
    walletAddress: userWallet, // Utilize userWallet como walletAddress
    name,
    textContent,
    profileImage, // Adicione a imagem de perfil aqui
    randomCID,
    timestamp: new Date().toISOString(), // Adicione a data e hora como metadado.
  };

  // Converta o objeto JSON em uma string
  const commentJSON = JSON.stringify(commentObject);

  // Construa a carga útil com o JSON
  const payload = `--${boundary}\r\n` +
    'Content-Disposition: form-data; name="file"; filename="comment.json"\r\n' +
    'Content-Type: application/json\r\n\r\n' +
    `${commentJSON}\r\n`;

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
            console.log(`Dados do comentário adicionados com sucesso. CID: ${response.Hash}`);
            resolve(response.Hash);
          } else {
            reject(new Error('Erro ao adicionar os dados do comentário ao IPFS.'));
          }
        } else {
          reject(new Error(`Erro ao enviar os dados do comentário ao IPFS. Status: ${res.statusCode}`));
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
async function addCIDToPost(randomCID, newComment) {
  try {
    const db = await connectToMongoDB();
    const postsCollection = db.collection('posts');

    // Encontre o documento com base no randomCID
    const postDocument = await postsCollection.findOne({ cid: randomCID });

    if (!postDocument) {
      console.error('Documento não encontrado para o randomCID:', randomCID);
      return;
    }

    // Verifique se postDocument.comment é um array
    const existingComments = Array.isArray(postDocument.comment) ? postDocument.comment : [];

    // Adicione o novo comentário ao início do conjunto de comentários no campo 'comment'
    const updatedComments = [newComment, ...existingComments];

    // Atualize o documento com o novo conjunto de comentários
    await postsCollection.updateOne({ cid: randomCID }, { $set: { comment: updatedComments } });

    console.log('Comentário adicionado com sucesso ao documento com randomCID:', randomCID);

    // Feche a conexão com o MongoDB
    db.client.close();
  } catch (error) {
    console.error('Erro ao adicionar comentário ao documento no MongoDB:', error);
  }
}


async function getPostsByRandomCID(randomCID, limit = 10) {
  try {
    const db = await connectToMongoDB();
    const postsCollection = db.collection('posts');

    // Encontre todos os documentos que contêm o randomCID no campo 'cid'
    const postsWithRandomCID = await postsCollection
      .find({ 'cid': randomCID })
      .limit(limit)
      .toArray();

    if (postsWithRandomCID.length === 0) {
      console.log('Nenhum post encontrado com o CID:', randomCID);
      return [];
    }

    const commentContentList = postsWithRandomCID.map(post => post.comment).flat();
    console.log('Conteúdo do comentário recuperado por randomCID:', commentContentList);

    return commentContentList;
  } catch (error) {
    console.error('Erro ao buscar conteúdo do comentário pelo randomCID:', error);
    throw error;
  }
}
async function getPostDataFromIPFSList(cids) {
  try {
    const ipfsDataList = [];

    for (const cid of cids) {
      if (!cid) {
        console.warn('CID é indefinido ou nulo. Ignorando...');
        continue; // Pula para a próxima iteração se o CID for indefinido ou nulo
      }

      console.log(`Buscando dados do CID ${cid} no IPFS...`);

      const apiUrl = `http://157.173.210.42:5001/api/v0/cat?arg=${cid}`;

      try {
        const response = await axios.post(apiUrl, {}, { timeout: 60000 });

        // Se a resposta estiver OK (status 200), retorne os dados
        if (response.status === 200) {
          const ipfsData = response.data; // Agora, ipfsData contém diretamente os dados do IPFS, sem um objeto 'data' adicional
          ipfsData.cid = cid; // Inclui o CID dentro dos dados do IPFS
          ipfsDataList.push(ipfsData);
        } else {
          console.error(`Erro ao buscar os dados do CID ${cid} no IPFS. Resposta:`, response.status);
          throw new Error(`Erro ao buscar os dados do CID ${cid} no IPFS. Resposta: ${response.status}`);
        }
      } catch (error) {
        console.error(`Erro ao buscar os dados do CID ${cid} no IPFS:`, error.message);
        throw new Error(`Erro ao buscar os dados do CID ${cid} no IPFS: ${error.message}`);
      }
    }

    console.log('Dados do IPFS recuperados:', ipfsDataList);
    return ipfsDataList;
  } catch (error) {
    console.error('Erro ao buscar informações do post com base nos CIDs.', error.message);
    throw error;
  }
}

// Função para adicionar um arquivo ao IPFS
async function addFileToIPFS(fileBuffer, fileName) {
  try {
      // Cria um objeto FormData para enviar o arquivo
      const formData = new FormData();
      formData.append('path', fileName);
      formData.append('file', fileBuffer, fileName);

      // URL da API do IPFS
      const ipfsApiUrl = 'http://157.173.210.42:5001/api/v0/add';

      // Envia a solicitação POST para a API do IPFS com o arquivo
      const response = await axios.post(ipfsApiUrl, formData, {
          headers: formData.getHeaders(),
      });

      // Verifique a estrutura da resposta
      console.log('Resposta da API do IPFS:', response.data);

      // Separar as linhas da resposta em um array de objetos JSON
      const dataLines = response.data.split('\n').filter(line => line.trim() !== '');

      // Analisar cada linha em um objeto JSON
      const responseData = dataLines.map(line => JSON.parse(line));

      // Verifique se há pelo menos dois itens na resposta
      if (responseData.length >= 2) {
          // Pegue o Hash do segundo item
          const secondItem = responseData[1];
          const cid = secondItem.Hash;

          // Imprime o CID no console
          console.log('CID do vídeo adicionado ao IPFS:', cid);
          return cid;  // Retorna o CID do segundo item
      }

      // Se o CID não for encontrado, imprima uma mensagem de erro
      console.error('CID não encontrado na resposta da API do IPFS.');
      return null;
  } catch (error) {
      console.error('Erro ao adicionar o arquivo ao IPFS:', error);
      return null;
  }
}


module.exports = {
  uploadPostDataToIPFS,
  getPostrandomCIDFromIPFS,
  saveAndCountLikes,
  savefavoritesToMongoDB,
  addFileToIPFS,
  findRandomCIDByWalletAddress,
  uploadFileToIPFS,  
  uploadCommentDataToIPFS,
  addCIDToPost,
  getPostsByRandomCID,
  getCIDsAndFetchFromIPFS,
  saveCIDToMongoDB,
  processVideoPostsFromIPFS,
  fetchFileFromIPFS,
  countLikes,
  saveReportToMongoDB,
  getPostDataFromIPFS,
  countCommentsByCID,
  getPostDataFromIPFSList,
  getPostDataByCID,
  getCIDtimelineFromIPFS,
  getRandomCIDAndFetchPostData,
};
