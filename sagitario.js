<script>
// Arquivo: sagitario.js - Central Terminal ATC, Fixos Vetoriais e Roteamento Blindado de Aerovias / TMA / VFR
(function() {
    function sctParaDecimal(coordStr) {
        var match = coordStr.trim().match(/^([NSEW])\s*(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?/i);
        if (!match) return null;
        
        var dir = match[1].toUpperCase();
        var deg = parseInt(match[2], 10);
        var min = parseInt(match[3], 10);
        var sec = parseInt(match[4], 10);
        var msStr = match[5] || "0";
        var ms = parseInt(msStr, 10) / Math.pow(10, msStr.length);
        
        var dec = deg + (min / 60) + ((sec + ms) / 3600);
        if (dir === 'S' || dir === 'W') dec = -dec;
        return dec;
    }

    function obterTextoSCT() {
        if (typeof TEXTO_SCT !== 'undefined' && TEXTO_SCT.length > 100) return TEXTO_SCT;
        if (window.TEXTO_SCT && window.TEXTO_SCT.length > 100) return window.TEXTO_SCT;
        var el = document.getElementById('dados_sct');
        if (el) {
            var txt = el.textContent || el.innerText;
            if (txt && txt.length > 100) return txt;
        }
        return null;
    }

    function encontrarMapaLeaflet(obj, prof, visitados) {
        if (!obj || prof > 6) return null;
        if (visitados.indexOf(obj) !== -1) return null;
        visitados.push(obj);
        
        if (obj._layers && typeof obj.addLayer === 'function' && typeof obj.setView === 'function' && typeof obj.panTo === 'function') {
            return obj;
        }
        
        for (var k in obj) {
            try {
                var filho = obj[k];
                if (filho && typeof filho === 'object') {
                    var achou = encontrarMapaLeaflet(filho, prof + 1, visitados);
                    if (achou) return achou;
                }
            } catch(e) {}
        }
        return null;
    }

    function extrairAeroportoEProcedimento(linhaTexto) {
        var partes = linhaTexto.trim().split(/\s+/);
        var token1 = partes[0] ? partes[0].replace(/^[;\/]+/g, '').trim() : "";
        var token2 = partes[1] ? partes[1].replace(/^[;\/]+/g, '').trim() : "";
        
        var icao = "OUTROS";
        var nome = token1;
        
        var matchIcao = token1.match(/\b([S|K|E|L|M|U|V|C|P|Z|R][A-Z]{3})\b/i) || token1.match(/^([A-Z]{4})/i);
        
        if (/^[A-Z]{4}$/i.test(token1) && token2 && !token2.match(/^[NSEW]\d/i)) {
            icao = token1.toUpperCase();
            nome = token2.toUpperCase();
        } else if (matchIcao) {
            icao = matchIcao[1].toUpperCase();
            nome = token1.toUpperCase();
        }
        return { icao: icao, nome: nome };
    }

    function desenharLinhaGeral(linhaTexto, coords, layer, cor, peso, opac, contagemNomes, mostrarEtiqueta, motorCanvas, dash, bgBadge, nomeOverride) {
        if (coords.length >= 4) {
            var pontos = [];
            for (var c = 0; c <= coords.length - 2; c += 2) {
                var lat = sctParaDecimal(coords[c]);
                var lon = sctParaDecimal(coords[c+1]);
                if (lat !== null && lon !== null) pontos.push([lat, lon]);
            }
            if (pontos.length >= 2) {
                var opts = { color: cor, weight: peso, opacity: opac, interactive: false };
                if (dash) opts.dashArray = dash;
                if (motorCanvas) opts.renderer = motorCanvas;
                
                var poli = L.polyline(pontos, opts);
                if (mostrarEtiqueta) {
                    var partes = linhaTexto.trim().split(/\s+/);
                    var nomeLinha = nomeOverride || ((partes[0] && !partes[0].match(/^[NSEW]\d/i) && !partes[0].match(/^\d{1,3}\.\d{1,2}/)) ? partes[0].replace(/^[;\/]+/g, '').trim() : "");
                    
                    if (nomeLinha && nomeLinha.length >= 2 && nomeLinha !== "OUTROS" && nomeLinha !== "PROCEDIMENTO") {
                        contagemNomes[nomeLinha] = (contagemNomes[nomeLinha] || 0) + 1;
                        // INSTÂNCIA ÚNICA: Plota o nome uma única vez no primeiro segmento desenhado
                        if (contagemNomes[nomeLinha] === 1) {
                            var fundo = bgBadge || 'rgba(0, 12, 12, 0.92)';
                            var htmlLinha = '<span style="color: ' + cor + '; background: ' + fundo + '; padding: 2px 5px; border: 1px solid ' + cor + '; border-radius: 2px; font-size: 10px; font-weight: bold; font-family: Consolas, monospace; white-space: nowrap; text-shadow: 1px 1px 1px #000; box-shadow: 0 0 5px rgba(0,0,0,0.8);">' + nomeLinha + '</span>';
                            poli.bindTooltip(htmlLinha, { permanent: true, direction: 'center', className: 'sagitario-label-transparente' });
                        }
                    }
                }
                poli.addTo(layer);
            }
        }
    }

    function desenharPontoGeral(linhaTexto, coords, layer, cor, raio, sempreVisivel, motorCanvas) {
        if (coords.length >= 2) {
            var lat = sctParaDecimal(coords[0]);
            var lon = sctParaDecimal(coords[1]);
            if (lat !== null && lon !== null) {
                var partes = linhaTexto.trim().split(/\s+/);
                var nome = (partes[0] || "PONTO").replace(/^[;\/]+/g, '').trim();
                
                var opts = { radius: raio, fillColor: cor, color: cor, weight: 1.5, opacity: 0.95, fillOpacity: 0.8, interactive: true };
                if (motorCanvas) opts.renderer = motorCanvas;
                
                var marker = L.circleMarker([lat, lon], opts);
                var htmlPonto = '<span style="color: ' + cor + '; background: rgba(0, 12, 12, 0.92); padding: 1px 4px; border: 1px solid ' + cor + '; border-radius: 2px; font-size: 10px; font-weight: bold; font-family: Consolas, monospace; white-space: nowrap; text-shadow: 1px 1px 1px #000; box-shadow: 0 0 5px rgba(0,0,0,0.8);">' + nome + '</span>';
                marker.bindTooltip(htmlPonto, { permanent: sempreVisivel, direction: 'right', className: 'sagitario-label-transparente', offset: [raio + 3, 0] });
                marker.addTo(layer);
            }
        }
    }

    function injetarRadarLeaflet() {
        var textoSCT = obterTextoSCT();
        if (textoSCT && window.VRS && typeof L !== 'undefined') {
            
            var mapaNativo = null;
            if (VRS.$$ && VRS.$$.map) mapaNativo = encontrarMapaLeaflet(VRS.$$.map, 0, []);
            if (!mapaNativo) mapaNativo = encontrarMapaLeaflet(window.VRS, 0, []);
            
            if (!mapaNativo) return false;

            if (mapaNativo._camadasSagitarioInjetadas) return true;
            mapaNativo._camadasSagitarioInjetadas = true;

            var motorCanvas = typeof L.canvas === 'function' ? L.canvas({ padding: 0.5 }) : null;

            var layerFIR     = L.layerGroup();
            var layerTMA     = L.layerGroup(); // Agrupa CTR/TMA (Teal) E Corredores Visuais (Verde Neon) no mesmo botão
            var layerSUA     = L.layerGroup(); // Áreas Restritas/Perigo (Vermelho Coral Rubro)
            var layerHigh    = L.layerGroup();
            var layerLow     = L.layerGroup(); // Aerovias Inferiores independentes e intactas (Laranja)
            var layerRunway  = L.layerGroup();
            var layerGeo     = L.layerGroup();
            var layerVOR     = L.layerGroup();
            var layerFixes   = L.layerGroup();

            var bancoProcedimentos = {};
            var bancoFixos = [];
            var contagemNomes = {};

            var ultimoIcaoProc = "OUTROS";
            var ultimoNomeProc = "PROCEDIMENTO";

            // Variáveis de Memória Modulares (Proteção contra vazamento de seções)
            var ultimoLayerSetor = null;
            var ultimoCorSetor   = null;
            var ultimoDashSetor  = null;
            var ultimoBgSetor    = null;
            var ultimoNomeSetor  = null;

            var linhas = textoSCT.split('\n');
            var secaoAtual = '';
            var regexCoord = /([NSEW]\s*\d{1,3}\.\d{1,2}\.\d{1,2}(?:\.\d+)?)/gi;

            for (var i = 0; i < linhas.length; i++) {
                var linha = linhas[i].trim();
                if (!linha || linha.charAt(0) === ';') continue;
                
                if (linha.charAt(0) === '[') { 
                    secaoAtual = linha.toUpperCase(); 
                    ultimoIcaoProc = "OUTROS";
                    ultimoNomeProc = "PROCEDIMENTO";
                    
                    // Reset da memória ao mudar de seção para garantir isolamento de camadas!
                    ultimoLayerSetor = null;
                    ultimoCorSetor   = null;
                    ultimoDashSetor  = null;
                    ultimoBgSetor    = null;
                    ultimoNomeSetor  = null;
                    continue; 
                }

                var coords = linha.match(regexCoord);
                if (!coords) continue;

                var partes = linha.split(/\s+/);
                var tok1 = partes[0] ? partes[0].replace(/^[;\/]+/g, '').trim() : "";
                var tok2 = partes[1] ? partes[1].replace(/^[;\/]+/g, '').trim() : "";
                var nomeLinhaUpper = tok1.toUpperCase();
                var nomeCompletoUpper = linha.replace(/^[;\/]+/g, '').trim().toUpperCase();
                var eLinhaContinua = (/^[NSEW]\d/i.test(tok1) || /^\d{1,3}\.\d{1,2}/.test(tok1));

                // 1. BLOCO EXCLUSIVO: AEROVIAS INFERIORES [LOW AIRWAY]
                if (secaoAtual.indexOf('[LOW AIRWAY') === 0) {
                    if (!eLinhaContinua) {
                        // Override cirúrgico caso haja uma Área Restrita desenhada em LOW AIRWAY
                        if (/^(?:SB|S)?\s*[RDP]\s*-?\s*\d{2,4}/i.test(nomeCompletoUpper) || nomeCompletoUpper.indexOf('PROIB') !== -1 || nomeCompletoUpper.indexOf('RESTR') !== -1 || nomeCompletoUpper.indexOf('PERIGO') !== -1 || nomeCompletoUpper.indexOf('DANGER') !== -1 || nomeCompletoUpper.indexOf('MILITAR') !== -1) {
                            ultimoLayerSetor = layerSUA;
                            ultimoCorSetor   = '#ff2e63';
                            ultimoDashSetor  = '6, 4';
                            ultimoBgSetor    = 'rgba(40, 0, 10, 0.95)';
                            ultimoNomeSetor  = tok1.toUpperCase();
                        }
                        // Override cirúrgico caso seja estritamente um corredor REA / REH
                        else if (nomeLinhaUpper.indexOf('REA') === 0 || nomeLinhaUpper.indexOf('REH') === 0 || nomeCompletoUpper.indexOf('CORREDOR_VISUAL') !== -1 || nomeCompletoUpper.indexOf('ROTA_VISUAL') !== -1) {
                            ultimoLayerSetor = layerTMA;
                            ultimoCorSetor   = '#00ff66';
                            ultimoDashSetor  = '5, 5';
                            ultimoBgSetor    = 'rgba(0, 25, 10, 0.95)';
                            ultimoNomeSetor  = tok1.toUpperCase();
                        }
                        // CASO PADRÃO: Aerovia Inferior Legítima (Laranja Brilhante, linha contínua)
                        else {
                            ultimoLayerSetor = layerLow;
                            ultimoCorSetor   = '#ffaa00';
                            ultimoDashSetor  = null;
                            ultimoBgSetor    = 'rgba(25, 12, 0, 0.92)';
                            ultimoNomeSetor  = tok1.toUpperCase();
                        }
                    }
                    var layerDestLow = ultimoLayerSetor || layerLow;
                    var corDestLow   = ultimoCorSetor || '#ffaa00';
                    var dashDestLow  = ultimoDashSetor || null;
                    var bgDestLow    = ultimoBgSetor || 'rgba(25, 12, 0, 0.92)';
                    var nomeDestLow  = ultimoNomeSetor || (eLinhaContinua ? "" : tok1.toUpperCase());

                    desenharLinhaGeral(linha, coords, layerDestLow, corDestLow, 1.4, 0.85, contagemNomes, true, motorCanvas, dashDestLow, bgDestLow, nomeDestLow);
                }
                // 2. BLOCO EXCLUSIVO: GEOGRAFIA E LITORAL [GEO / COAST / LAND]
                else if (secaoAtual.indexOf('[GEO') === 0 || secaoAtual.indexOf('[COAST') === 0 || secaoAtual.indexOf('[LAND') === 0) {
                    if (!eLinhaContinua) {
                        if (/^(?:SB|S)?\s*[RDP]\s*-?\s*\d{2,4}/i.test(nomeCompletoUpper) || nomeCompletoUpper.indexOf('PROIB') !== -1 || nomeCompletoUpper.indexOf('RESTR') !== -1 || nomeCompletoUpper.indexOf('PERIGO') !== -1 || nomeCompletoUpper.indexOf('DANGER') !== -1 || nomeCompletoUpper.indexOf('MILITAR') !== -1 || nomeCompletoUpper.indexOf('TIRO') !== -1) {
                            ultimoLayerSetor = layerSUA;
                            ultimoCorSetor   = '#ff2e63';
                            ultimoDashSetor  = '6, 4';
                            ultimoBgSetor    = 'rgba(40, 0, 10, 0.95)';
                            ultimoNomeSetor  = tok1.toUpperCase();
                        } else {
                            ultimoLayerSetor = layerGeo;
                            ultimoCorSetor   = '#2e662e';
                            ultimoDashSetor  = null;
                            ultimoBgSetor    = null;
                            ultimoNomeSetor  = "";
                        }
                    }
                    var layerDestGeo = ultimoLayerSetor || layerGeo;
                    var corDestGeo   = ultimoCorSetor || '#2e662e';
                    var dashDestGeo  = ultimoDashSetor || null;
                    var bgDestGeo    = ultimoBgSetor || null;
                    var nomeDestGeo  = ultimoNomeSetor || "";
                    var mostrarEtiqGeo = (layerDestGeo === layerSUA);

                    desenharLinhaGeral(linha, coords, layerDestGeo, corDestGeo, 1.0, 0.5, contagemNomes, mostrarEtiqGeo, motorCanvas, dashDestGeo, bgDestGeo, nomeDestGeo);
                }
                // 3. BLOCO EXCLUSIVO: SETORES, FIR, TMA, CTR, VFR E SUAs
                else if (secaoAtual.indexOf('[ARTCC') === 0 || secaoAtual.indexOf('[FIR') === 0 || secaoAtual.indexOf('[SECTOR') === 0 ||
                         secaoAtual.indexOf('[DANGER') === 0 || secaoAtual.indexOf('[RESTR') === 0 || secaoAtual.indexOf('PROHIB') === 0 || secaoAtual.indexOf('[SUA') === 0 ||
                         secaoAtual.indexOf('[VFR') === 0 || secaoAtual.indexOf('[CORRIDOR') === 0 || secaoAtual.indexOf('[ROUT') === 0 || secaoAtual.indexOf('[TMA') === 0 || secaoAtual.indexOf('[CTR') === 0) {
                    
                    if (!eLinhaContinua) {
                        // a) Áreas Restritas, Proibidas ou de Perigo (Vermelho Coral Rubro)
                        if (secaoAtual.indexOf('DANGER') !== -1 || secaoAtual.indexOf('RESTR') !== -1 || secaoAtual.indexOf('PROHIB') !== -1 || secaoAtual.indexOf('SUA') !== -1 ||
                            /^(?:SB|S)?\s*[RDP]\s*-?\s*\d{2,4}/i.test(nomeCompletoUpper) ||
                            nomeCompletoUpper.indexOf('PROIB') !== -1 || nomeCompletoUpper.indexOf('RESTR') !== -1 || nomeCompletoUpper.indexOf('PERIGO') !== -1 || nomeCompletoUpper.indexOf('DANGER') !== -1 || nomeCompletoUpper.indexOf('MILITAR') !== -1 || nomeCompletoUpper.indexOf('TIRO') !== -1 || nomeCompletoUpper.indexOf('TRA_') !== -1 || nomeCompletoUpper.indexOf('TSA_') !== -1) {
                            ultimoLayerSetor = layerSUA;
                            ultimoCorSetor   = '#ff2e63'; 
                            ultimoDashSetor  = '6, 4';
                            ultimoBgSetor    = 'rgba(40, 0, 10, 0.95)';
                            ultimoNomeSetor  = tok1.toUpperCase();
                        }
                        // b) Corredores Visuais e Rotas VFR (Verde Esmeralda Neon -> Integrado no layerTMA)
                        else if (secaoAtual.indexOf('VFR') !== -1 || secaoAtual.indexOf('CORRIDOR') !== -1 || secaoAtual.indexOf('ROUT') !== -1 ||
                                 nomeLinhaUpper.indexOf('REA') === 0 || nomeLinhaUpper.indexOf('REH') === 0 || 
                                 nomeCompletoUpper.indexOf('VFR') !== -1 || nomeCompletoUpper.indexOf('CORREDOR') !== -1 || nomeCompletoUpper.indexOf('ROTA_VISUAL') !== -1 || nomeCompletoUpper.indexOf('PORTA') !== -1 || nomeCompletoUpper.indexOf('VISUAL') !== -1 || nomeCompletoUpper.indexOf('CIRCUITO') !== -1 || nomeCompletoUpper.indexOf('TRAFEGO') !== -1) {
                            ultimoLayerSetor = layerTMA;
                            ultimoCorSetor   = '#00ff66'; 
                            ultimoDashSetor  = '5, 5';
                            ultimoBgSetor    = 'rgba(0, 25, 10, 0.95)';
                            ultimoNomeSetor  = tok1.toUpperCase();
                        }
                        // c) Fronteiras FIR e Centros ACC (Azul Aço Slate Sóbrio)
                        else if (secaoAtual.indexOf('[FIR') === 0 || secaoAtual.indexOf('HIGH') !== -1 ||
                                 nomeCompletoUpper.indexOf('FIR') !== -1 || nomeCompletoUpper.indexOf('ACC') !== -1 || nomeCompletoUpper.indexOf('UIR') !== -1 || nomeCompletoUpper.indexOf('ARTCC_HIGH') !== -1 || nomeLinhaUpper === 'SBCW' || nomeLinhaUpper === 'SBBS' || nomeLinhaUpper === 'SBRE' || nomeLinhaUpper === 'SBEG' || nomeLinhaUpper === 'SBAO' || nomeCompletoUpper.indexOf('FRONTEIRA') !== -1 || nomeCompletoUpper.indexOf('BRASIL') !== -1) {
                            ultimoLayerSetor = layerFIR;
                            ultimoCorSetor   = '#4a7a96'; 
                            ultimoDashSetor  = '8, 5';
                            ultimoBgSetor    = 'rgba(10, 15, 20, 0.92)';
                            ultimoNomeSetor  = tok1.toUpperCase();
                        }
                        // d) Setores Terminais CTR / TMA / APP (Ciano Elétrico)
                        else {
                            ultimoLayerSetor = layerTMA;
                            ultimoCorSetor   = '#00e5ff'; 
                            ultimoDashSetor  = '4, 4';
                            ultimoBgSetor    = 'rgba(0, 20, 25, 0.95)';
                            ultimoNomeSetor  = tok1.toUpperCase();
                        }
                    }

                    var layerDestSetor = ultimoLayerSetor || layerTMA;
                    var corDestSetor   = ultimoCorSetor || '#00e5ff';
                    var dashDestSetor  = ultimoDashSetor || '4, 4';
                    var bgDestSetor    = ultimoBgSetor || 'rgba(0, 20, 25, 0.95)';
                    var nomeDestSetor  = ultimoNomeSetor || (eLinhaContinua ? "" : tok1.toUpperCase());

                    desenharLinhaGeral(linha, coords, layerDestSetor, corDestSetor, 1.6, 0.85, contagemNomes, true, motorCanvas, dashDestSetor, bgDestSetor, nomeDestSetor);
                }
                // 4. AEROVIAS SUPERIORES [HIGH AIRWAY]
                else if (secaoAtual.indexOf('[HIGH AIRWAY') === 0 || secaoAtual.indexOf('[UPPER') === 0) {
                    desenharLinhaGeral(linha, coords, layerHigh, '#e0e0e0', 1.2, 0.7, contagemNomes, true, motorCanvas);
                }
                // 5. PISTAS [RUNWAY]
                else if (secaoAtual.indexOf('[RUNWAY') === 0 || secaoAtual.indexOf('[PISTA') === 0 || secaoAtual.indexOf('[RWY') === 0) {
                    desenharLinhaGeral(linha, coords, layerRunway, '#ff0000', 2.2, 1.0, contagemNomes, false, motorCanvas);
                }
                // 6. AUXÍLIOS E AEROPORTOS [VOR / NDB / AIRPORT]
                else if (secaoAtual.indexOf('[VOR') === 0 || secaoAtual.indexOf('[NDB') === 0 || secaoAtual.indexOf('[AIRPORT') === 0) {
                    desenharPontoGeral(linha, coords, layerVOR, '#00ffff', 4, true, motorCanvas);
                }
                // 7. FIXOS DE NAVEGAÇÃO [FIXES]
                else if (secaoAtual.indexOf('[FIXES') === 0 || secaoAtual.indexOf('[FIX') === 0 || secaoAtual.indexOf('[WAYPOINT') === 0) {
                    if (coords.length >= 2) {
                        var latF = sctParaDecimal(coords[0]);
                        var lonF = sctParaDecimal(coords[1]);
                        if (latF !== null && lonF !== null) {
                            var partesF = linha.trim().split(/\s+/);
                            var nomeF = (partesF[0] || "FIX").replace(/^[;\/]+/g, '').trim();
                            bancoFixos.push({ lat: latF, lon: lonF, nome: nomeF });
                        }
                    }
                }
                // 8. PROCEDIMENTOS DE TERMINAL [SID / STAR]
                else if (secaoAtual.indexOf('[SID') === 0 || secaoAtual.indexOf('[DEP') === 0 || secaoAtual.indexOf('[SAIDA') === 0 || secaoAtual.indexOf('[STAR') === 0 || secaoAtual.indexOf('[ARR') === 0 || secaoAtual.indexOf('[CHEGADA') === 0) {
                    var tipoProc = (secaoAtual.indexOf('[SID') === 0 || secaoAtual.indexOf('[DEP') === 0 || secaoAtual.indexOf('[SAIDA') === 0) ? 'SID' : 'STAR';
                    
                    if (!eLinhaContinua) {
                        if (tok1.indexOf('_') !== -1) {
                            var pedacos = tok1.split('_');
                            var possivelIcao = pedacos[0].toUpperCase();
                            if (/^[A-Z]{4}$/.test(possivelIcao)) {
                                ultimoIcaoProc = possivelIcao;
                                ultimoNomeProc = pedacos.slice(1).join('_').toUpperCase();
                            } else {
                                ultimoNomeProc = tok1.toUpperCase();
                            }
                        } else if (/^[A-Z]{4}$/i.test(tok1) && tok2 && !/^[NSEW]\d/i.test(tok2)) {
                            ultimoIcaoProc = tok1.toUpperCase();
                            ultimoNomeProc = tok2.toUpperCase();
                        } else {
                            ultimoNomeProc = tok1.toUpperCase();
                            var matchIcao = tok1.match(/^([S|K|E|L|M|U|V|C|P|Z|R][A-Z]{3})/i);
                            if (matchIcao) {
                                ultimoIcaoProc = matchIcao[1].toUpperCase();
                            }
                        }
                    }

                    var icao = ultimoIcaoProc;
                    var nomeProc = ultimoNomeProc;

                    if (!bancoProcedimentos[icao]) bancoProcedimentos[icao] = { SID: {}, STAR: {} };
                    if (!bancoProcedimentos[icao][tipoProc][nomeProc]) {
                        bancoProcedimentos[icao][tipoProc][nomeProc] = { layer: L.layerGroup(), segs: 0 };
                    }

                    var procObj = bancoProcedimentos[icao][tipoProc][nomeProc];
                    procObj.segs++;
                    var corProc = (tipoProc === 'SID') ? '#ffff00' : '#ff3399';

                    var pontosProc = [];
                    for (var c = 0; c <= coords.length - 2; c += 2) {
                        var latP = sctParaDecimal(coords[c]);
                        var lonP = sctParaDecimal(coords[c+1]);
                        if (latP !== null && lonP !== null) pontosProc.push([latP, lonP]);
                    }
                    if (pontosProc.length >= 2) {
                        var optsProc = { color: corProc, weight: 1.8, opacity: 0.9, interactive: false };
                        if (motorCanvas) optsProc.renderer = motorCanvas;
                        
                        var poliProc = L.polyline(pontosProc, optsProc);
                        if (procObj.segs === 1) {
                            var htmlBadge = '<span style="color: ' + corProc + '; background: rgba(0, 12, 12, 0.92); padding: 2px 5px; border: 1px solid ' + corProc + '; border-radius: 2px; font-size: 10px; font-weight: bold; font-family: Consolas, monospace; white-space: nowrap; text-shadow: 1px 1px 1px #000; box-shadow: 0 0 5px rgba(0,0,0,0.8);">' + nomeProc + '</span>';
                            poliProc.bindTooltip(htmlBadge, { permanent: true, direction: 'center', className: 'sagitario-label-transparente' });
                        }
                        poliProc.addTo(procObj.layer);
                    }
                }
            }

            layerFIR.addTo(mapaNativo);
            layerTMA.addTo(mapaNativo);
            layerSUA.addTo(mapaNativo);
            layerHigh.addTo(mapaNativo);
            layerLow.addTo(mapaNativo);
            layerRunway.addTo(mapaNativo);
            layerGeo.addTo(mapaNativo);
            layerVOR.addTo(mapaNativo);

            // Menu de Camadas Limpo e Reestruturado
            var camadasGerais = {
                "🌐 Setores FIR / ARTCC": layerFIR,
                "🔷 Setores Terminais & Corredores (VFR)": layerTMA,
                "🛡️ Áreas Restritas / Perigo (SUA)": layerSUA,
                "⚪ Aerovias Superiores": layerHigh,
                "🟠 Aerovias Inferiores": layerLow,
                "🔴 Pistas / Runways": layerRunway,
                "🗺️ Geografia / Litoral": layerGeo,
                "🔷 VOR / NDB / Aeroportos": layerVOR,
                "▫️ Fixos de Navegação (Fixes)": layerFixes
            };
            L.control.layers(null, camadasGerais, { collapsed: true, position: 'topright' }).addTo(mapaNativo);

            function atualizarFixosTela() {
                if (!mapaNativo.hasLayer(layerFixes)) return;
                
                var zoomAtual = mapaNativo.getZoom();
                if (zoomAtual < 7) {
                    layerFixes.clearLayers();
                    return;
                }

                var bounds = mapaNativo.getBounds().pad(0.15);
                layerFixes.clearLayers();

                var delta = 0.10 / Math.pow(2, zoomAtual - 6);
                var limitePlotagem = 0;
                var textoPermanente = (zoomAtual >= 8);

                for (var f = 0; f < bancoFixos.length; f++) {
                    var fixo = bancoFixos[f];
                    if (bounds.contains([fixo.lat, fixo.lon])) {
                        if (limitePlotagem++ > 300) continue;

                        var pontosTriangulo = [
                            [fixo.lat + (delta * 1.1), fixo.lon],
                            [fixo.lat - (delta * 0.6), fixo.lon - delta],
                            [fixo.lat - (delta * 0.6), fixo.lon + delta]
                        ];

                        var optsTri = {
                            color: '#b84dff',
                            fillColor: '#b84dff',
                            fillOpacity: 0.75,
                            weight: 1.5,
                            interactive: true
                        };
                        if (motorCanvas) optsTri.renderer = motorCanvas;

                        var tri = L.polygon(pontosTriangulo, optsTri);

                        var htmlFixo = '<span style="color: #e699ff; background: rgba(0, 0, 0, 0.45); padding: 1px 3px; border-radius: 2px; font-size: 9.5px; font-weight: bold; font-family: Consolas, monospace; white-space: nowrap; text-shadow: 1px 1px 1px #000, -1px -1px 1px #000;">' + fixo.nome + '</span>';

                        tri.bindTooltip(htmlFixo, {
                            permanent: textoPermanente,
                            direction: 'right',
                            offset: [2, 0],
                            className: 'sagitario-label-transparente'
                        });

                        tri.addTo(layerFixes);
                    }
                }
            }

            mapaNativo.on('moveend zoomend', function() {
                atualizarFixosTela();
            });
            mapaNativo.on('overlayadd', function(e) {
                if (e.layer === layerFixes || (e.name && e.name.indexOf('Fixos') !== -1)) {
                    atualizarFixosTela();
                }
            });
            atualizarFixosTela();

            var PainelTerminal = L.Control.extend({
                options: { position: 'bottomleft' },
                onAdd: function(map) {
                    var div = L.DomUtil.create('div', 'sagitario-painel-terminal');
                    div.innerHTML = `
                        <div style="background: rgba(18, 19, 19, 0.95); border: 1px solid #00ff66; padding: 8px; border-radius: 3px; font-family: Consolas, monospace; color: #00ff66; width: 270px; box-shadow: 0 0 15px rgba(0,0,0,0.8);">
                            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #00ff66; padding-bottom: 5px; margin-bottom: 8px;">
                                <span style="font-weight: bold; font-size: 11px; color: #00ffff;">✈️ TERMINAL ATC (SID / STAR)</span>
                                <button id="btn-min-sagitario" style="background: none; border: 1px solid #00ff66; color: #00ff66; cursor: pointer; font-size: 10px; padding: 0px 5px; font-weight: bold;">_</button>
                            </div>
                            <div id="corpo-painel-sagitario">
                                <label style="font-size: 10px; color: #ccc;">SELECIONE O AEROPORTO:</label>
                                <select id="sel-aeroporto-sagitario" style="width: 100%; background: #000; color: #00ffff; border: 1px solid #00ff66; padding: 4px; margin-top: 3px; font-family: Consolas, monospace; font-size: 12px; font-weight: bold; cursor: pointer;"></select>
                                
                                <div style="display: flex; margin: 8px 0; gap: 5px;">
                                    <button id="tab-sid-sagitario" style="flex: 1; background: rgba(255,255,0,0.25); border: 1px solid #ffff00; color: #ffff00; padding: 5px; font-weight: bold; cursor: pointer; font-size: 10px;">🟡 SAÍDAS (SID)</button>
                                    <button id="tab-star-sagitario" style="flex: 1; background: rgba(255,51,153,0.1); border: 1px solid #ff3399; color: #ff3399; padding: 5px; font-weight: bold; cursor: pointer; font-size: 10px;">🟣 CHEGADAS (STAR)</button>
                                </div>
                                
                                <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 10px;">
                                    <span id="btn-marcar-todos" style="color: #00ffff; cursor: pointer; text-decoration: underline;">+ Marcar Todos</span>
                                    <span id="btn-desmarcar-todos" style="color: #ff3333; cursor: pointer; text-decoration: underline;">- Desmarcar Todos</span>
                                </div>
                                
                                <div id="lista-procedimentos-sagitario" style="max-height: 160px; overflow-y: auto; border: 1px solid rgba(0,255,102,0.3); padding: 5px; background: rgba(0,0,0,0.7); margin-bottom: 8px;"></div>
                                
                                <div style="text-align: center; border-top: 1px dashed rgba(0,255,102,0.3); padding-top: 6px;">
                                    <span id="btn-limpar-geral" style="color: #ff9900; cursor: pointer; font-size: 10px; font-weight: bold; text-decoration: underline;">🧹 LIMPAR TODAS DA TELA (GERAL)</span>
                                </div>
                            </div>
                        </div>
                    `;

                    L.DomEvent.disableClickPropagation(div);
                    L.DomEvent.disableScrollPropagation(div);

                    setTimeout(function() {
                        var icaos = Object.keys(bancoProcedimentos).sort();
                        var selAero = div.querySelector('#sel-aeroporto-sagitario');
                        
                        for (var idx = 0; idx < icaos.length; idx++) {
                            var ic = icaos[idx];
                            var nSid = Object.keys(bancoProcedimentos[ic].SID).length;
                            var nStar = Object.keys(bancoProcedimentos[ic].STAR).length;
                            if (nSid + nStar > 0 && ic !== "OUTROS") {
                                var opt = document.createElement('option');
                                opt.value = ic;
                                opt.textContent = ic + ' (' + nSid + ' SID | ' + nStar + ' STAR)';
                                selAero.appendChild(opt);
                            }
                        }

                        var abaAtual = 'SID';
                        var aeroAtual = selAero.value || '';
                        var listaContainer = div.querySelector('#lista-procedimentos-sagitario');

                        function renderizarLista() {
                            listaContainer.innerHTML = '';
                            if (!aeroAtual || !bancoProcedimentos[aeroAtual]) return;
                            
                            var procs = bancoProcedimentos[aeroAtual][abaAtual];
                            var nomes = Object.keys(procs).sort();
                            
                            if (nomes.length === 0) {
                                listaContainer.innerHTML = '<div style="color: #888; text-align: center; font-size: 10px; padding: 10px;">Nenhum procedimento disponível</div>';
                                return;
                            }

                            for (var n = 0; n < nomes.length; n++) {
                                var nm = nomes[n];
                                var item = document.createElement('div');
                                item.style.cssText = "display: flex; align-items: center; margin-bottom: 4px; cursor: pointer;";
                                
                                var chk = document.createElement('input');
                                chk.type = 'checkbox';
                                chk.value = nm;
                                chk.style.marginRight = '6px';
                                chk.style.cursor = 'pointer';
                                if (map.hasLayer(procs[nm].layer)) chk.checked = true;
                                
                                chk.onchange = function() {
                                    var cam = procs[this.value].layer;
                                    if (this.checked) map.addLayer(cam);
                                    else map.removeLayer(cam);
                                };

                                var txt = document.createElement('span');
                                txt.textContent = nm;
                                txt.style.cssText = "font-size: 11px; color: " + (abaAtual === 'SID' ? '#ffff00' : '#ff3399') + "; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;";

                                item.appendChild(chk);
                                item.appendChild(txt);
                                item.onclick = function(e) {
                                    if (e.target !== this.querySelector('input')) {
                                        var box = this.querySelector('input');
                                        box.checked = !box.checked;
                                        box.onchange();
                                    }
                                };
                                listaContainer.appendChild(item);
                            }
                        }

                        selAero.onchange = function() { aeroAtual = this.value; renderizarLista(); };
                        
                        div.querySelector('#tab-sid-sagitario').onclick = function() {
                            abaAtual = 'SID';
                            this.style.background = 'rgba(255,255,0,0.25)';
                            div.querySelector('#tab-star-sagitario').style.background = 'rgba(255,51,153,0.1)';
                            renderizarLista();
                        };
                        div.querySelector('#tab-star-sagitario').onclick = function() {
                            abaAtual = 'STAR';
                            this.style.background = 'rgba(255,51,153,0.25)';
                            div.querySelector('#tab-sid-sagitario').style.background = 'rgba(255,255,0,0.1)';
                            renderizarLista();
                        };

                        div.querySelector('#btn-marcar-todos').onclick = function() {
                            var chks = listaContainer.querySelectorAll('input[type="checkbox"]');
                            for (var c = 0; c < chks.length; c++) {
                                if (!chks[c].checked) { chks[c].checked = true; chks[c].onchange(); }
                            }
                        };
                        div.querySelector('#btn-desmarcar-todos').onclick = function() {
                            var chks = listaContainer.querySelectorAll('input[type="checkbox"]');
                            for (var c = 0; c < chks.length; c++) {
                                if (chks[c].checked) { chks[c].checked = false; chks[c].onchange(); }
                            }
                        };

                        div.querySelector('#btn-limpar-geral').onclick = function() {
                            for (var ic in bancoProcedimentos) {
                                for (var tp in bancoProcedimentos[ic]) {
                                    for (var pr in bancoProcedimentos[ic][tp]) {
                                        map.removeLayer(bancoProcedimentos[ic][tp][pr].layer);
                                    }
                                }
                            }
                            renderizarLista();
                        };

                        var minimizado = false;
                        div.querySelector('#btn-min-sagitario').onclick = function() {
                            minimizado = !minimizado;
                            div.querySelector('#corpo-painel-sagitario').style.display = minimizado ? 'none' : 'block';
                            this.textContent = minimizado ? '□' : '_';
                        };

                        renderizarLista();
                    }, 200);

                    return div;
                }
            });

            mapaNativo.addControl(new PainelTerminal());
            console.log("[SAGITARIO] Roteamento Blindado de Camadas (Aerovias / TMA / VFR / SUA) carregado com sucesso!");
            return true;
        }
        return false;
    }

    var tentativas = 0;
    var timer = setInterval(function() {
        tentativas++;
        if (injetarRadarLeaflet() || tentativas >= 60) {
            clearInterval(timer);
        }
    }, 500);
})();
</script>