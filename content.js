(function() {
    'use strict';

    const medicacoesControladas = new Set(["AMITRIPTILINA", "BIPERIDENO", "CARBAMAZEPINA", "LITIO", "CLONAZEPAM", "CLORPROMAZINA", "DIAZEPAM", "FENITOINA", "FENOBARBITAL", "FLUOXETINA", "HALOPERIDOL", "IMIPRAMINA", "LEVOMEPROMAZINA", "METILFENIDATO", "MORFINA", "RISPERIDONA", "SERRTALINA"]);
    const medicacoesAgudas = new Set(["DIPIRONA", "PARACETAMOL", "IBUPROFENO", "ACETILCISTEINA", "CALCIO", "DEXAMETASONA", "ACICLOVIR", "DICLOFENACO", "FLUCONAZOL", "IVERMECTINA", "NEOMICINA","LIDOCAINA", "METOCLOPRAMIDA", "PERMETRINA", "SAIS", "PREDNISOLONA", "AMOXICILINA", "AZITROMICINA", "MIKANIA", "CEFALEXINA", "BENZILPENICILINA", "CLARITROMICINA", "CIPROFLOXACINO", "CEFITRIAXONA", "METRONIDAZOL", "SULFAMETOXAZOL", "NITROFURANTOINA", "SERINGA", "AGULHA", "FITA"]);
    const mapaUnidades = { "CP": "cp", "CAP": "cp", "FR": "fr", "AMP": "amp", "TB": "tb", "ML": "ml", "G": "g", "MG": "mg", "U": "uni", "UN": "uni", "ENV": "env", "CX": "cx", "PCT": "pacote(s)", "VD": "vidro(s)", "FA": "frasco-ampola", "BGO": "bisnaga(s)", "SER": "seringa(s)", "GTS": "gotas" };

    function normalizarNome(nome) {
        return nome ? nome.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim() : "";
    }

    function formatarQuantidade(qtdStr) {
        let num = parseInt(qtdStr.replace(',', '.'));
        if (isNaN(num)) return qtdStr;
        return num.toString().padStart(2, '0');
    }

    function salvarIdentidade() {
        const unidade = document.querySelector('[wicketpath="empresaLogada"]')?.title || "";
        const usuario = document.querySelector('[wicketpath="linkMinhaConta"]')?.title || "";
    
        if (unidade || usuario) {
       	    // Criamos um nome amigável: "NOME (UNIDADE)"
            const nomeIdentificado = `${usuario.split(' ')[0]} - ${unidade.replace('FARMACIA DISTRITAL ', '')}`;
            chrome.storage.local.set({ 'usuario_celk': nomeIdentificado });
        }
    }
    salvarIdentidade();

    function limparNomeMedicamento(nome) {
        return nome.replace(/\(\s*\d+\s*\)\s*/, "").replace(/\s*\(.*?\)/g, "").trim();
    }

    function exibirAvisoErro(msg) {
        let aviso = document.getElementById("aviso-erro-evolucao");
        if (!aviso) {
            aviso = document.createElement("div");
            aviso.id = "aviso-erro-evolucao";
            aviso.style = "position: fixed; top: 10px; right: 10px; z-index: 9999; background: #d32f2f; color: white; padding: 15px; border-radius: 8px; font-weight: bold; box-shadow: 0 4px 8px rgba(0,0,0,0.3); border: 2px solid white; font-family: sans-serif;";
            document.body.appendChild(aviso);
        }
        aviso.innerHTML = `⚠️ ${msg}`;
        aviso.style.display = "block";
    }

    function esconderAvisoErro() {
        const aviso = document.getElementById("aviso-erro-evolucao");
        if (aviso) aviso.style.display = "none";
    }

    function extrairNomePacienteEvolucao() {
        const label = document.querySelector('[wicketpath="form_nomePaciente"]');
        if (!label) return "";
        return normalizarNome(label.innerText.split('|')[0].replace(/\(\d+\)/g, ""));
    }

    function injetarNoEditor(texto, nomeEsperado) {
        const nomeAtual = extrairNomePacienteEvolucao();
        if (!nomeAtual) return false;

        if (nomeEsperado && !nomeAtual.includes(nomeEsperado) && !nomeEsperado.includes(nomeAtual)) {
            exibirAvisoErro(`PACIENTE INCORRETO!<br>Medicações de: ${nomeEsperado}<br>Em atendimento: ${nomeAtual}`);
            return false;
        }

        esconderAvisoErro();
        const editorIframe = document.querySelector('iframe[id$="_ifr"]');
        if (editorIframe) {
            try {
                const doc = editorIframe.contentDocument || editorIframe.contentWindow.document;
                const body = doc.getElementById('tinymce');
                if (body) {
                    const textoFormatado = texto.split('\n').map(linha => linha.trim() === "" ? "<p>&nbsp;</p>" : `<p>${linha}</p>`).join("");
                    body.innerHTML = textoFormatado;
                    return true;
                }
            } catch (e) { console.error("Erro no editor:", e); }
        }
        return false;
    }

    setInterval(() => {
        const pacote = localStorage.getItem('comando_injetar_evolucao');
        if (pacote) {
            const dados = JSON.parse(pacote);
            if (injetarNoEditor(dados.texto, normalizarNome(dados.paciente))) {
                localStorage.removeItem('comando_injetar_evolucao');
            }
        }
    }, 1000);

    function extrairDados() {
        const nomePacienteBruto = document.querySelector('[wicketpath="form_identificacao_usuarioCadsusDestino_descricao"] p')?.innerText || "";
        const nomePaciente = nomePacienteBruto.replace(/\(\d+\)\s*/, "").trim();
        const dataReceita = document.querySelector('[wicketpath="form_dadosReceita_dataReceita_data"]')?.value?.split(" - ")[0] || "____________";
        const profComVinculo = document.querySelector('[wicketpath="form_dadosReceita_profissional_descricao"] p')?.innerText;
        const profSemVinculo = document.querySelector('[wicketpath="form_dadosReceita_containerDadosProfissional_profissionalSemVinculo_descricao"] p')?.innerText;
        const profissional = (profComVinculo || profSemVinculo || "____________").trim();

        const linhas = document.querySelectorAll('[wicketpath="form_containerItem_tableItems_table_body"] tr');
        let medicamentos = [];

        linhas.forEach(linha => {
            const nomeBrutoElemento = linha.querySelector('td:nth-child(3) div')?.innerText;
            if (nomeBrutoElemento) {
                const nomeLimpo = limparNomeMedicamento(nomeBrutoElemento);
                const unidadeBruta = linha.querySelector('td:nth-child(4) div')?.innerText.trim().toUpperCase();
                const quantidadeBruta = linha.querySelector('td:nth-child(9) div')?.innerText.trim();
                const retorno = linha.querySelector('td:nth-child(10) div')?.innerText.trim();

                let unidadeConvertida = mapaUnidades[unidadeBruta] || unidadeBruta.toLowerCase();
                if (nomeLimpo.toUpperCase().includes("TUBETE")) unidadeConvertida = "uni";

                const quantidadeFormatada = formatarQuantidade(quantidadeBruta);
                const principio = normalizarNome(nomeLimpo).split(" ")[0];

                medicamentos.push({
                    nome: nomeLimpo,
                    texto: `${quantidadeFormatada} ${unidadeConvertida} de ${nomeLimpo}`,
                    principio,
                    retorno
                });
            }
        });
        return { nomePaciente, dataReceita, profissional, medicamentos };
    }

    function processarEvolucao() {
        const dadosAtuais = extrairDados();
        if (dadosAtuais.medicamentos.length === 0) return;

        let memoria = JSON.parse(sessionStorage.getItem('evolucao_acumulada')) || { paciente: "", receitas: [] };

        if (memoria.paciente !== "" && normalizarNome(memoria.paciente) !== normalizarNome(dadosAtuais.nomePaciente)) {
            memoria = { paciente: dadosAtuais.nomePaciente, receitas: [] };
        } else {
            memoria.paciente = dadosAtuais.nomePaciente;
        }

        const idReceita = normalizarNome(dadosAtuais.profissional) + dadosAtuais.dataReceita;
        const indexExistente = memoria.receitas.findIndex(r => (normalizarNome(r.profissional) + r.data) === idReceita);

        if (indexExistente !== -1) {
            dadosAtuais.medicamentos.forEach(m => {
                if (!memoria.receitas[indexExistente].medicamentos.find(rm => rm.nome === m.nome)) {
                    memoria.receitas[indexExistente].medicamentos.push(m);
                }
            });
        } else {
            memoria.receitas.push({ profissional: dadosAtuais.profissional, data: dadosAtuais.dataReceita, medicamentos: dadosAtuais.medicamentos });
        }

        sessionStorage.setItem('evolucao_acumulada', JSON.stringify(memoria));

        let corpoEvolucao = "";
        let controladosSoma = [];
        let continuosSoma = [];

        memoria.receitas.forEach(rec => {
            let listaMeds = rec.medicamentos.map(m => m.texto).join("\n");
            corpoEvolucao += `${listaMeds}\n\nReceita prescrita por ${rec.profissional} em ${rec.data}.\n\n`;
            rec.medicamentos.forEach(m => {
                if (!/^\d{2}\/\d{2}\/\d{4}$/.test(m.retorno)) return;
                if (medicacoesControladas.has(m.principio)) controladosSoma.push(`• ${m.nome} em ${m.retorno}`);
                else if (!medicacoesAgudas.has(m.principio)) continuosSoma.push(m.retorno);
            });
        });

        let textoRetorno = "";
        if (controladosSoma.length > 0) textoRetorno += "\nMedicamentos de uso controlado com previsão de nova dispensação com nova receita médica a partir de:\n" + [...new Set(controladosSoma)].join("\n") + "\n";
        if (continuosSoma.length > 0) {
            const datas = continuosSoma.map(d => { const [dia, mes, ano] = d.split("/"); return new Date(ano, mes - 1, dia); });
            const menor = new Date(Math.min(...datas));
            const menorFormatado = String(menor.getDate()).padStart(2, "0") + "/" + String(menor.getMonth() + 1).padStart(2, "0") + "/" + menor.getFullYear();
            textoRetorno += `\nMedicamentos de uso contínuo com previsão de nova dispensação a partir de ${menorFormatado}.`;
        }

        const textoFinal = `Paciente comparece à farmácia para retirada de medicamentos.\n\nForam dispensados:\n${corpoEvolucao}Orientado quanto ao uso correto das medicações.\n${textoRetorno}`;

        navigator.clipboard.writeText(textoFinal);

        localStorage.setItem('comando_injetar_evolucao', JSON.stringify({
            paciente: memoria.paciente,
            texto: textoFinal
        }));

        const btn = document.getElementById("btn-evoluir");
        if(btn) {
            btn.value = `Enviado! ✓`;
            btn.style.background = "#2e7d32";
            setTimeout(() => { btn.value = "Gerar Evolução"; btn.style.background = "#00897b"; }, 2000);
        }
    }

    function inserirBotoes() {
        if (!window.location.href.includes("/materiais/dispensacao/")) return;
        const container = document.getElementById("control-bottom") || document.querySelector('[id*="control-bottom"]');
        if (container && !document.getElementById("btn-evoluir")) {
            const btn = document.createElement("input");
            btn.type = "button"; btn.id = "btn-evoluir"; btn.value = "Gerar Evolução";
            btn.style = "background: #00897b; color: white; margin-left: 10px; font-weight: bold; cursor: pointer; border-radius: 4px; border: 1px solid #00695c;";
            btn.onclick = (e) => { e.preventDefault(); processarEvolucao(); };
            container.appendChild(btn);

            const btnLimpar = document.createElement("input");
            btnLimpar.type = "button"; btnLimpar.id = "btn-limpar-memoria"; btnLimpar.value = "Limpar Memória";
            btnLimpar.style = "background: #d32f2f; color: white; margin-left: 5px; cursor: pointer; border-radius: 4px; border: 1px solid #b71c1c; padding: 5px 15px; font-weight: bold; transition: background 0.3s;";
            btnLimpar.onclick = (e) => { 
                e.preventDefault(); 
                sessionStorage.removeItem('evolucao_acumulada');
                
                // Efeito visual
                btnLimpar.value = "Memória Limpa! ✓";
                btnLimpar.style.background = "#2e7d32";
                btnLimpar.style.border = "1px solid #1b5e20";
                
                setTimeout(() => { 
                    btnLimpar.value = "Limpar Memória"; 
                    btnLimpar.style.background = "#d32f2f";
                    btnLimpar.style.border = "1px solid #b71c1c";
                }, 2000);
            };
            container.appendChild(btnLimpar);
        }
    }

    const observer = new MutationObserver(() => inserirBotoes());
    observer.observe(document.body, { childList: true, subtree: true });
    inserirBotoes();

})();