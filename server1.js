const express = require('express');
const multer = require('multer');
const axios = require('axios');
const path = require('path');
const WebSocket = require('ws');
const formidable = require('formidable');
const users = require('./users.js');
const posts = require('./posts.js');
const http = require('http');
const { sendWebSocketData } = require('./WebSocket'); // Certifique-se de fornecer o caminho correto para o arquivo WebSocket.js
const FormData = require('form-data');

const { v4: uuidv4 } = require('uuid');



const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024 * 1024; // 25 GB em bytes
const MAX_VIDEO_DURATION_SECONDS = 2 * 60 * 60; // 2 horas em segundos
let ws; // Defina a variável ws fora do escopo da função
const app = express();
const server = http.createServer(app);
// Objeto para armazenar endereços de carteira para cada usuário
const cachedWalletAddresses = {};

const wss = new WebSocket.Server({ server });
app.use(express.json({ limit: '5gb' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  // Configure os cabeçalhos CORS necessários
  res.setHeader('Access-Control-Allow-Origin', '*'); // Permite qualquer origem
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS'); // Permite métodos HTTP específicos
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Permite cabeçalhos específicos
  res.setHeader('Access-Control-Allow-Credentials', 'true'); // Permite credenciais (cookies, autenticação)

  // Continue com a próxima função middleware
  next();
});

app.use(express.json({ limit: '50gb' }));
// Configuração do Multer para armazenamento temporário em memória
const storage = multer.memoryStorage();
const upload = multer({ storage });


app.use(express.json());
// Endpoint para fornecer o endereço do proprietário da carteira
app.get('/ownerWalletAddress', (req, res) => {
  const ownerWalletAddress = '0xdc7928AB4b703DFDadED251362cE007b6A00aEEb'; // Substitua pelo endereço real
  res.json({ ownerWalletAddress });
});

app.post('/api/cadastrarUsuario', async (req, res) => {
  try {
    const { name, bio, profileImgSrc, walletAddress } = req.body;

    // Chama a função para fazer upload dos dados do usuário para IPFS
    const cid = await users.uploadUserDataToIPFS(walletAddress, name, bio, profileImgSrc);

    // Chama a função para salvar o CID, o endereço da carteira e o nome no MongoDB
    await users.saveCIDAndWalletAddressToMongoDB(walletAddress, cid, name);

    res.status(200).json({ success: true, message: 'Dados cadastrados com sucesso.' });
  } catch (error) {
    if (error.message === 'Já existe um usuário com esse nome.') {
      res.status(400).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ success: false, message: 'Erro ao cadastrar usuário.', error: error.message });
    }
  }
});

app.get('/check-wallet', async (req, res) => {
  try {
    const walletAddress = req.query.walletAddress;
    const result = await users.findUserByWalletAddress(walletAddress);

    if (result.success) {
      console.log('Usuário encontrado');
      res.json({ redirectTo: `principal/index.html?walletAddress=${walletAddress}` });
    } else {
      console.log('Usuário não encontrado');
      res.json({ redirectTo: `cadastro.html?walletAddress=${walletAddress}` });
    }
  } catch (error) {
    console.error('Erro ao verificar o endereço da carteira:', error);
    res.redirect('/error.html');
  }
});
// Rota para verificar o wallet e buscar o randomCID associado
app.get('/check-randomCID', async (req, res) => {
  try {
    const walletAddress = req.query.walletAddress;
    const result = await posts.findRandomCIDByWalletAddress(walletAddress);

    if (result.success) {
      const randomCIDs = result.userFavorites.map(async favorite => {
        const randomCID = favorite.randomCID;
        const postData = await posts.getPostrandomCIDFromIPFS(randomCID);
        const additionalData = await posts.getPostrandomCIDFromIPFS(randomCID);
        const combinedData = { ...postData, randomCID: additionalData.randomCID };
        return combinedData;
      });
      // Aguarda todas as chamadas à função getPostrandomCIDFromIPFS
      const postData = await Promise.all(randomCIDs);
      res.json(postData);
    } else {
      res.status(404).json({ message: result.message });
    }
  } catch (error) {
    console.error('Erro ao  verificar o wallet:', error);
    res.status(500).json({ message: 'Erro ao verificar o wallet.' });
  }
});




app.get('/userProfile', async (req, res) => {
  try {
    const walletAddress = req.query.walletAddress;
    console.log('Wallet Address recebido:', walletAddress);

    const userProfile = await users.getCIDByWalletAddress(walletAddress);

    if (userProfile.success) {
      console.log('Informações do usuário:', userProfile.userData);
      res.json(userProfile.userData);
    } else {
      console.log('Usuário não encontrado no banco de dados ou erro ao buscar o perfil.');
      res.status(404).json({ success: false, message: 'Usuário não encontrado no banco de dados ou erro ao buscar o perfil.' });
    }
  } catch (error) {
    console.error('Erro na rota /userProfile:', error);
    res.status(500).json({ success: false, message: 'Erro na rota.' });
  }
});
app.get('/updateLikeCounter', async (req, res) => {
  try {
    const randomCID = req.query.randomCID;
    const walletAddress = req.query.walletAddress;

    if (!randomCID || !walletAddress) {
      return res.status(400).json({ success: false, message: 'Informe o randomCID e o walletAddress.' });
    }

    const result = await posts.saveAndCountLikes(randomCID, walletAddress);

    if (result.success) {
      console.log('Likes atualizados e contados com sucesso:', result.count);
      return res.json({ success: true, count: result.count, message: 'Likes atualizados e contados com sucesso.' });
    } else {
      console.log('Erro ao atualizar e contar likes:', result.message);
      return res.status(404).json(result);
    }
  } catch (error) {
    console.error('Erro na rota /updateLikeCounter:', error);
    return res.status(500).json({ success: false, message: 'Erro na rota.' });
  }
});

app.get('/countLikes', async (req, res) => {
  try {
    const randomCID = req.query.randomCID;

    if (!randomCID) {
      return res.status(400).json({ success: false, message: 'Informe o randomCID.' });
    }

    const result = await posts.countLikes(randomCID);

    if (result.success) {
      console.log('Likes contados com sucesso:', result.count);
      return res.json({ success: true, count: result.count, message: 'Likes contados com sucesso.' });
    } else {
      console.log('Erro ao contar likes:', result.message);
      return res.status(404).json(result);
    }
  } catch (error) {
    console.error('Erro na rota /countLikes:', error);
    return res.status(500).json({ success: false, message: 'Erro na rota.' });
  }
});


app.get('/userProfiletimeline/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log('User ID recebido:', userId);

    const walletAddress = req.query.walletAddress;
    console.log('Wallet Address recebido:', walletAddress);

    const timelineData = await posts.getCIDtimelineFromIPFS(userId, walletAddress);

    if (timelineData.success) {
      console.log('Dados da timeline:', timelineData.ipfsData);
      res.json(timelineData.ipfsData);
    } else {
      console.log('Erro ao buscar os dados da timeline.');
      res.status(404).json({ success: false, message: 'Erro ao buscar os dados da timeline.' });
    }
  } catch (error) {
    console.error('Erro na rota /userProfiletimeline:', error);
    res.status(500).json({ success: false, message: 'Erro na rota.' });
  }
});
app.get('/user/perfil', (req, res) => {
  try {
    const { walletAddress, userId, mycid, mywalletAddressOwner, isDarkMode } = req.query; // Obtém os parâmetros de consulta

    if (!walletAddress || !userId || !mycid || !mywalletAddressOwner) {
      return res.status(400).send('Endereço da carteira, userId, mycid ou mywalletAddressOwner não fornecido.');
    }

    // Verifica se o parâmetro isDarkMode foi fornecido e imprime seu valor
    if (isDarkMode !== undefined) {
      console.log('Modo Escuro Ativado:', isDarkMode === 'true');
    }

    // Construir a URL com os parâmetros fornecidos
    const redirectTo = `../perfil.html?walletAddress=${walletAddress}&userId=${userId}&mycid=${mycid}&mywalletAddressOwner=${mywalletAddressOwner}&isDarkMode=${isDarkMode}`;

    // Retorna a URL para redirecionamento
    res.json({ redirectTo });
  } catch (error) {
    res.status(500).send('Erro ao processar a solicitação.');
  }
});
app.get('/user/perfilprofile', (req, res) => {
  try {
    const { walletAddress, userId, mycid, mywalletAddressOwner, isDarkMode } = req.query; // Obtém os parâmetros de consulta

    if (!walletAddress || !userId || !mycid || !mywalletAddressOwner) {
      return res.status(400).send('Endereço da carteira, userId, mycid ou mywalletAddressOwner não fornecido.');
    }

    // Verifica se o parâmetro isDarkMode foi fornecido e imprime seu valor
    if (isDarkMode !== undefined) {
      console.log('Modo Escuro Ativado:', isDarkMode === 'true');
    }

    // Construir a URL com os parâmetros fornecidos
    const redirectTo = `perfil.html?walletAddress=${walletAddress}&userId=${userId}&mycid=${mycid}&mywalletAddressOwner=${mywalletAddressOwner}&isDarkMode=${isDarkMode}`;

    // Retorna a URL para redirecionamento
    res.json({ redirectTo });
  } catch (error) {
    res.status(500).send('Erro ao processar a solicitação.');
  }
});


app.get('/user/rawDataFromIPFS', async (req, res) => {
  try {
    const { cid } = req.query; // Obtém o cid dos parâmetros de consulta

    if (!cid) {
      return res.status(400).send('CID não fornecido.');
    }

    // Chamada da função getRawDataFromIPFS com o cid
    const userDataFromIPFS = await users.getRawDataFromIPFS(cid);

    // Retorna os dados obtidos do IPFS
    res.json(userDataFromIPFS);
  } catch (error) {
    res.status(500).send('Erro ao processar a solicitação.');
  }
});


// Rota para receber o CID e enviá-lo para a função
app.post('/processCID', async (req, res) => {
  try {
      const { cid } = req.body;

      if (!cid) {
          return res.status(400).json({ success: false, message: 'CID não fornecido.' });
      }

      // Chama a função para processar o CID
      const result = await posts.countCommentsByCID(cid);

      if (result.success) {
          res.status(200).json({ 
              success: true, 
              message: 'CID processado com sucesso.', 
              commentCount: result.commentCount 
          });
      } else {
          res.status(404).json({ success: false, message: result.message });
      }
  } catch (error) {
      console.error('Erro ao processar o CID:', error);
      res.status(500).json({ success: false, message: 'Erro ao processar o CID.', error: error.message });
  }
});

app.get('/user/perfil3', (req, res) => {
    try {
        // Gere um ID único para o usuário
        const userId = uuidv4();
        const cachedWalletAddressReceived = req.query.cachedWalletAddress;

        if (!cachedWalletAddressReceived) {
            return res.status(400).send('cachedWalletAddress não fornecido.');
        }

        // Armazena o `cachedWalletAddress` recebido no objeto `cachedWalletAddresses` usando `userId` como chave
        cachedWalletAddresses[userId] = cachedWalletAddressReceived;

        console.log(`cachedWalletAddress salvo com sucesso para o usuário ${userId}:`, cachedWalletAddresses[userId]);

        // Retorna o `userId` único para o frontend junto com uma mensagem de sucesso
        res.json({ userId, message: `cachedWalletAddress salvo com sucesso para o usuário ${userId}.` });
    } catch (error) {
        res.status(500).send('Erro ao processar a solicitação.');
    }
});

// Rota para acessar o walletAddress armazenado
app.get('/user/wallet3', (req, res) => {
  try {
    // Obtenha o userId da consulta
    const userId = req.query.userId;

    // Verifica se o userId foi fornecido
    if (!userId) {
      return res.status(400).send('userId não fornecido.');
    }

    // Procura o walletAddress correspondente ao userId em cachedWalletAddresses
    const walletUser = cachedWalletAddresses[userId];

    // Verifica se um walletAddress foi encontrado para o userId
    if (!walletUser) {
      return res.status(404).send('Nenhum walletAddress encontrado para o userId fornecido.');
    }

    // Retorna o walletAddress para o usuário
    res.json({ walletAddress: walletUser });
  } catch (error) {
    res.status(500).send('Erro ao processar a solicitação.');
  }
});


// Rota para converter base64 para URL Blob
app.post('/convertBase64ToBlob', (req, res) => {
  try {
    const base64Content = req.body.base64Content;

    // Remove cabeçalho de tipo de mídia do base64, se presente
    const base64Data = base64Content.replace(/^data:([A-Za-z-+/]+);base64,/, '');

    const buffer = Buffer.from(base64Data, 'base64');
    const blob = new Blob([buffer]);

    // Cria a URL Blobs
    const blobUrl = URL.createObjectURL(blob);

    res.json({ success: true, blobUrl });
  } catch (error) {
    console.error('Erro ao converter base64 para Blob:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});




// Configura a rota para receber a mídia e passá-la para a função uploadFileToIPFS
app.post('/uploadpost', upload.single('media'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }

    // Cria um FormData e anexa o arquivo de mídia
    const formData = new FormData();
    formData.append('media', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    // Chama a função uploadFileToIPFS e envia o formData
    try {
      const mediaUrl = await posts.uploadFileToIPFS(formData); // Envie o FormData
      console.log('Mídia recebida e enviada com sucesso para a função do IPFS.');
      res.status(200).json({ cid: mediaUrl }); // Enviar o CID como resposta
    } catch (error) {
      console.error('Erro ao enviar a mídia para o IPFS:', error);
      res.status(500).send('Erro ao enviar a mídia para o IPFS');
    }
  } catch (error) {
    console.error('Erro ao processar a solicitação:', error);
    res.status(500).send('Erro ao processar a solicitação');
  }
});
// Rota para obter o arquivo do IPFS e enviar como Blob para o cliente
app.get('/getFileFromIPFS/:cid', async (req, res) => {
  try {
    const { cid } = req.params;

    // Supondo que fetchFileFromIPFS é uma função que retorna o buffer do arquivo usando o CID
    const fileBuffer = await posts.fetchFileFromIPFS(cid);

    if (!fileBuffer) {
      console.error(`Falha ao recuperar o arquivo para o CID: ${cid}`);
      return res.status(500).send('Erro ao buscar o arquivo do IPFS.');
    }

    // Cria um URL Blob do buffer recebido
    const blobUrl = URL.createObjectURL(new Blob([fileBuffer]));
    console.log('URL Blob criado:', blobUrl);

    // Envia o Blob diretamente como resposta
    res.status(200).send(blobUrl);
  } catch (error) {
    console.error('Erro ao processar a requisição:', error);
    res.status(500).send('Erro ao processar a requisição.');
  }
});
// Rota no servidor para receber commentData
app.post('/createComment', async (req, res) => {
  try {
    console.log('Recebendo solicitação para /createComment');
    
    const { userWallet, name, textContent, profileImage, randomCID } = req.body;

    if (!userWallet || !name || !textContent || !randomCID) {
      console.error('Parâmetros inválidos:', req.body);
      res.status(400).json({ success: false, message: 'Endereço da carteira, nome, texto do comentário e randomCID são obrigatórios.' });
      return;
    }

    // Continue com o restante do código para processar os dados e salvar o comentário
    const commentCID = await posts.uploadCommentDataToIPFS(userWallet, name, textContent, profileImage, randomCID);

    // Adiciona o novo CID ao documento com randomCID
    await posts.addCIDToPost(randomCID, commentCID);

    console.log('Comentário adicionado com sucesso. CID:', commentCID);

    res.json({ success: true, message: 'Comentário criado com sucesso.', cid: commentCID });
  } catch (error) {
    console.error('Erro na rota /createComment:', error);
    res.status(500).json({ success: false, message: 'Erro na rota.' });
  }
});

app.post('/createPost', async (req, res) => {
  try {
    const { userWallet, name, textContent, profileImage, media, contentType, mediaType } = req.body;

    // Verifica se o texto do post foi fornecido
    if (!userWallet || !name || !textContent) {
      res.status(400).json({ success: false, message: 'Endereço da carteira, nome e texto do post são obrigatórios.' });
      return;
    }

    // Continue com o restante do código para processar os dados e salvar o post
    const postCID = await posts.uploadPostDataToIPFS(userWallet, name, textContent, media || null, profileImage || null);

    // Chame saveCIDToMongoDB passando o userWallet, postCID, contentType e mediaType
    await posts.saveCIDToMongoDB(userWallet, postCID, mediaType);

    res.json({ success: true, message: 'Post criado com sucesso.', cid: postCID });
  } catch (error) {
    console.error('Erro na rota /createPost:', error);
    res.status(500).json({ success: false, message: 'Erro na rota.' });
  }
});


// Route to follow a user
app.post('/users/follow', async (req, res) => {
  const { currentUserWalletAddress, postDataWalletAddress } = req.body;

  console.log('currentUserWalletAddress:', currentUserWalletAddress);
  console.log('userToFollowWalletAddress:', postDataWalletAddress);

  try {
    const result = await users.followUser(currentUserWalletAddress, postDataWalletAddress);
    console.log('Follow user operation result:', result);

    if (!result.success && result.message === 'You are already following this user.') {
      res.status(400).json(result); // Bad Request status if already following
    } else {
      res.json(result);
    }
  } catch (error) {
    console.error('Error following the user:', error.message);
    res.status(500).json({ success: false, message: 'Error following the user' });
  }
});
// Rota para verificar o status de follow
app.post('/users/check-follow', async (req, res) => {
  const { userWallet, followWallet } = req.body;

  console.log('userWallet:', userWallet);
  console.log('followWallet:', followWallet);

  try {
    const result = await users.checkFollowStatus(userWallet, followWallet);
    console.log('Check follow status result:', result);

    res.json(result);
  } catch (error) {
    console.error('Error checking follow status:', error.message);
    res.status(500).json({ success: false, message: 'Error checking follow status' });
  }
});
// Rota para deixar de seguir um usuário
app.post('/users/unfollow', async (req, res) => {
  const { userWallet, followWallet } = req.body;

  console.log('userWallet:', userWallet);
  console.log('followWallet:', followWallet);

  try {
    const result = await users.unfollowUser(userWallet, followWallet);
    console.log('Unfollow user result:', result);

    res.json(result);
  } catch (error) {
    console.error('Error unfollowing user:', error.message);
    res.status(500).json({ success: false, message: 'Error unfollowing user' });
  }
});


// Rota para seguir um usuário
app.post('/find/follow', async (req, res) => {
  const { currentUserWalletAddress } = req.body;

  console.log('currentUserWalletAddress:', currentUserWalletAddress);

  try {
    // Aqui você deve implementar a lógica para seguir o usuário com o endereço de carteira fornecido
    // A função followUser é apenas um exemplo fictício; você deve substituir isso pela sua lógica real
    const result = await users.getFollowFromMongoDB(currentUserWalletAddress);
    
    // Imprime o resultado da operação no console do servidor
    console.log('Resultado da operação de seguir usuário:', result);
    
    // Retorna a resposta JSON com o resultado da operação
    res.json(result);
  } catch (error) {
    console.error('Erro ao seguir o usuário:', error.message);
    res.status(500).json({ success: false, message: 'Erro ao seguir o usuário' });
  }
});

// Rota para buscar seguidores com o mesmo walletAddress
app.post('/find/followers', async (req, res) => {
  const { walletAddress } = req.body;

  console.log('Wallet Address recebido:', walletAddress);

  try {
    // Chama a função para buscar os seguidores com o mesmo walletAddress
    const followers = await users.findFollowersWithSameWalletAddress(walletAddress);
    
    // Imprime os seguidores encontrados no console do servidor
    console.log('Seguidores encontrados:', followers);
    
    // Retorna a resposta JSON com os seguidores encontrados
    res.json(followers);
  } catch (error) {
    console.error('Erro ao buscar seguidores:', error.message);
    res.status(500).json({ success: false, message: 'Erro ao buscar seguidores' });
  }
});
app.post('/reports', async (req, res) => {
  const { walletAddress, randomCID, reportReason } = req.body; // Adicionando reportReason à desestruturação

  console.log('Endereço da carteira do usuário:', walletAddress);
  console.log('RandomCID do post comentado:', randomCID);
  console.log('Motivo do report:', reportReason); // Log da mensagem do usuário

  try {
      // Chamando a função para salvar na coleção "reports" do MongoDB
      const result = await posts.saveReportToMongoDB(walletAddress, randomCID, reportReason); // Passando reportReason para a função

      // Enviar uma resposta de sucesso
      res.json({ success: true, message: result.message });
  } catch (error) {
      // Se ocorrer um erro, enviar uma resposta de erro
      console.error('Erro ao salvar dados na coleção "reports":', error.message);

      if (error.message === 'post is already saved.') {
          res.status(400).json({ success: false, message: error.message });
      } else {
          res.status(500).json({ success: false, message: 'Erro ao salvar dados na coleção "reports".' });
      }
  }
});
// Rota para salvar dados na coleção "favorites" com base no endereço da carteira e no randomCID
app.post('/favorites', async (req, res) => {
  const { walletAddress, randomCID } = req.body;

  console.log('Endereço da carteira do usuário:', walletAddress);
  console.log('RandomCID do post comentado:', randomCID);

  try {
    // Chamando a função para salvar na coleção "favorites" do MongoDB
    const result = await posts.savefavoritesToMongoDB(walletAddress, randomCID);

    // Enviar uma resposta de sucesso
    res.json({ success: true, message: result.message });
  } catch (error) {
    // Se ocorrer um erro, enviar uma resposta de erro
    console.error('Erro ao salvar dados na coleção "favorites":', error.message);
    
    if (error.message === 'post is already saved.') {
      res.status(400).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ success: false, message: 'Erro ao salvar dados na coleção "favorites".' });
    }
  }
});

// Rota que recebe o CID por meio de uma requisição POST
app.post('/get-post-data', async (req, res) => {
  try {
      const { cid } = req.body;

      if (!cid) {
          return res.status(400).json({ error: 'CID é obrigatório' });
      }

      // Chama a função getPostDataFromIPFS com o CID recebido
      const postData = await posts.getPostDataFromIPFS(cid);

      // Envia os dados recebidos de volta na resposta
      res.json(postData);
  } catch (error) {
      console.error('Erro ao buscar dados do IPFS:', error);
      res.status(500).json({ error: 'Erro ao buscar dados do IPFS' });
  }
});
app.get('/postInfo/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const postInfoResult = await posts.getPostDataByCID(userId);
    if (postInfoResult.success) {
      console.log('Informações do post:', postInfoResult.postData);
      res.json(postInfoResult.postData);
    } else {
      console.log(`Erro ao buscar informações do post para o usuário ${userId}.`);
      res.status(404).json({ success: false, message: `Erro ao buscar informações do post para o usuário ${userId}.` });
    }
  } catch (error) {
    console.error('Erro na rota /postInfo:', error);
    res.status(500).json({ success: false, message: 'Erro na rota.' });
  }
});
app.get('/videoPosts', async (req, res) => {
  try {
      // Chama a função processVideoPostsFromIPFS para buscar os dados de vídeo dos posts no IPFS
      const videoPostsResult = await posts.processVideoPostsFromIPFS();
      
      // Verifica se a operação foi bem-sucedida
      if (videoPostsResult.success) {
          console.log('Dados de vídeos dos posts encontrados:', videoPostsResult.ipfsData);
          // Retorna os dados dos posts de vídeo encontrados como uma resposta JSON
          res.json(videoPostsResult.ipfsData);
      } else {
          console.log('Erro ao buscar dados de vídeos dos posts.');
          res.status(404).json({ success: false, message: 'Erro ao buscar dados de vídeos dos posts.' });
      }
  } catch (error) {
      console.error('Erro na rota /videoPosts:', error);
      // Retorna uma resposta de erro com o código de status 500
      res.status(500).json({ success: false, message: 'Erro na rota.' });
  }
});

app.get('/postInfoByRandomCID/:randomCID', async (req, res) => {
  try {
    const { randomCID } = req.params;

    // Verifique se o randomCID foi fornecido e não é uma string vazia
    if (!randomCID || typeof randomCID !== 'string') {
      console.error('O parâmetro randomCID não foi fornecido ou é inválido.');
      return res.status(400).json({ success: false, message: 'O parâmetro randomCID é obrigatório e deve ser uma string.' });
    }

    console.log('RandomCID recebido:', randomCID);

    // Chame a função que obtém os posts com base no randomCID
    const commentContentList = await posts.getPostsByRandomCID(randomCID);
    console.log('Conteúdo do comentário com base no randomCID:', commentContentList);

    // Chame a função que obtém os dados do IPFS para os CIDs dos posts
    const ipfsDataList = await posts.getPostDataFromIPFSList(commentContentList);
    console.log('Dados do IPFS para os CIDs dos posts:', ipfsDataList);

    // Envie um objeto JSON chamado 'ipfsDataList'
    res.json({ ipfsDataList });
  } catch (error) {
    console.error('Erro na rota /postInfoByRandomCID:', error);
    res.status(500).json({ success: false, message: 'Erro na rota.' });
  }
});
app.get('/user/wallet', async (req, res) => {
  try {
      const currentUserWalletAddress = req.query.currentUserWalletAddress;

      console.log('currentUserWalletAddress:', currentUserWalletAddress);

      // Consulta o cachedWalletAddresses para obter o userId correspondente ao currentUserWalletAddress
      const userId = Object.keys(cachedWalletAddresses).find(key => cachedWalletAddresses[key] === currentUserWalletAddress);

      console.log('userId:', userId);

      if (!userId) {
          console.error('Nenhum usuário encontrado para o endereço da carteira atual.');
          return res.status(500).json({ error: 'Nenhum usuário encontrado para o endereço da carteira atual.' });
      }

      // Obtém os dados de follow correspondentes ao currentUserWalletAddress
      const postDataWalletAddress = await users.findFollowData(currentUserWalletAddress);

      console.log('postDataWalletAddress:', postDataWalletAddress);

      if (!postDataWalletAddress) {
          console.error('Nenhum dado de follow encontrado para o usuário.');
          return res.status(500).json({ error: 'Nenhum dado de follow encontrado para o usuário.' });
      }

      // Chama a função getCIDsAndFetchFromIPFS com o postDataWalletAddress e o userId correspondente
      const ipfsDataResult = await posts.getCIDsAndFetchFromIPFS(postDataWalletAddress, userId);

      if (ipfsDataResult.success) {
          const ipfsData = ipfsDataResult.ipfsData;

          console.log('Dados do IPFS recuperados com sucesso:', ipfsData);

          // Retorna os dados processados como resposta
          return res.json({ success: true, ipfsData });
      } else {
          console.error('Erro ao buscar ou processar os dados do IPFS.');
          return res.status(500).json({ error: 'Erro ao buscar ou processar os dados do IPFS.' });
      }
  } catch (error) {
      console.error('Erro ao obter os dados do usuário ou seguir:', error);
      return res.status(500).json({ error: 'Erro ao obter os dados do usuário ou seguir' });
  }
});

// Rota para receber um arquivo de vídeo
app.post('/upload-video', upload.single('file'), async (req, res) => {
  try {
      const file = req.file;

      console.log('Requisição recebida em /upload-video');
      console.log('req.file:', req.file);
      
      // Verifica se um arquivo foi enviado
      if (!req.file) {
          return res.status(400).json({ success: false, message: 'Nenhum arquivo recebido.' });
      }

      // Adiciona o arquivo ao IPFS
      const cid = await posts.addFileToIPFS(file.buffer, file.originalname);

      // Imprime o CID no console
      console.log('CID do vídeo adicionado ao IPFS:', cid);

      // Retorna o CID do vídeo adicionado ao IPFS
      res.json({ success: true, cid });
  } catch (error) {
      console.error('Erro ao processar o arquivo de vídeo:', error);
      res.status(500).json({ success: false, message: 'Erro ao processar o arquivo de vídeo.' });
  }
});


wss.on('connection', (clientWs) => {
  ws = clientWs;
  console.log('Conexão WebSocket estabelecida com sucesso');

  ws.on('message', async (message) => {
    const data = JSON.parse(message);
    const { characters, endereco_carteira } = data || {};

    console.log('Caracteres e Endereço da Carteira recebidos na rota WebSocket:', characters, endereco_carteira);

    if (ws.readyState === WebSocket.OPEN) {
      console.log('Estado do WebSocket: Aberto');
      if (characters !== undefined) {
        try {
          const result = await users.findUserByCharacters(characters, endereco_carteira);

          console.log('Usuário encontrado no MongoDB:', result);

          if (result && result.user && result.user.cid) {
            const photoContent = await users.getRawDataFromIPFS(result.user.cid);
            console.log('Conteúdo da foto do usuário:', photoContent);

            if (photoContent && photoContent.name && photoContent.photo) {
              // Envie o nome, a foto e o endereco_carteira quando a conexão é estabelecida
              ws.send(JSON.stringify({
                success: true,
                name: photoContent.name,
                photo: photoContent.photo,
                endereco_carteira: result.user.endereco_carteira
              }));
            } else {
              console.error('Dados do usuário incompletos.');
              sendWebSocketData(ws, { success: false, message: 'Dados do usuário incompletos.' });
            }
          } else {
            console.error('CID do usuário não encontrado.');
            sendWebSocketData(ws, { success: false, message: 'CID do usuário não encontrado.' });
          }
        } catch (error) {
          console.error('Erro na operação do WebSocket:', error);
          sendWebSocketData(ws, { success: false, message: 'Erro ao verificar o usuário.', error: error.message });
        }
      } else {
        sendWebSocketData(ws, { success: false, message: 'Nenhum caractere fornecido para busca.' });
      }
    } else {
      console.log('Estado do WebSocket: Não está aberto');
      sendWebSocketData(ws, { success: false, message: 'Erro ao verificar o usuário: WebSocket não está aberto.' });
    }
  });
});

const port = 5555;

server.listen(port,  () => {
  console.log(`Servidor iniciado no endereço e porta ${port}`);
});