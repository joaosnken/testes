document.addEventListener('DOMContentLoaded', async function () {
  // Obtém os parâmetros da URL
  const urlParams = new URLSearchParams(window.location.search);

  const walletAddress = urlParams.get('walletAddress');
  const userId = urlParams.get('userId');
  
  // Obter mywalletAddressOwner e mycid da URL
  const mywalletAddressOwner = urlParams.get('mywalletAddressOwner');
  const mycid2 = urlParams.get('mycid');
  
  // Atribui o valor de mywalletAddressOwner à variável mywalletAddress
  const mywalletAddress = mywalletAddressOwner;
  
  // Atribui o valor de mycid à variável usercid
  const usercid = mycid2;
  // Obter isDarkMode da URL e exibir no console
  const isDarkMode = urlParams.get('isDarkMode');
  console.log('isDarkMode:', isDarkMode);

  // Convertendo isDarkMode para booleano para uso posterior, se necessário
  const isDarkModeBoolean = isDarkMode === 'true';
  console.log('isDarkMode Boolean:', isDarkModeBoolean);

  // Toggle da classe dark-mode no corpo do documento baseado no valor de isDarkModeBoolean
  if (isDarkModeBoolean) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }

  // Exibe os valores de walletAddress, mywalletAddressOwner, mycid e userId no console
  console.log('Endereço da carteira do usuário:', walletAddress);
  console.log('Endereço da minha carteira:', mywalletAddressOwner);
  console.log('CID:', usercid);
  console.log('ID do usuário:', userId);
  
  // Remove mywalletAddressOwner, mycid, walletAddress e userId da URL sem recarregar a página
  if (mywalletAddressOwner || mycid || userId || walletAddress) {
      const newURL = window.location.href.split('?')[0]; // Obtém a URL sem a parte do query string
      history.replaceState({}, document.title, newURL); // Substitui a URL atual sem mywalletAddressOwner, mycid, walletAddress e userId
  }
  // Verifica se a URL contém 'perfil.html'
  if (window.location.pathname.includes('perfil.html')) {
        // Remove 'perfil.html' da URL
        const newUrl = window.location.protocol + "//" + window.location.host;
        history.pushState({ path: newUrl }, '', newUrl);
    }

  // Armazena walletAddress e userId em variáveis para uso futuro
  const userWallet = walletAddress;
  const userID = userId;
  console.log('WalletAddress salvo em variável:', userWallet);
  console.log('WalletAddress salvo em variável:', usercid);
  let mycid = {}; // Declare a variável mycid globalmente para que ela possa ser acessada em diferentes partes do código

  const wrapper = document.querySelector('.wrapper');
  let backImageSrc = ''; // Variável global para armazenar a imagem
  const textarea = document.getElementById('post-input');
  let userName = ''; // Variável global para armazenar o nome do usuário
  // Seleciona a div following
  const followingBox = document.getElementById('following-box');
  const searchInput = document.getElementById('search-input');
  const followingSection = document.getElementById('following-section');
  const followersBox = document.getElementById('followers-box');
  const followButton1 = document.querySelector('.followButton1');
  const shareButtonDiv = document.querySelector('.share-button');

  const searchInput2 = document.getElementById('search-input2');
  const miniBox2 = document.getElementById('mini-box2');
  let blockPublicationCopy = false;

  let isFetchDisabled = false;




  let followersData = []; // Variável para armazenar os dados dos seguidores
  // Variável global para armazenar o walletAddress
  let cachedWalletAddress = null;

  // Seleciona o mini-box
  const miniBox = document.getElementById('mini-box');
  // Declara uma variável fora da função para armazenar os dados recebidos
  // Declara uma variável fora da função para armazenar os dados recebidos
    // Declara uma variável fora da função para armazenar os dados recebidos
  let receivedData = [];

  // Defina firstCallCompleted como true após a primeira chamada bem-sucedida
  firstCallCompleted = true;

  let page = 1; // Variável para controlar a página de dados a ser buscada
  let fetchCount = 0; // Contador para contar o número de vezes que fetchUserInfotimeline é chamada
  let publicationCopyClicked = false;
  let firstPublicationAdded = false; // Variável de controle para verificar se a primeira cópia foi adicionada
  let comment = false;
  document.getElementById('followButton1').addEventListener('click', async function() {
    // Atribuindo as variáveis necessárias
    const currentUserWalletAddress = mywalletAddressOwner;
    const postDataWalletAddress = walletAddress;

    // Construindo a URL de requisição
    const createPostUrl = 'https://apifralishub.online/users/follow';
    console.log('Enviando solicitação para:', createPostUrl);

    try {
        // Enviando a solicitação POST
        const response = await axios.post(createPostUrl, {
            currentUserWalletAddress,
            postDataWalletAddress,
        });

        if (response.status === 200) {
            console.log('Solicitação enviada com sucesso:', response.data);
        } else {
            console.error('Erro ao enviar a solicitação:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('Erro ao enviar a solicitação:', error);
    }
  });

  // Função para criar uma cópia da div de publicação
  async function createPublicationCopy(data) {
    const publicationDivTemplate = document.querySelector('.publication');

    if (!publicationDivTemplate) {
      console.error('Elemento não encontrado para criar cópia da publicação.');
      return;
    }

    // Cria uma cópia da div .publication
    const publicationCopy = publicationDivTemplate.cloneNode(true);
    // Remove o display: none do botão de like
    const likeButton = publicationCopy.querySelector('#likeButton');
    const botaoComment = publicationCopy.querySelector('.botao-comment');

    // Chama a rota countLikes com o randomCID e atualiza o número recebido
    (async () => {
        try {
            // Obter randomCID diretamente de data.randomCID
            const randomCID = data.cid;
            console.log('RandomCID da postagem comentada:', randomCID);

            // Chama a rota '/countLikes' para obter o número de likes associados ao randomCID
            const countLikesUrl = `https://apifralishub.online/countLikes?randomCID=${randomCID}`; // Endereço correto
            const countLikesResponse = await fetch(countLikesUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (countLikesResponse.ok) {
                const response = await countLikesResponse.json();
                const likeCount = response.count;
                console.log(`Número de likes associados ao CID ${randomCID}: ${likeCount}`);

                // Seleciona o elemento com a classe "likeCounter" dentro do botão clicado
                const likeCounterSpan = likeButton.querySelector('.likeCounter');
                console.log('Elemento likeCounterSpan:', likeCounterSpan); // Log para verificar se o elemento foi selecionado

                // Atualiza o conteúdo do elemento para exibir o número de likes recebidos
                if (likeCounterSpan) {
                    likeCounterSpan.textContent = likeCount;
                    console.log('Conteúdo do likeCounterSpan atualizado para:', likeCounterSpan.textContent); // Log para verificar a atualização

                    // Altera o ID do likeCounterSpan para evitar conflitos
                    likeCounterSpan.id = `likeCounter-${randomCID}`;
                } else {
                    console.error('Elemento likeCounterSpan não encontrado.');
                }
            } else {
                console.error('Erro ao buscar o número de likes associados ao random CID:', countLikesResponse.statusText);
            }
        } catch (error) {
            console.error('Erro ao processar o random CID:', error);
        }
    })();
    // Obter o randomCID diretamente dos dados
    const randomCID = data.cid;

    console.log('RandomCID of the commented post:', randomCID);

    // Função auto-executável para buscar comentários
    (async () => {
        try {
            // Chama a rota '/processCID' para obter o número de comentários associados ao random CID
            const processCIDUrl = 'https://apifralishub.online/processCID'; // Caminho atualizado
            const processCIDResponse = await fetch(processCIDUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ cid: randomCID }),
            });

            if (processCIDResponse.ok) {
                const result = await processCIDResponse.json();
                const commentCount = result.commentCount;
                console.log(`Number of comments associated with CID ${randomCID}: ${commentCount}`);
                // Agora você pode usar a contagem de comentários conforme necessário

                // Atualiza a contagem de comentários na div .comments-share
                const commentsShareDiv = publicationCopy.querySelector('.comments-share');
                if (commentsShareDiv) {
                    commentsShareDiv.innerHTML = `<span>Comments:</span><span>${commentCount}</span>`;
                } else {
                    console.error('Div .comments-share not found.');
                }
            } else {
                console.error('Error fetching the number of comments associated with the random CID:', processCIDResponse.statusText);
            }
        } catch (error) {
            console.error('Error processing the random CID:', error);
        }
    })();
    // Preenche elementos conforme necessário
    const textSpan = publicationCopy.querySelector('.text-post span');
    if (textSpan) {
      textSpan.textContent = data.textContent || ''; // Preenche o texto do post
    }

    const authorSpan = publicationCopy.querySelector('.author-post span');
    if (authorSpan) {
      authorSpan.textContent = data.name || ''; // Preenche o nome do autor
    }
    // Remova a div image-post apenas para a cópia criada dentro do evento de clique
    const imagePostDiv = publicationCopy.querySelector('.image-post');
    if (imagePostDiv && this === publicationCopy) {
        imagePostDiv.remove();
    }
    const imagePostElement = publicationCopy.querySelector('#image-post');
    imagePostElement.innerHTML = '';
    const mediaBase64 = data.media;
    console.log('Conteúdo base64 da mídia obtido:', mediaBase64);

    imagePostElement.innerHTML = '';
    // Verificar se há mídia e se é um objeto JSON
    if (typeof data.media === 'object' && data.media !== null) {
        // Verificar se a propriedade 'cid' contém o CID
        if (typeof data.media.cid === 'string' && data.media.cid.length > 0) {
        // Log para verificar se a rota está sendo chamada
        console.log(`Chamando a rota https://apifralishub.online/ipfs/${data.media.cid}`);
        
        // Obter a URL do IPFS usando o CID
        const ipfsUrl = `https://apifralishub.online/ipfs/${data.media.cid}`;
        
        // Selecionar a div onde o conteúdo será exibido
        imagePostElement.innerHTML = '';  // Limpar o conteúdo anterior
    
        // Obter o conteúdo do IPFS
        fetch(ipfsUrl)
            .then(response => response.blob())
            .then(blob => {
            // Criar um objeto URL a partir do Blob
            const blobUrl = URL.createObjectURL(blob);
    
            // Verificar se é uma imagem ou vídeo (supondo que o tipo é conhecido)
            const contentType = blob.type;
            if (contentType.startsWith('image/')) {
                // Criar elemento de imagem
                const imgElement = document.createElement('img');
                imgElement.src = blobUrl;
                imgElement.className = 'img-post';
                const squareSize = 300;
                imgElement.style.width = `${squareSize}px`;
                imgElement.style.height = `${squareSize}px`;
                imgElement.style.objectFit = 'cover';
                imgElement.style.objectPosition = 'center';
                imagePostElement.style.display = 'flex';
                imagePostElement.style.alignItems = 'center';
                imagePostElement.style.justifyContent = 'center';
                imagePostElement.appendChild(imgElement);
            } else if (contentType.startsWith('video/')) {
                // Criar elemento de vídeo
                const videoElement = document.createElement('video');
                videoElement.controls = true;
                videoElement.className = 'video-post';
                videoElement.src = blobUrl;
                videoElement.style.width = '100%';
                videoElement.style.height = '100%';
                videoElement.style.objectFit = 'cover';
                imagePostElement.style.display = 'flex';
                imagePostElement.style.alignItems = 'center';
                imagePostElement.style.justifyContent = 'center';
                imagePostElement.appendChild(videoElement);
            } else {
                console.error('Tipo de mídia não reconhecido.');
            }
            })
            .catch(error => {
            console.error('Erro ao obter o arquivo do IPFS:', error);
            });
        } else {
        console.error('CID da mídia não é válido ou está ausente.');
        }
    } else {
        console.error('Conteúdo da mídia inválido ou indefinido.');
    }

    const profileImage = data.profileImage;
    if (profileImage) {
      console.log('Imagem de perfil recebida:', profileImage);
      const profileImageElement = publicationCopy.querySelector('#perfil-image');
      profileImageElement.src = profileImage;
      profileImageElement.className = 'perfil-image';
    }

    // Adiciona uma classe à div image-post para estilos específicos
    imagePostElement.classList.add('media-container');

    // Ajusta a largura da cópia da publicação conforme necessário
    publicationCopy.style.maxWidth = '600px'; // Defina a largura máxima desejada
    publicationCopy.style.marginBottom = '60px'; // Adiciona margem inferior para separar os posts
    publicationCopy.style.overflow = 'hidden'; // Esconde qualquer conteúdo extra que ultrapasse os limites

    // Adiciona margin-top apenas na primeira cópia
    if (!firstPublicationAdded) {
      publicationCopy.style.marginTop = '300px'; // Adiciona margin-top na primeira cópia
      firstPublicationAdded = true; // Define que a primeira cópia foi adicionada
    }
    
    // Remove o estilo display: none
    publicationCopy.style.display = "";

    // Insere a cópia da publicação diretamente abaixo da última publicação existente,
    // sem adicionar espaço extra
    document.body.appendChild(publicationCopy);
    // Adicione um event listener para o clique no botão de like
    likeButton.addEventListener('click', async function (event) {
        blockPublicationCopy = true;

        try {
            console.log('Botão de like clicado!');

            const randomCID = data.cid;
            console.log('RandomCID do post comentado:', randomCID);

            const response = await axios.get(`https://apifralishub.online/updateLikeCounter?randomCID=${randomCID}&walletAddress=${mywalletAddress}`);

            if (response.data.success) {
                console.log('Botão Like clicado');
                console.log('Número de likes atualizado:', response.data.count);

                // Seleciona o elemento com a classe "likeCounter" para exibir o número de likes
                const likeCounterSpan = likeButton.querySelector('.likeCounter');
                console.log('likeCounterSpan:', likeCounterSpan);

                 // Atualiza o conteúdo do elemento para exibir o número de likes recebidos
                 if (likeCounterSpan) {
                    likeCounterSpan.textContent = response.data.count;
                    console.log('Conteúdo do likeCounterSpan atualizado para:', likeCounterSpan.textContent); // Log para verificar a atualização

                    // Altera o ID do likeCounterSpan para evitar conflitos
                    likeCounterSpan.id = `likeCounter-${randomCID}`;
                } else {
                    console.error('Elemento likeCounterSpan não encontrado.');
                }

                // Alterna a classe 'liked' no botão clicado
                likeButton.querySelector('.heart-btn').classList.toggle('liked');
            } else {
                console.error('Erro ao processar o clique no botão de like:', response.data.message);
            }
        } catch (error) {
            console.error('Erro ao processar o clique no botão de like:', error);
        }
    });

    // Exemplo de como configurar a variável clickedByshareButton ao clicar no shareButton
    shareButtonDiv.addEventListener('click', async function() {
      blockPublicationCopy = true;
      const minibox = document.getElementById('minibox');
        minibox.classList.remove('hidden');



        // Verifica se o Ethereum está disponível no navegador
        if (typeof window.ethereum !== 'undefined') {
            try {
                // Verifica se o MetaMask está instalado
                if (!window.ethereum.isMetaMask) {
                    console.error('MetaMask não encontrado. Por favor, instale o MetaMask.');
                    return;
                }

                // Obtém o endereço da carteira do usuário
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                const walletAddress = accounts[0];
                console.log('Conexão com o MetaMask estabelecida. Endereço da carteira:', walletAddress);

                // Verifica se o usuário está conectado à rede Matic
                const chainId = await window.ethereum.request({ method: 'eth_chainId' });
                const maticChainId = '0x89'; // ID da rede Matic

                if (chainId !== maticChainId) {
                    try {
                        // Solicita a troca para a rede Matic
                        await window.ethereum.request({
                            method: 'wallet_switchEthereumChain',
                            params: [{ chainId: maticChainId }],
                        });
                        console.log('Usuário conectado à rede Matic.');
                    } catch (switchError) {
                        // Se a rede Matic não estiver disponível no MetaMask, solicite a adição
                        if (switchError.code === 4902) {
                            try {
                                await window.ethereum.request({
                                    method: 'wallet_addEthereumChain',
                                    params: [
                                        {
                                            chainId: maticChainId,
                                            chainName: 'Matic Mainnet',
                                            rpcUrls: ['https://rpc-mainnet.matic.network/'],
                                            nativeCurrency: {
                                                name: 'MATIC',
                                                symbol: 'MATIC',
                                                decimals: 18,
                                            },
                                            blockExplorerUrls: ['https://explorer.matic.network/'],
                                        },
                                    ],
                                });
                                console.log('Rede Matic adicionada e usuário conectado.');
                            } catch (addError) {
                                console.error('Erro ao adicionar a rede Matic:', addError);
                                return;
                            }
                        } else {
                            console.error('Erro ao trocar para a rede Matic:', switchError);
                            return;
                        }
                    }
                } else {
                    console.log('Usuário já está conectado à rede Matic.');
                }
            } catch (error) {
                console.error('Erro ao conectar-se ao MetaMask:', error);
            }
        } else {
            // MetaMask não encontrado, avise o usuário para instalá-lo
            console.error('MetaMask não encontrado. Por favor, instale o MetaMask.');
        }
    });

    document.getElementById('submitMaticButton').addEventListener('click', async function() {
        const maticAmountInput = document.getElementById('maticAmount').value;

        if (!maticAmountInput) {
            console.log('Nenhuma entrada foi inserida. A doação foi cancelada.');
            return;
        }

        // Converte a entrada do usuário em quantidade de Matic e valor da transação
        let amountInMATICInteger;
        if (maticAmountInput.length === 1) {
            // Se a entrada tiver 1 dígito, faz a conversão com 15 caracteres
            amountInMATICInteger = parseFloat(maticAmountInput) * 10**15;
        } else if (maticAmountInput.length <= 2) {
            // Se a entrada tiver 2 dígitos, faz a conversão com 16 caracteres
            amountInMATICInteger = parseFloat(maticAmountInput) * 11**14.2;
        } else {
            // Se a entrada tiver mais de 2 dígitos, faz a conversão com 17 caracteres
            amountInMATICInteger = parseFloat(maticAmountInput) * 11**14.1729;
        }

        console.log(`Quantidade em MATIC (convertida): ${amountInMATICInteger}`);

        // Verifica se o valor inserido é válido
        if (isNaN(amountInMATICInteger) || amountInMATICInteger <= 0) {
            console.log('O valor inserido não é válido. A doação foi cancelada.');
            return;
        }

        // Defina a ABI do contrato
        const abi = [
            {
                "inputs": [
                    {
                        "internalType": "address",
                        "name": "recipient",
                        "type": "address"
                    }
                ],
                "name": "donateMATIC",
                "outputs": [],
                "stateMutability": "payable",
                "type": "function"
            },
            {
                "inputs": [],
                "stateMutability": "nonpayable",
                "type": "constructor"
            },
            {
                "anonymous": false,
                "inputs": [
                    {
                        "indexed": true,
                        "internalType": "address",
                        "name": "from",
                        "type": "address"
                    },
                    {
                        "indexed": false,
                        "internalType": "uint256",
                        "name": "value",
                        "type": "uint256"
                    },
                    {
                        "indexed": true,
                        "internalType": "address",
                        "name": "recipient",
                        "type": "address"
                    },
                    {
                        "indexed": true,
                        "internalType": "address",
                        "name": "token",
                        "type": "address"
                    }
                ],
                "name": "Donation",
                "type": "event"
            },
            {
                "inputs": [],
                "name": "ownerPercentage",
                "outputs": [
                    {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            }
        ];

        // Defina o endereço do contrato
        const contractAddress = "0x549BC1EA1928D6AC46F83E7907f42F5A8eE161dA";

        // Cria uma instância do contrato usando o objeto web3 do MetaMask
        const web3 = new Web3(window.ethereum);
        const contract = new web3.eth.Contract(abi, contractAddress);

        const walletAddress1 = data.walletAddress; // Endereço da carteira associado à publicação
        console.log('Endereço da carteira associado à publicação:', walletAddress1);

        // Define os parâmetros da transação
        const transactionParameters = {
            from: walletAddress, // Endereço do remetente
            to: contractAddress,
            gas: '50000', // Define o limite de gás
            data: web3.eth.abi.encodeFunctionCall({
                name: 'donateMATIC',
                type: 'function',
                inputs: [{
                    type: 'address',
                    name: 'recipient'
                }]
            }, [walletAddress1]),
            value: amountInMATICInteger.toString(), // Define o valor da transação
        };

        // Abre a tela de transação do MetaMask
        try {
            await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [transactionParameters]
            });

            console.log('Aguardando a confirmação da transação.');

            // Obtém os valores relevantes do contrato após a transação
            const ownerPercentage = await contract.methods.ownerPercentage().call();
            const recipientOfOwnerPercentage = await contract.methods.recipientOfOwnerPercentage().call();

            console.log('Percentual do proprietário:', ownerPercentage);
            console.log('Destinatário do percentual do proprietário:', recipientOfOwnerPercentage);
        } catch (error) {
            console.error('Erro ao enviar a transação:', error);
        }
    });
    botaoComment.addEventListener('click', async function (event) {
        try {
            blockPublicationCopy = true;
    
            const randomCID = data.cid;
    
            // Fetch user CID data
            await fetchUsercid(usercid);
    
            // Verifica se já existe um comment-container ativo
            const existingCommentContainer = document.querySelector('.comment-container-copy');
            if (existingCommentContainer) {
                // Se já houver um container, ocultá-lo e não criar um novo
                existingCommentContainer.style.display = 'none';
                return;
            }
    
            // Procura pelo elemento #comment-container original
            const commentContainerTemplate = document.querySelector('#comment-container');
    
            if (commentContainerTemplate) {
                // Cria uma cópia do comment-container
                const commentContainerCopy = commentContainerTemplate.cloneNode(true);
                // Adiciona uma classe para identificar a cópia
                commentContainerCopy.classList.add('comment-container-copy');
                // Exibe a cópia do comment-container
                commentContainerCopy.style.display = 'block';
    
                // Configura eventos de textarea para o novo comentário
                const textarea = commentContainerCopy.querySelector('textarea');
                setupTextareaEvents(textarea);
    
                // Adiciona a cópia após a publicationDiv
                const publicationDivTemplate = event.target.closest('.publication');
                if (publicationDivTemplate) {
                    publicationDivTemplate.parentNode.insertBefore(commentContainerCopy, publicationDivTemplate.nextSibling);
                } else {
                    console.error('Não foi possível encontrar a div de publicação clicada.');
                    return;
                }
    
                // Atualiza a imagem do perfil no novo comentário
                const profileImage2 = commentContainerCopy.querySelector('#profile-image2');
                if (profileImage2) {
                    console.log('profileImage2 found');
                    if (mycid.photo) {
                        console.log('mycid.photo:', mycid.photo);
                        profileImage2.src = mycid.photo;
                    } else {
                        console.log('mycid.photo not found');
                    }
                } else {
                    console.log('profileImage2 not found');
                }
    
                // Atualiza o título do usuário no comment-container
                const userNameElement = commentContainerCopy.querySelector('.name .title');
                if (userNameElement) {
                    userNameElement.textContent = userName;
                }
    
                // Evento de clique no botão de envio dentro do comment-container
                const enviaComentarioButton = commentContainerCopy.querySelector('#envia-button');
                console.log("Envia comentário button:", enviaComentarioButton); // Adiciona um log para verificar se o botão foi encontrado
    
                // Verificar se o botão foi encontrado corretamente
                if (enviaComentarioButton) {
                    console.log("Botão encontrado!");
                } else {
                    console.log("Botão não encontrado!");
                }
    
                enviaComentarioButton.addEventListener('click', async () => {
                    try {
                        console.log("Botão de envio clicado!"); // Adiciona um log para verificar se o evento está sendo ativado
                        // Use postInput.value para o campo textContent
                        const postInput = commentContainerCopy.querySelector('#post-input');
                        console.log("Valor do campo de texto:", postInput.value); // Adiciona um log para verificar o valor do campo de texto
    
                        const commentData = {
                            userWallet: mywalletAddress,
                            name: mycid.name, // Pegando o nome do objeto name dentro de mycid
                            textContent: postInput.value,
                            profileImage: mycid.photo, // Pegando a imagem do mycid
                            randomCID,
                        };
    
                        console.log('Dados do comentário a serem enviados:', commentData);
    
                        // Enviar os dados do comentário para a rota createComment usando fetch
                        const createCommentUrl = 'https://apifralishub.online/createComment';
                        const createCommentResponse = await fetch(createCommentUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(commentData),
                        });
    
                        // Verificar a resposta da rota createComment
                        if (createCommentResponse.ok) {
                            // Adicionar um console.log para indicar que o comentário foi enviado com sucesso
                            console.log('Comentário enviado com sucesso!');
    
                            // Limpar o campo de texto
                            postInput.value = '';
    
                            // Esconder a div comment-container
                            commentContainerCopy.style.display = 'none';
                        } else {
                            // Adicionar lógica para lidar com erros na resposta da rota createComment
                            const errorMessage = await createCommentResponse.text();
                            console.error('Erro ao enviar o comentário. Resposta:', errorMessage);
                        }
                    } catch (error) {
                        console.error('Erro ao processar o comentário:', error);
                    }
                });
            } else {
                console.error('A div #comment-container não foi encontrada.');
            }
    
            event.stopPropagation();
        } catch (error) {
            console.error('Erro ao adicionar o comentário:', error);
        }
    });
    
    let isFetchDisabled = false;
 
    // Adicione um event listener para o clique na publicationCopy
    publicationCopy.addEventListener('click', async function(event) {
        if (blockPublicationCopy) {
            blockPublicationCopy = false; // Reseta a variável
            return; // Interrompe a execução se o botão de compartilhamento foi clicado
        }
        isFetchDisabled = true;
        window.removeEventListener('scroll', fetchUserInfotimeline);
        console.log("fetchUserInfotimeline foi desativado no scroll");
        
      
    

      // Verifica se a publicationCopy já foi clicada anteriormente ou se um comentário já foi ativado
      if (publicationCopyClicked || comment) {
          return; // Sai da função se a publicationCopy já foi clicada anteriormente
      }

      // Copia todas as divs com a classe 'publication' presentes na tela
      const allPublicationsOnScreen = document.querySelectorAll('.publication');
      const publicationsHTML = [];

      allPublicationsOnScreen.forEach(publication => {
          const publicationHTML = publication.outerHTML;
          publicationsHTML.push(publicationHTML);
      });

      // Armazena os dados em uma variável
      let publicationsCache = localStorage.getItem('publicationsCache');
      if (!publicationsCache) {
          publicationsCache = [];
      } else {
          publicationsCache = JSON.parse(publicationsCache);
      }

      // Adiciona as novas publicações aos dados em cache
      publicationsCache.push({ publications: publicationsHTML });

      // Define a flag de clique como true
      publicationCopyClicked = true;
      comment = true;
      console.log('Clique na publicationCopy');

      // Oculta todas as outras cópias das divs .publication
      const allPublications = document.querySelectorAll('.publication');
      allPublications.forEach(publication => {
          if (!publication.classList.contains('publication-copy')) {
              if (publication !== this) {
                  publication.style.display = 'none';
              } else {
                  // Remove o margin-top apenas da div clicada
                  publication.style.marginTop = '0';
              }
          }
      });

      // Exibe apenas a div .publication clicada
      this.style.display = 'block';

      // Mostra a div backButtonContainer dentro da div publication
      const backButtonContainer = this.querySelector('#backButtonContainer');
      if (backButtonContainer) {
          backButtonContainer.style.display = 'block';

          // Adiciona um evento de clique ao backButton
          const backButton = backButtonContainer.querySelector('#backButton');
          if (backButton) {
              backButton.addEventListener('click', backButtonClickHandler);
          }
      }

      // Oculta a div .wrapper
      const wrapperDiv = document.querySelector('.wrapper');
      wrapperDiv.style.display = 'none';

      // Captura a posição atual do scroll e a salva no cache
      const scrollPositionBeforeClick = window.scrollY || window.pageYOffset;
      localStorage.setItem('scrollPositionBeforeClick', scrollPositionBeforeClick);

      // Interrompe a função loadMorePostsIfNearBottom
      stopLoadMorePosts = true;
      // Desativa a função adjustWrapperVisibility
      adjustWrapperVisibilityActive = false;

      // Remova o evento de rolagem associado à função adjustWrapperVisibilityWithoutLoadMorePostsActivated
      window.removeEventListener('scroll', adjustWrapperVisibilityWithoutLoadMorePostsActivated);


      // Extrai o CID do objeto data da publicationCopy
      const randomCID = data.cid;
      console.log('CID do post comentado:', randomCID);

      // Chama a rota postInfoByRandomCID com o CID como randomCID
      const dataUrl = `https://apifralishub.online/postInfoByRandomCID/${randomCID}`;
      console.log(`Enviada solicitação para obter informações do post em: ${dataUrl}`);

      try {
          const response = await axios.get(dataUrl);
          const postDataList = response.data.ipfsDataList;
          console.log('Informações do post:', postDataList);
          document.querySelector('.follow').style.display = 'block'; // Alteração adicionada

          // Chama a função fetchUsercid para obter os dados do CID
          await fetchUsercid(usercid);

          // Cria uma cópia do comment-container
          const commentContainerTemplate = document.querySelector('#comment-container');
          if (commentContainerTemplate) {
              const commentContainerCopy = commentContainerTemplate.cloneNode(true);
              // Exibe a cópia do comment-container
              commentContainerCopy.style.display = 'block';

              // Configura eventos de textarea para o novo comentário
              const textarea = commentContainerCopy.querySelector('textarea');
              setupTextareaEvents(textarea);

              commentContainerCopy.style.marginTop = '50px'; // Ajuste o valor conforme necessário

              // Atualiza o título do usuário no comment-container com o nome do usuário global
              const userNameElement = commentContainerCopy.querySelector('.name .title');
              if (userNameElement) {
                  userNameElement.textContent = userName;
              }

              // Evento de clique no botão de envio dentro do comment-container with-video
              const enviaComentarioButton = commentContainerCopy.querySelector('#envia-button'); // Alterado para #envia-button
              console.log("Envia comentário button:", enviaComentarioButton); // Adiciona um log para verificar se o botão foi encontrado

              // Verificar se o botão foi encontrado corretamente
              if (enviaComentarioButton) {
                  console.log("Botão encontrado!");
              } else {
                  console.log("Botão não encontrado!");
              }

              enviaComentarioButton.addEventListener('click', async () => {
                  try {
                      console.log("Botão de envio clicado!"); // Adiciona um log para verificar se o evento está sendo ativado
                      // Use postInput.value para o campo textContent
                      const postInput = commentContainerCopy.querySelector('#post-input'); // Alterado para #post-input
                      console.log("Valor do campo de texto:", postInput.value); // Adiciona um log para verificar o valor do campo de texto

                      const commentData = {
                          userWallet: mywalletAddress,
                          name: mycid.name, // Pegando o nome do objeto name dentro de mycid
                          textContent: postInput.value,
                          profileImage: mycid.photo, // Pegando a imagem do mycid
                          randomCID,
                      };

                      console.log('Dados do comentário a serem enviados:', commentData);

                      // Enviar os dados do comentário para a rota createComment usando fetch
                      const createCommentUrl = 'https://apifralishub.online/createComment';
                      const createCommentResponse = await fetch(createCommentUrl, {
                          method: 'POST',
                          headers: {
                              'Content-Type': 'application/json',
                          },
                          body: JSON.stringify(commentData),
                      });

                      // Verificar a resposta da rota createComment
                      if (createCommentResponse.ok) {
                          // Adicionar um console.log para indicar que o comentário foi enviado com sucesso
                          console.log('Comentário enviado com sucesso!');
                            // Limpar o valor do postInput após o comentário ser enviado com sucesso
                            postInput.value = '';

                      } else {
                          // Adicionar lógica para lidar com erros na resposta da rota createComment
                          const errorMessage = await createCommentResponse.text();
                          console.error('Erro ao enviar o comentário. Resposta:', errorMessage);
                      }
                  } catch (error) {
                      console.error('Erro ao processar o comentário:', error);
                  }
              });

              // Insere a cópia do comment-container abaixo da div publication clicada
              const publicationDiv = document.querySelector('.publication'); // Alterado para document
              publicationDiv.parentNode.insertBefore(commentContainerCopy, publicationDiv.nextSibling);

              // Loop sobre os dados recebidos e cria uma cópia da publicação para cada objeto JSON
              postDataList.forEach(postData => {
                  // Cria a cópia da publicação e preenche os elementos com os valores do objeto postData
                  const publicationDivTemplate = document.querySelector('.publication');
                  if (!publicationDivTemplate) {
                      console.error('Elemento não encontrado para criar cópia da publicação.');
                      return;
                  }

                  // Cria uma cópia da div .publication
                  const publicationCopy = publicationDivTemplate.cloneNode(true);
                  // Adiciona uma classe especial para identificar esta cópia
                  publicationCopy.classList.add('publication-copy');

                  // Preenche elementos conforme necessário
                  const textSpan = publicationCopy.querySelector('.text-post span');
                  if (textSpan) {
                      textSpan.textContent = postData.textContent || ''; // Preenche o texto do post
                  }

                  const authorSpan = publicationCopy.querySelector('.author-post span');
                  if (authorSpan) {
                      authorSpan.textContent = postData.name || ''; // Preenche o nome do autor
                  }

                  const profileImage = postData.profileImage;
                  if (profileImage) {
                      console.log('Imagem de perfil recebida:', profileImage);
                      const profileImageElement = publicationCopy.querySelector('#perfil-image');
                      profileImageElement.src = profileImage;
                      profileImageElement.className = 'perfil-image';
                  }
                  // Ajusta a largura da cópia da publicação conforme necessário
                  publicationCopy.style.maxWidth = '520px'; // Defina a largura máxima desejada
                  publicationCopy.style.marginBottom = '20px'; // Adiciona margem inferior para separar os posts
                  publicationCopy.style.overflow = 'hidden'; // Esconde qualquer conteúdo extra que ultrapasse os limites

                  // Remove o estilo margin-top para posicionar a cópia no topo da tela
                  publicationCopy.style.marginTop = '0';

                  // Remove o estilo display: none
                  publicationCopy.style.display = "";

                  // Insere a cópia da publicação diretamente abaixo da última publicação existente,
                  // sem adicionar espaço extra
                  const lastPublication = document.querySelector('.publication:last-of-type');
                  if (lastPublication) {
                      lastPublication.parentNode.insertBefore(publicationCopy, lastPublication.nextSibling);
                  } else {
                      // Se não houver publicação existente, insere a cópia no início do documento
                      document.body.appendChild(publicationCopy);
                  }
                  // Adiciona o evento de clique ao botão de seguir (Follow)
                  const followButton = publicationCopy.querySelector('#followButton');
                  if (followButton) {
                      followButton.addEventListener('click', async () => {
                          try {
                              const walletAddress = postData.walletAddress;

                              // Verificar se o walletAddress foi capturado corretamente
                              console.log('Endereço da carteira:', walletAddress);

                              // Transformando o walletAddress recebido em postDataWalletAddress
                              const postDataWalletAddress = walletAddress;

                              // Renomeando a variável userWallet para currentUserWalletAddress
                              const currentUserWalletAddress = mywalletAddress;

                              // Chamar a função para seguir o usuário usando os endereços de carteira
                              await seguirUsuario(currentUserWalletAddress, postDataWalletAddress);

                              // Após a conclusão da operação, exibir mensagem de sucesso
                              console.log('Operação concluída com sucesso para o endereço:', postDataWalletAddress);
                          } catch (error) {
                              console.error('Erro ao processar o endereço da carteira:', error);
                          }
                      });
                  } else {
                      console.error('Botão de seguir (Follow) não encontrado na cópia da publicação.');
                  }
                  const likeButton = publicationCopy.querySelector('#likeButton');

                if (likeButton) {
                    likeButton.addEventListener('click', async function (event) {
                        blockPublicationCopy = true;

                        try {
                            console.log('Botão de like clicado!');

                            const randomCID = postData.cid;
                            console.log('RandomCID do post comentado:', randomCID);

                            const response = await axios.get(`https://apifralishub.online/updateLikeCounter?randomCID=${randomCID}&walletAddress=${mywalletAddress}`);

                            if (response.data.success) {
                                console.log('Botão Like clicado');
                                console.log('Número de likes atualizado:', response.data.count);

                                // Seleciona o elemento com a classe "likeCounter" para exibir o número de likes
                                const likeCounterSpan = likeButton.querySelector('.likeCounter');
                                console.log('likeCounterSpan:', likeCounterSpan);

                                // Atualiza o conteúdo do elemento para exibir o número de likes recebidos
                                if (likeCounterSpan) {
                                    likeCounterSpan.textContent = response.data.count;
                                    console.log('Conteúdo do likeCounterSpan atualizado para:', likeCounterSpan.textContent); // Log para verificar a atualização

                                    // Altera o ID do likeCounterSpan para evitar conflitos
                                    likeCounterSpan.id = `likeCounter-${randomCID}`;
                                } else {
                                    console.error('Elemento likeCounterSpan não encontrado.');
                                }

                                // Alterna a classe 'liked' no botão clicado
                                likeButton.querySelector('.heart-btn').classList.toggle('liked');
                            } else {
                                console.error('Erro ao processar o clique no botão de like:', response.data.message);
                            }
                        } catch (error) {
                            console.error('Erro ao processar o clique no botão de like:', error);
                        }
                    });
                } else {
                    console.error('Botão de like não encontrado na cópia da publicação.');
                }
                const donateButton = publicationCopy.querySelector('.donate');

                if (donateButton) {
                    donateButton.addEventListener('click', async function (event) {
                        blockPublicationCopy = true;
                        const minibox = document.getElementById('minibox');
                            minibox.classList.remove('hidden');



                            // Verifica se o Ethereum está disponível no navegador
                            if (typeof window.ethereum !== 'undefined') {
                                try {
                                    // Verifica se o MetaMask está instalado
                                    if (!window.ethereum.isMetaMask) {
                                        console.error('MetaMask não encontrado. Por favor, instale o MetaMask.');
                                        return;
                                    }

                                    // Obtém o endereço da carteira do usuário
                                    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                                    const walletAddress = accounts[0];
                                    console.log('Conexão com o MetaMask estabelecida. Endereço da carteira:', walletAddress);

                                    // Verifica se o usuário está conectado à rede Matic
                                    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
                                    const maticChainId = '0x89'; // ID da rede Matic

                                    if (chainId !== maticChainId) {
                                        try {
                                            // Solicita a troca para a rede Matic
                                            await window.ethereum.request({
                                                method: 'wallet_switchEthereumChain',
                                                params: [{ chainId: maticChainId }],
                                            });
                                            console.log('Usuário conectado à rede Matic.');
                                        } catch (switchError) {
                                            // Se a rede Matic não estiver disponível no MetaMask, solicite a adição
                                            if (switchError.code === 4902) {
                                                try {
                                                    await window.ethereum.request({
                                                        method: 'wallet_addEthereumChain',
                                                        params: [
                                                            {
                                                                chainId: maticChainId,
                                                                chainName: 'Matic Mainnet',
                                                                rpcUrls: ['https://rpc-mainnet.matic.network/'],
                                                                nativeCurrency: {
                                                                    name: 'MATIC',
                                                                    symbol: 'MATIC',
                                                                    decimals: 18,
                                                                },
                                                                blockExplorerUrls: ['https://explorer.matic.network/'],
                                                            },
                                                        ],
                                                    });
                                                    console.log('Rede Matic adicionada e usuário conectado.');
                                                } catch (addError) {
                                                    console.error('Erro ao adicionar a rede Matic:', addError);
                                                    return;
                                                }
                                            } else {
                                                console.error('Erro ao trocar para a rede Matic:', switchError);
                                                return;
                                            }
                                        }
                                    } else {
                                        console.log('Usuário já está conectado à rede Matic.');
                                    }
                                } catch (error) {
                                    console.error('Erro ao conectar-se ao MetaMask:', error);
                                }
                            } else {
                                // MetaMask não encontrado, avise o usuário para instalá-lo
                                console.error('MetaMask não encontrado. Por favor, instale o MetaMask.');
                            }
                    });
                } else {
                    console.error('Botão donate não encontrado na cópia da publicação.');
                }
                // Substituir a div .comment pela div .donate
                const commentDiv = publicationCopy.querySelector('.comment');
                const donateDiv = publicationCopy.querySelector('.donate');
                if (commentDiv && donateDiv) {
                    commentDiv.parentNode.replaceChild(donateDiv, commentDiv);
                    donateDiv.style.display = 'block';
                } else {
                    console.error('Elemento .comment ou .donate não encontrado na cópia da publicação.');
                }


                  // Rola para o topo da tela para mostrar a cópia da publicação clicada
                  window.scrollTo({
                      top: 0,
                      behavior: 'smooth'
                  });

              });
          }

      } catch (error) {
          console.error('Erro ao obter informações do post:', error);
      }
    });
     



  }
  // Função para buscar o CID usando mywalletAddress
  async function fetchUsercid(cid) {
    try {
      console.log('Iniciando fetchUsercid com cid:', cid);
      
      const apiUrl = `https://apifralishub.online/user/rawDataFromIPFS?cid=${cid}`;
      const response = await axios.get(apiUrl);
      console.log(`Enviada solicitação para obter informações do IPFS em: ${apiUrl}`);

      mycid = response.data; // Atribui a resposta à variável global mycid

      console.log('CID do IPFS:', mycid);

      // Chama a função para atualizar a imagem do perfil após obter os dados
      updateProfileImage();
    } catch (error) {
      console.error('Erro ao buscar informações do IPFS:', error);
    }
  }

  // Função para atualizar a imagem do perfil
  function updateProfileImage() {
    // Log para verificar o conteúdo de mycid
    console.log('mycid:', mycid);

    // Atualiza o profile-image2 no novo comentário
    const profileImage2 = document.querySelector('#profile-image2');
    if (profileImage2) {
      console.log('profileImage2 found');
      if (mycid.photo) {
        console.log('mycid.photo:', mycid.photo);
        profileImage2.src = mycid.photo;
      } else {
        console.log('mycid.photo not found');
      }
    } else {
      console.log('profileImage2 not found');
    }
  }


  // Adiciona um evento de clique à div followingBox
  followingBox.addEventListener('click', async () => {
    try {
        // Verifica se o mini-box está visível
        if (miniBox.style.display === 'block') {
            // Se estiver visível, oculta o mini-box
            miniBox.style.display = 'none';
        } else {
            // Se estiver oculto, exibe o mini-box
            miniBox.style.display = 'block';

            // Limpa a caixa de pesquisa quando a followingBox for clicada
            searchInput.value = '';

            // Atualize o conteúdo do mini-box com os dados recebidos
            const followingSection = document.getElementById('following-section');
            followingSection.innerHTML = ''; // Limpa o conteúdo anterior
            renderUsers(receivedData); // Exibe todos os usuários
        }
    } catch (error) {
        console.error('Erro ao exibir mini-box:', error);
    }
  });


  searchInput.addEventListener('input', () => {
      const searchTerm = searchInput.value.trim().toLowerCase(); // Obtém o termo de busca e converte para minúsculas
      followingSection.innerHTML = ''; // Limpa o conteúdo anterior

      if (searchTerm.length === 0) {
          // Se a caixa de pesquisa estiver vazia, exibir todos os usuários novamente
          renderUsers(receivedData);
      } else {
          // Filtrar receivedData com base no termo de busca
          const filteredData = receivedData.filter(data => data.name.toLowerCase().includes(searchTerm));
          renderUsers(filteredData);
      }
  });
  
    // Função para seguir o usuário usando Axios
    async function seguirUsuario(currentUserWalletAddress, postDataWalletAddress) {
      try {
      console.log('Tentativa de seguir o usuário iniciada...');
  
      // Exibindo detalhes dos endereços de carteira
      console.log('currentUserWalletAddress:', currentUserWalletAddress);
      console.log('postDataWalletAddress:', postDataWalletAddress);
  
      // Construindo a URL de requisição
      const createPostUrl = 'https://apifralishub.online/users/follow';
      console.log('Enviando solicitação para:', createPostUrl);
  
      // Enviando a solicitação POST
      const response = await axios.post(createPostUrl, {
          currentUserWalletAddress,
          postDataWalletAddress,
      });
  
      // Exibindo a resposta do servidor
      console.log('Resposta do servidor recebida:', response.data);
  
      
  
      // Faça algo com a resposta, se necessário
      // Por exemplo, verifique se há sucesso ou trate a resposta de acordo com a lógica do aplicativo
      } catch (error) {
      // Em caso de erro, exiba detalhes do erro
      console.error('Erro ao seguir o usuário:', error.message);
      }
  }

  function renderUsers(dataArray) {
      dataArray.forEach(data => {
          const nameSpan = document.createElement('span');
          nameSpan.textContent = data.name;

          const profileImage = document.createElement('img');
          profileImage.src = data.photo;
          profileImage.classList.add('perfil-image');

          const imageDiv = document.createElement('div');
          imageDiv.classList.add('image-perfil2');
          imageDiv.appendChild(profileImage);

          const walletSpan = document.createElement('span');
          const truncatedWallet = data.endereco_carteira.slice(0, 10); // Limite para 10 caracteres
          walletSpan.textContent = truncatedWallet;
          walletSpan.title = data.endereco_carteira; // Adiciona o endereço completo como título
          walletSpan.classList.add('user-wallet');
          walletSpan.style.fontSize = '10px'; // Define o tamanho da fonte

          const userContainer = document.createElement('div');
          userContainer.classList.add('user-container');
          userContainer.style.marginBottom = '10px'; // Adiciona espaço abaixo de cada usuário
          userContainer.appendChild(imageDiv);
          userContainer.appendChild(nameSpan);
          userContainer.appendChild(walletSpan);
          userContainer.addEventListener('click', async () => {
            try {
              // Verifica se o userId e o usercid estão definidos
              if (!userId || !mycid) {
                console.error('userId ou mycid não encontrado.');
                return;
              }

                // Faz uma requisição GET para a rota /user/perfil com os parâmetros walletAddress, userId, mycid, mywalletAddressOwner e isDarkMode
                const response = await axios.get(`https://apifralishub.online/user/perfilprofile`, {
                    params: {
                        walletAddress: data.endereco_carteira,
                        userId: userId,  // Inclui o userId nos parâmetros da requisição
                        mycid: usercid,  // Inclui o usercid nos parâmetros da requisição
                        mywalletAddressOwner: mywalletAddress, // Inclui o mywalletAddressOwner nos parâmetros da requisição
                        isDarkMode: isDarkModeBoolean // Inclui o isDarkMode nos parâmetros da requisição
                    }
                });
      
                if (response.status === 200) {
                    // Obtém a URL do servidor e redireciona para ela
                    const redirectTo = response.data.redirectTo;
                    window.location.href = redirectTo;
                } else {
                    console.error('Erro ao redirecionar para perfil.html');
                }
        } catch (error) {
              console.error('Erro ao enviar endereço da carteira, userId e usercid:', error);
            }
          });
      
        

          userContainer.addEventListener('mouseover', () => {
              userContainer.style.backgroundColor = 'lightgray';
          });

          userContainer.addEventListener('mouseleave', () => {
              userContainer.style.backgroundColor = '';
          });

          followingSection.appendChild(userContainer);
      });
    }
    

    // Adiciona um evento de clique à div followers-box
    followersBox.addEventListener('click', async (event) => {
      try {
          // Verifica se o mini-box está visível
          if (miniBox2.style.display === 'block') {
              // Se estiver visível, oculta o mini-box
              miniBox2.style.display = 'none';
          } else {
              // Se estiver oculto, exibe o mini-box
              miniBox2.style.display = 'block';

              // Limpa a caixa de pesquisa quando a followers-box for clicada
              searchInput2.value = '';
              
              

              // Atualize o conteúdo do mini-box com os dados recebidos
              const followers = document.getElementById('followers');
              followers.innerHTML = ''; // Limpa o conteúdo anterior

              // Atualize o conteúdo do mini-box com os dados recebidos
              renderUsers1(followersData); // Exibe todos os usuários
          }
          // Impede a propagação do evento para que não feche o mini-box imediatamente após ser aberto
          event.stopPropagation();
      } catch (error) {
          console.error('Erro ao exibir mini-box:', error);
      }
    });


    searchInput2.addEventListener('input', () => {
      const searchTerm = searchInput2.value.trim().toLowerCase(); // Obtém o termo de busca e converte para minúsculas
      followers.innerHTML = ''; // Limpa o conteúdo anterior

      if (searchTerm.length === 0) {
          // Se a caixa de pesquisa estiver vazia, exibir todos os usuários novamente
          renderUsers1(followersData);
      }else {
        // Filtrar receivedData com base no termo de busca
        const filteredData1 = followersData.filter(data => data.name.toLowerCase().includes(searchTerm));
        renderUsers1(filteredData1);
      } 
    });

    
  
    function renderUsers1(dataArray) {
      dataArray.forEach(data => {
          const nameSpan = document.createElement('span');
          nameSpan.textContent = data.name;

          const profileImage = document.createElement('img');
          profileImage.src = data.photo;
          profileImage.classList.add('perfil-image');

          const imageDiv = document.createElement('div');
          imageDiv.classList.add('image-perfil2');
          imageDiv.appendChild(profileImage);

          const walletSpan = document.createElement('span');
          const truncatedWallet = data.endereco_carteira.slice(0, 10); // Limite para 10 caracteres
          walletSpan.textContent = truncatedWallet;
          walletSpan.title = data.endereco_carteira; // Adiciona o endereço completo como título
          walletSpan.classList.add('user-wallet');
          walletSpan.style.fontSize = '10px'; // Define o tamanho da fonte

          const userContainer = document.createElement('div');
          userContainer.classList.add('user-container');
          userContainer.style.marginBottom = '10px'; // Adiciona espaço abaixo de cada usuário
          userContainer.appendChild(imageDiv);
          userContainer.appendChild(nameSpan);
          userContainer.appendChild(walletSpan);
          userContainer.addEventListener('click', async () => {
            try {
              // Verifica se o userId e o usercid estão definidos
              if (!userId || !mycid) {
                console.error('userId ou mycid não encontrado.');
                return;
              }
          

             // Faz uma requisição GET para a rota /user/perfil com os parâmetros walletAddress, userId, mycid, mywalletAddressOwner e isDarkMode
             const response = await axios.get('https://apifralishub.online/user/perfilprofile', {
                 params: {
                     walletAddress: data.endereco_carteira,
                     userId: userId,  // Inclui o userId nos parâmetros da requisição
                     mycid: usercid,  // Inclui o usercid nos parâmetros da requisição
                     mywalletAddressOwner: mywalletAddress, // Inclui o mywalletAddressOwner nos parâmetros da requisição
                     isDarkMode: isDarkModeBoolean // Inclui o isDarkMode nos parâmetros da requisição
                    }
             });

          
              // Redirecione para a URL recebida na resposta
              window.location.href = response.data.redirectTo;
            } catch (error) {
              console.error('Erro ao enviar endereço da carteira, userId e usercid:', error);
            }
          });
          

          userContainer.addEventListener('mouseover', () => {
              userContainer.style.backgroundColor = 'lightgray';
          });

          userContainer.addEventListener('mouseleave', () => {
              userContainer.style.backgroundColor = '';
          });

          followers.appendChild(userContainer);
      });
    }
      const closeButton = document.getElementById('close-button');
      closeButton.addEventListener('click', function() {
          miniBox2.style.display = 'none';
      });
      const closeButton2 = document.getElementById('close-button2');
      closeButton2.addEventListener('click', function() {
          miniBox.style.display = 'none';
      });


  
  



    

  async function getUserProfile(walletAddress) {
      try {
          const response = await axios.get('https://apifralishub.online/userProfile', {
              params: {
                  walletAddress: walletAddress
              }
          });

          // Armazena os dados recebidos na variável
          receivedData.push(response.data);

          // Exibe os dados recebidos no console
          console.log('Dados recebidos:', response.data);

          return receivedData;
      } catch (error) {
          console.error('Erro ao obter perfil do usuário:', error);
          return null;
      }
  }
  async function getUserProfile2(walletAddress) {
    try {
        const response = await axios.get('https://apifralishub.online/userProfile', {
            params: {
                walletAddress: walletAddress
            }
        });

        // Armazena os dados recebidos na variável followersData
        followersData.push(response.data);

        // Exibe os dados recebidos no console
        console.log('Dados recebidos:', response.data);

        return followersData;
    } catch (error) {
        console.error('Erro ao obter perfil do usuário:', error);
        return null;
    }
  }



  // Função de manipulador de clique para o backButton
  function backButtonClickHandler(event) {
    console.log('Clique no botão backButton');

    const backButtonContainer = this.querySelector('#backButtonContainer');
    if (backButtonContainer) {
        backButtonContainer.style.display = 'none';
    }
    // Desativa todas as divs com a classe 'comment-container'
    const commentContainersToDisable = document.querySelectorAll('.comment-container');
    commentContainersToDisable.forEach(commentContainer => {
        // Desativa a div comment-container
        commentContainer.disabled = true;
        // Oculta a div comment-container
        commentContainer.style.display = 'none';
    });

    // Oculta todas as divs com a classe 'publication-copy'
    const publicationCopiesToHide = document.querySelectorAll('.publication-copy');
    publicationCopiesToHide.forEach(publicationCopy => {
        publicationCopy.style.display = 'none';
    });


    // Exibir as publicações em cache
    const publicationsCache = localStorage.getItem('publicationsCache');
    if (publicationsCache) {
        const publicationsData = JSON.parse(publicationsCache);
        publicationsData.forEach((publicationData, index) => {
            publicationData.forEach(data => {
                const publicationCopy = document.querySelector('.publication').cloneNode(true);
                // Preencher os elementos da cópia com os dados do cache
                const textSpan = publicationCopy.querySelector('.text-post span');
                if (textSpan) {
                    textSpan.textContent = data.textContent || ''; // Preenche o texto do post
                }
                const authorSpan = publicationCopy.querySelector('.author-post span');
                if (authorSpan) {
                    authorSpan.textContent = data.name || ''; // Preenche o nome do autor
                }
                const profileImageElement = publicationCopy.querySelector('#perfil-image');
                if (profileImageElement) {
                    profileImageElement.src = data.profileImage || ''; // Preenche a URL da imagem de perfil
                }

                // Adiciona margin-top apenas na primeira cópia
                if (!firstPublicationAdded) {
                    publicationCopy.style.marginTop = '280px'; // Adiciona margin-top na primeira cópia
                    firstPublicationAdded = true; // Define que a primeira cópia foi adicionada
                }

                // Insere a cópia da publicação diretamente abaixo da última publicação existente,
                // sem adicionar espaço extra
                const lastPublication = document.querySelector('.publication:last-of-type');
                if (lastPublication) {
                    lastPublication.parentNode.insertBefore(publicationCopy, lastPublication.nextSibling);
                } else {
                    // Se não houver publicação existente, insere a cópia no início do documento
                    document.body.appendChild(publicationCopy);
                }
            });
        });
    }

    // Exibe a div .wrapper
    const wrapperDiv = document.querySelector('.wrapper');
    if (wrapperDiv) {
        wrapperDiv.style.display = 'block';
    }
  }




  textarea.addEventListener('input', function() {
    autoResizeTextarea(this);
    limitMaxLength(this);
  });

  textarea.addEventListener('keydown', function(event) {
    if (event.key === 'Backspace' || event.key === 'Delete') {
      autoResizeTextarea(this);
      if (this.value.trim() === '') {
        autoRemoveEmptyLines(this);
      }
    }
  });

  function autoResizeTextarea(textarea) {
    textarea.style.height = ''; // Reset para pegar a altura correta
    textarea.style.height = 'auto'; // Defina a altura como automática para obter a altura real do conteúdo
    textarea.style.height = Math.min(textarea.scrollHeight, 330) + 'px'; // Define a altura conforme necessário, mas não mais que 330px
  }

  function autoRemoveEmptyLines(textarea) {
    const lines = textarea.value.split('\n').filter(line => line.trim() !== '');
    textarea.value = lines.join('\n');
    autoResizeTextarea(textarea); // Redimensiona o textarea após remover as linhas vazias
  }

  function limitMaxLength(textarea) {
    const maxLength = parseInt(textarea.getAttribute('data-maxlength'));
    if (textarea.value.length > maxLength) {
      textarea.value = textarea.value.slice(0, maxLength);
    }
  }
  function setupTextareaEvents(textarea) {
    textarea.addEventListener('input', function() {
        autoResizeTextarea(this);
        limitMaxLength(this);
    });

    textarea.addEventListener('keydown', function(event) {
        if (event.key === 'Backspace' || event.key === 'Delete') {
            autoResizeTextarea(this);
            if (this.value.trim() === '') {
                autoRemoveEmptyLines(this);
            }
        }
    });
  }
  async function fetchUserInfotimeline() {
    if (isFetchDisabled) {
      console.log("fetchUserInfotimeline is disabled");
      return;
    }
    try {
      // Verifica se o usuário rolou até o final da página
      const windowHeight = window.innerHeight;
      const documentHeight = document.body.clientHeight;
      const scrollY = window.scrollY || window.pageYOffset;
      const twentyPercent = 0.02 * documentHeight;
  
      if (scrollY + windowHeight >= documentHeight - twentyPercent) {
        // Se o usuário estiver perto do final da página, busca mais informações
        const apiUrl = `https://apifralishub.online/userProfiletimeline/${userID}?walletAddress=${userWallet}&page=${page}`;
  
        const response = await axios.get(apiUrl);
        console.log(`Enviada solicitação para obter informações do post em: ${apiUrl}`);
  
        const postInfoResult = response.data;
        console.log('Informações do post:', postInfoResult);
  
        // Verifica se há dados na resposta
        if (postInfoResult.length > 0) {
          // Inverte a ordem dos posts para que o mais recente apareça primeiro
          const reversedPostInfoResult = postInfoResult.reverse();
  
          // Itera sobre os dados invertidos para criar cópias de publicação individualmente
          for (let i = 0; i < reversedPostInfoResult.length; i++) {
            const postInfo = reversedPostInfoResult[i];
            // Chamada da função para criar cópia da publicação
            await createPublicationCopy(postInfo);
            fetchCount++; // Incrementa o contador de chamadas
            console.log('Número de vezes que fetchUserInfotimeline foi chamada:', fetchCount);
          }
          page++; // Incrementa a variável de controle de página
        }
      }
    } catch (error) {
      console.error('Erro ao buscar informações da linha do tempo do usuário:', error);
    }
  }
  
      

  async function getFollowFromMongoDB(walletAddress) {
    try {
      // Define a URL da rota find/follow com o walletAddress como parâmetro
      const followUrl = `https://apifralishub.online/find/follow`;
      
      // Faz a solicitação para a rota find/follow com o walletAddress como currentUserWalletAddress
      const response = await axios.post(followUrl, { currentUserWalletAddress: walletAddress });

      // Exibe o número de objetos recebidos na div com o ID "following-count"
      const followingCountDiv = document.getElementById('following-count');

      // Limpa o conteúdo atual da div
      followingCountDiv.innerHTML = '';

      // Cria um novo elemento para exibir o número de objetos recebidos
      const countElement = document.createElement('div');
      countElement.textContent = `${response.data.length}`;
      
      // Adiciona uma classe para estilizar o alinhamento
      countElement.classList.add('right-aligned');

      followingCountDiv.appendChild(countElement);

      // Para cada wallet recebido, chama a função getUserProfile(walletAddress)
      response.data.forEach(async wallet => {
        await getUserProfile(wallet);
      });

      return response.data;
    } catch (error) {
      console.error('Erro ao buscar dados de follow:', error);
      return {}; // Retorna um objeto vazio em caso de erro
    }
  }
  // Função para buscar os seguidores do MongoDB e atualizar a div com o número de seguidores recebidos
  async function getFollowersFromMongoDB(walletAddress) {
    try {
      // Define a URL da rota find/followers com o walletAddress como parâmetro
      const followersUrl = `https://apifralishub.online/find/followers`;

      // Faz a solicitação para a rota find/followers com o walletAddress como parâmetro
      const followersResponse = await axios.post(followersUrl, { walletAddress });

      // Exibe o número de seguidores recebidos na div com o ID "followers-count"
      const followersCountDiv = document.getElementById('followers-count');

      // Limpa o conteúdo atual da div
      followersCountDiv.innerHTML = '';

      // Cria um novo elemento para exibir o número de seguidores recebidos
      const countElement = document.createElement('div');
      countElement.textContent = `${followersResponse.data.length} `;
      
      // Adiciona uma classe para estilizar o alinhamento
      countElement.classList.add('right-aligned');

      followersCountDiv.appendChild(countElement);

      // Itera sobre os dados recebidos da rota e chama getUserProfile2 para cada walletAddress
      const followersData = [];
      for (const follower of followersResponse.data) {
          const userData = await getUserProfile2(follower);
          followersData.push(userData); // Adiciona os dados do usuário à variável followersData
      }

      // followersData agora contém todos os dados dos seguidores
      return followersData;

    } catch (error) {
      console.error('Erro ao buscar seguidores:', error);
      return []; // Retorna um array vazio em caso de erro
    }
  }
  

  // Função para buscar informações do usuário
  async function fetchUserInfo() {
    try {
      // Acessa a variável userWallet para obter o endereço da carteira do usuário
      const walletAddress = userWallet;

      // Substitua a URL pela URL do seu servidor e rota definida no Express.js
      const userProfileUrl = `https://apifralishub.online/userProfile?walletAddress=${walletAddress}`;

      // Faz a solicitação para obter informações do usuário
      const userProfileResponse = await axios.get(userProfileUrl);
      const userInfo = userProfileResponse.data; // Atribuição de userInfo dentro da função fetchUserInfo

      // Atualiza os elementos HTML com as informações recebidas
      document.querySelector('.name .title').textContent = userInfo.name;
      document.querySelector('.bio p').textContent = userInfo.bio;
      document.querySelector('.front-face img').src = userInfo.photo;
      document.title = userInfo.name;

      // Chama o evento publicationCopy após obter as informações do usuário
      backImageSrc = userInfo.photo;
      userName = userInfo.name;

      // Chama a função para atualizar o número de seguidores

    } catch (error) {
      console.error('Erro ao buscar informações do usuário:', error);
    }
  }








  function adjustWrapperVisibilityWithoutLoadMorePostsActivated() {
    const wrapper = document.querySelector('.wrapper');
    const scrollY = window.scrollY || window.pageYOffset;
    const topOffset = 100; // Distância do topo da tela onde a .wrapper deve ficar visível

    // Verifica se a distância do scroll é menor que o offset superior
    if (scrollY < topOffset) {
      // Se sim, torna a .wrapper visível
      wrapper.style.display = 'block';
    } else {
      // Caso contrário, torna a .wrapper invisível
      wrapper.style.display = 'none';
    }
  }
  

  // Cria um próprio scroll
  window.addEventListener('scroll', adjustWrapperVisibilityWithoutLoadMorePostsActivated);

  // Adiciona um listener de evento de scroll à janela para ajustar a visibilidade da .wrapper
  // Adiciona um listener de evento de scroll à janela para carregar mais posts
  // Chama a função para buscar informações do usuário
  await fetchUserInfo(walletAddress);
  await fetchUserInfotimeline();
  await getFollowersFromMongoDB(walletAddress);
  await getFollowFromMongoDB(walletAddress);
  

  document.getElementById('return-button').addEventListener('click', async function() {
    try {
        // Obtém o userId da consulta na URL atual
        const userId = urlParams.get('userId');

        // Verifica se o userId está disponível
        if (!userId) {
            console.error('Nenhum userId encontrado.');
            return;
        }

        // Faz uma requisição GET para a rota /user/wallet3 passando o userId como parâmetro
        const response = await axios.get(`https://apifralishub.online/user/wallet3?userId=${userId}`);

        // Verifica se a requisição foi bem-sucedida
        if (response.status === 200) {
            // Obtém o walletAddress da resposta
            const userWallet = response.data.walletAddress;

            // Verifica se userWallet foi obtido
            if (userWallet) {
                // Constrói a URL para a tela principal/index.html com o walletAddress
                const url = `principal/index.html?walletAddress=${userWallet}`;

                // Redireciona para a tela principal/index.html
                window.location.href = url;
            } else {
                console.error('Nenhum userWallet encontrado.');
            }
        } else {
            console.error('Erro ao obter o walletAddress.');
        }
    } catch (error) {
        console.error('Erro ao acessar a rota /user/wallet3:', error);
    }
  });

    
});
