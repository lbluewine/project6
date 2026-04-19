document.addEventListener('DOMContentLoaded', function() {
    const botaoChat = document.getElementById('abrir-chat');
    
    // 1. Limpa o badge assim que o popup abre (opcional, mas recomendado)
    if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: "limparBadge" });
    }

    if (botaoChat) {
        botaoChat.addEventListener('click', function() {
            // 2. Avisa o background para limpar o badge novamente ao clicar
            chrome.runtime.sendMessage({ action: "limparBadge" });
            
            // 3. Tenta forçar o content.js a salvar a identidade antes de abrir o chat
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                // Verifica se estamos em uma aba válida (não é página de extensões ou tela em branco)
                if (tabs[0] && tabs[0].id) {
                    chrome.scripting.executeScript({
                        target: {tabId: tabs[0].id},
                        func: () => {
                            // Chama a função que está lá no seu content.js
                            if (typeof salvarIdentidade === "function") {
                                salvarIdentidade();
                            }
                        }
                    }).catch(err => console.log("Não foi possível atualizar identidade nesta página."));
                }
            });

            // 4. Abre o chat (use a sua URL real aqui)
            const urlChat = 'https://deadsimplechat.com/lJlv8zPQh'; 
            window.open(urlChat, '_blank');
        });
    }
});