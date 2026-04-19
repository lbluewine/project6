// chat_monitor.js

// 1. Função que avisa o background para ativar o alerta visual
function notificarNovaMensagem() {
    // PROTEÇÃO: Verifica se a extensão ainda está ativa
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
        chrome.runtime.sendMessage({ action: "atualizarBadge", total: "!" });
    }
}

// 2. Configura o observador para detectar novas mensagens no HTML
const observer = new MutationObserver((mutations) => {
    // PROTEÇÃO: Se a conexão com a extensão caiu, desliga o monitor para evitar erros
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
        observer.disconnect();
        return;
    }

    for (let mutation of mutations) {
        if (mutation.addedNodes.length) {
            mutation.addedNodes.forEach(node => {
                // Verifica se o nó é um elemento e se contém a classe de mensagem
                if (node.nodeType === 1) {
                    const isMessage = node.classList.contains('chat-message') || 
                                    node.querySelector('.chat-message');
                    
                    if (isMessage) {
                        // Opcional: Evita notificar se a mensagem foi enviada por você
                        // Geralmente o DeadSimpleChat adiciona uma classe 'is-me' ou similar
                        if (!node.classList.contains('is-me')) {
                            notificarNovaMensagem();
                        }
                    }
                }
            });
        }
    }
});

// 3. Inicia a observação
observer.observe(document.body, {
    childList: true,
    subtree: true
});

// 4. Lógica de Auto-Login
function autoPreencherLogin() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(['usuario_celk'], function(data) {
            if (data.usuario_celk) {
                const inputUser = document.querySelector('input#username-field');
                
                if (inputUser && (inputUser.value === "" || inputUser.value === "Username")) {
                    inputUser.value = data.usuario_celk;
                    
                    // Dispara eventos para o site processar a entrada
                    const eventos = ['input', 'change', 'blur'];
                    eventos.forEach(ev => {
                        inputUser.dispatchEvent(new Event(ev, { bubbles: true }));
                    });
                    
                    console.log("Identidade Celk aplicada: " + data.usuario_celk);
                }
            }
        });
    }
}

// Tenta preencher 10 vezes (aumentado para cobrir internet lenta no serviço)
let tentativas = 0;
const intervaloLogin = setInterval(() => {
    autoPreencherLogin();
    tentativas++;
    if (tentativas > 10) clearInterval(intervaloLogin); 
}, 1000);

console.log("Monitor BW ativado: Login Automático + Notificações.");