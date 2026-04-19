// background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "atualizarBadge") {
        // Se total for vazio, limpa o badge, senão mostra o número
        const texto = request.total ? request.total.toString() : "";
        
        chrome.action.setBadgeText({ text: texto });
        chrome.action.setBadgeBackgroundColor({ color: '#d32f2f' }); // Vermelho vibrante
    }
    
    if (request.action === "limparBadge") {
        chrome.action.setBadgeText({ text: '' });
    }
});