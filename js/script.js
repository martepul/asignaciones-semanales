// --- ESTADO Y PERSISTENCIA ---
// Nueva variable para controlar la visibilidad de los detalles del discurso
let incluirExtrasSabado = localStorage.getItem('incluirExtrasSabado') !== 'false';

let configEtiquetas = JSON.parse(localStorage.getItem('configEtiquetas_v2')) || [
    { id: "P", desc: "Presidencia", columnas: ["presidencia", "plataforma"] },
    { id: "A", desc: "Acomodador", columnas: ["Entrada", "Auditorio", "Estacionamiento"] },
    { id: "L", desc: "Lector", columnas: ["lector"] },
    { id: "AV", desc: "Audio/Video", columnas: ["audio_video", "camara"] }
];

let participantesData = JSON.parse(localStorage.getItem('participantesData_v2'));

// Migración de datos antiguos (Listas separadas -> Lista única con etiquetas)
if (!participantesData) {
    participantesData = [];
    let listasAntiguas = JSON.parse(localStorage.getItem('listas_participantes_v1'));

    if (listasAntiguas) {
        let mapNombres = {};
        Object.keys(listasAntiguas).forEach(listaName => {
            listasAntiguas[listaName].forEach(nombre => {
                if (!mapNombres[nombre]) mapNombres[nombre] = new Set();
                if (listaName === 'presidencia' || listaName === 'plataforma') mapNombres[nombre].add('P');
                if (listaName === 'audio_video' || listaName === 'camara') mapNombres[nombre].add('AV');
            });
        });

        Object.keys(mapNombres).forEach(nombre => {
            participantesData.push({ nombre: nombre, tags: Array.from(mapNombres[nombre]) });
        });

        if (listasAntiguas.general) {
            listasAntiguas.general.forEach(nombre => {
                if (!participantesData.find(p => p.nombre === nombre)) {
                    participantesData.push({ nombre: nombre, tags: [] });
                }
            });
        }
    }
    localStorage.setItem('participantesData_v2', JSON.stringify(participantesData));
}

let manuales = JSON.parse(localStorage.getItem('manuales_v3')) || {};
let bloqueados = JSON.parse(localStorage.getItem('bloqueados_v1')) || {};
let sabadoData = JSON.parse(localStorage.getItem('sabadoData_v1')) || {};
let asignaciones = {};
let columnasElegidas = JSON.parse(localStorage.getItem('columnasElegidas_v1')) || [];
let listaBosquejos = JSON.parse(localStorage.getItem('listaBosquejos_v1')) || [];

// --- DICCIONARIO DE CATEGORÍAS DE BOSQUEJOS ---
const CATEGORIAS_BOSQUEJOS = {
    "Biblia/Dios": [4, 26, 37, 54, 63, 70, 76, 80, 88, 99, 101, 114, 124, 133, 134, 139, 145, 164, 169, 175, 187],
    "Evangelización/Ministerio": [17, 66, 81],
    "Familia/Jóvenes": [5, 13, 27, 28, 29, 30, 104, 110, 113, 118, 146, 190],
    "Fe/Espiritualidad": [1, 9, 16, 18, 22, 31, 44, 46, 60, 67, 71, 74, 87, 142, 147, 148, 151, 158, 159, 168, 172, 173, 189, 192],
    "Mundo, No ser parte del": [11, 25, 33, 39, 51, 53, 59, 64, 79, 97, 107, 115, 116, 119, 123, 131, 138, 160, 167, 178, 179, 183, 191],
    "Normas y cualidades cristianas": [7, 10, 12, 14, 15, 42, 48, 68, 69, 72, 75, 77, 78, 100, 103, 112, 144, 156, 157, 165, 171, 185],
    "Pruebas/Problemas": [32, 50, 57, 65, 73, 93, 105, 108, 117, 141, 143, 177, 184, 186, 194],
    "Reino/Paraíso": [19, 21, 23, 24, 35, 47, 49, 61, 62, 85, 90, 91, 109, 111, 120, 122, 130, 132, 154, 162, 170, 174, 180, 182],
    "Religión/Adoración": [3, 8, 36, 43, 45, 52, 55, 56, 58, 82, 83, 86, 89, 92, 94, 95, 96, 125, 126, 127, 128, 129, 135, 136, 137, 140, 149, 161, 163, 166, 188],
    "Últimos días/Juicio de Dios": [2, 6, 20, 34, 38, 40, 41, 84, 98, 102, 106, 121, 150, 152, 153, 155, 176, 181, 193]
};

function obtenerCategoriaBosquejo(numeroStr) {
    const num = parseInt(numeroStr);
    for (const [categoria, numeros] of Object.entries(CATEGORIAS_BOSQUEJOS)) {
        if (numeros.includes(num)) {
            return categoria;
        }
    }
    return "Otros"; // Por si añades un bosquejo especial o un número nuevo
}

document.addEventListener('DOMContentLoaded', () => {
    applyTheme();

    // Sincronizar checkbox de extras
    const checkExtras = document.getElementById('checkIncluirExtras');
    if (checkExtras) checkExtras.checked = incluirExtrasSabado;

    const themeButton = document.getElementById('btn-theme');
    if (themeButton) themeButton.addEventListener('click', toggleTheme);

    const savedTitle = localStorage.getItem('pdfTitle');
    const titleInput = document.getElementById('pdfTitle');
    if (savedTitle && titleInput) titleInput.value = savedTitle;
    if (titleInput) titleInput.addEventListener('input', () => localStorage.setItem('pdfTitle', titleInput.value));

    const diasCheckboxes = document.querySelectorAll('.dia-check');
    const savedDias = JSON.parse(localStorage.getItem('savedDias')) || [];
    if (savedDias.length > 0) {
        diasCheckboxes.forEach(check => {
            check.checked = savedDias.includes(parseInt(check.value));
        });
    }

    diasCheckboxes.forEach(check => {
        check.addEventListener('change', () => {
            actualizarTodo();
            guardarSeleccionDias();
        });
    });

    document.getElementById('fechaInicio').value = new Date().toISOString().split('T')[0];

    document.querySelectorAll('.col-check').forEach(check => {
        const rol = check.value;
        const colGuardada = columnasElegidas.find(c => c.id === rol);

        if (colGuardada) {
            check.checked = true;
            const numInput = document.querySelector(`.col-num[data-rol="${rol}"]`);
            if (numInput) numInput.value = colGuardada.cantidad;
        } else {
            check.checked = false;
        }

        check.addEventListener('change', function () { manejarSeleccionColumna(this); });
    });

    document.querySelectorAll('.col-num').forEach(numInput => {
        numInput.addEventListener('change', () => {
            if (columnasElegidas.length > 0) {
                actualizarDatosColumnas();
                actualizarTodo();
            }
        });
    });

    // Cargar Eventos para Importar Archivos (Asegúrate de tener estos inputs en tu HTML)
    const fileParticipantes = document.getElementById('fileParticipantes');
    if (fileParticipantes) fileParticipantes.addEventListener('change', (e) => importarDesdeArchivo(e, 'participante'));

    const fileBosquejos = document.getElementById('fileBosquejos');
    if (fileBosquejos) fileBosquejos.addEventListener('change', (e) => importarDesdeArchivo(e, 'bosquejo'));

    ajustarPorComboDias();
});

// --- FUNCIONES DE INTERFAZ ---

function toggleExtrasSabado(valor) {
    incluirExtrasSabado = valor;
    localStorage.setItem('incluirExtrasSabado', valor);
    actualizarTodo();
}

function manejarSeleccionColumna(checkbox) {
    if (checkbox.checked) {
        const rol = checkbox.value;
        const label = checkbox.dataset.label;
        const cant = parseInt(document.querySelector(`.col-num[data-rol="${rol}"]`).value) || 1;
        columnasElegidas.push({ id: rol, label: label, cantidad: cant });
    } else {
        columnasElegidas = columnasElegidas.filter(c => c.id !== checkbox.value);
    }
    actualizarTodo();
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

function applyTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
}

function toggleSidebar() {
    const layout = document.querySelector('.main-layout');
    const btn = document.getElementById('toggleSidebar');
    const icon = document.getElementById('sidebarIcon');
    const text = document.getElementById('sidebarText');
    if (!layout) return;
    const isHidden = layout.classList.toggle('sidebar-hidden');
    if (btn) {
        btn.classList.toggle('sidebar-hidden-active', isHidden);
        if (icon) icon.innerText = isHidden ? "➡️" : "⬅️";
        if (text) text.innerText = isHidden ? "Mostrar Panel" : "Ocultar Panel";
    }
    setTimeout(() => { actualizarTodo(); }, 300);
}

// --- LOGICA DE PARTICIPANTES ---

function actualizarVistaParticipantes() {
    const listaUL = document.getElementById('listaParticipantes');
    if (!listaUL) return;
    listaUL.innerHTML = participantesData.map((p, idx) => {
        const tagsHtml = configEtiquetas.map(eti => {
            const isActive = p.tags.includes(eti.id) ? 'active' : '';
            return `<button class="tag-btn ${isActive}" title="${eti.desc}" onclick="toggleTag(${idx}, '${eti.id}')">${eti.id}</button>`;
        }).join('');

        return `
        <li class="participant-row">
            <div class="participant-top">
                <span>${p.nombre}</span>
                <div>
                    <button onclick="editarParticipante(${idx})">✎</button>
                    <button onclick="eliminarParticipante(${idx})">×</button>
                </div>
            </div>
            <div class="participant-tags">${tagsHtml}</div>
        </li>`;
    }).join('');
}

function toggleTag(participanteIdx, tagId) {
    const p = participantesData[participanteIdx];
    if (p.tags.includes(tagId)) {
        p.tags = p.tags.filter(t => t !== tagId);
    } else {
        p.tags.push(tagId);
    }
    guardarParticipantes();
    actualizarVistaParticipantes();
    actualizarTodo();
}

function agregarParticipante() {
    const input = document.getElementById('nuevoNombre');
    const nombre = input.value.trim();
    if (nombre && !participantesData.some(p => p.nombre.toLowerCase() === nombre.toLowerCase())) {
        participantesData.push({ nombre: nombre, tags: [] });
        input.value = '';
        guardarParticipantes();
        actualizarVistaParticipantes();
        actualizarTodo();
    }
}

function editarParticipante(index) {
    const nombreAntiguo = participantesData[index].nombre;
    const nuevoNombre = prompt("Editar nombre:", nombreAntiguo);

    if (nuevoNombre && nuevoNombre.trim() !== "" && nuevoNombre !== nombreAntiguo) {
        const nombreLimpio = nuevoNombre.trim();
        participantesData[index].nombre = nombreLimpio;

        Object.keys(manuales).forEach(fechaId => {
            Object.keys(manuales[fechaId]).forEach(rol => {
                if (manuales[fechaId][rol] === nombreAntiguo) manuales[fechaId][rol] = nombreLimpio;
            });
        });
        Object.keys(asignaciones).forEach(fechaId => {
            Object.keys(asignaciones[fechaId]).forEach(rol => {
                if (asignaciones[fechaId][rol] === nombreAntiguo) asignaciones[fechaId][rol] = nombreLimpio;
            });
        });

        localStorage.setItem('manuales_v3', JSON.stringify(manuales));
        guardarParticipantes();
        actualizarTodo();
    }
}

function eliminarParticipante(index) {
    if (confirm("¿Eliminar a " + participantesData[index].nombre + "?")) {
        participantesData.splice(index, 1);
        guardarParticipantes();
        actualizarTodo();
    }
}

function guardarParticipantes() {
    localStorage.setItem('participantesData_v2', JSON.stringify(participantesData));
}

// --- LOGICA DE IMPORTACIÓN MULTI-VALOR ---

function importarDesdeArchivo(evento, tipo) {
    const archivo = evento.target.files[0];
    if (!archivo) return;

    const lector = new FileReader();
    lector.onload = function (e) {
        const contenido = e.target.result;
        const lineas = contenido.split(/\r?\n/);
        let agregados = 0;

        lineas.forEach(linea => {
            const lineaLimpia = linea.trim();
            if (lineaLimpia === "") return;

            if (tipo === 'participante') {
                const partes = lineaLimpia.split(',').map(p => p.trim()).filter(p => p !== "");
                const nombre = partes[0];
                if (nombre && !participantesData.some(p => p.nombre.toLowerCase() === nombre.toLowerCase())) {
                    participantesData.push({ nombre: nombre, tags: [] });
                    agregados++;
                }
            }
            else if (tipo === 'bosquejo') {
                // Lógica para detectar "N° 26, ¿Le importamos a Dios?" o similares
                const partes = lineaLimpia.split(',');
                if (partes.length >= 2) {
                    // Extraer solo los números de la primera parte (Ej: "N° 26" -> "26")
                    const numStr = partes[0].replace(/[^0-9]/g, '');
                    // Unir el resto en caso de que el tema contenga comas
                    const temaStr = partes.slice(1).join(',').trim();

                    if (numStr && temaStr) {
                        if (!listaBosquejos.some(b => b.numero === numStr)) {
                            listaBosquejos.push({ numero: numStr, tema: temaStr });
                            agregados++;
                        }
                    }
                }
            }
        });

        if (agregados > 0) {
            if (tipo === 'participante') {
                participantesData.sort((a, b) => a.nombre.localeCompare(b.nombre));
                guardarParticipantes();
                actualizarVistaParticipantes();
            } else if (tipo === 'bosquejo') {
                listaBosquejos.sort((a, b) => parseInt(a.numero) - parseInt(b.numero));
                localStorage.setItem('listaBosquejos_v1', JSON.stringify(listaBosquejos));
                actualizarVistaBosquejos();
            }
            actualizarTodo();
            alert(`¡Éxito! Se procesaron y añadieron ${agregados} elementos.`);
        } else {
            alert("No se añadieron elementos nuevos. Es posible que ya existan o el formato no sea válido.");
        }
        evento.target.value = ""; // Limpiar input file
    };
    lector.readAsText(archivo);
}

// --- LOGICA DE ETIQUETAS (MODAL) ---

function abrirModalEtiquetas() {
    document.getElementById('modalEtiquetas').style.display = 'flex';

    const todasLasColumnas = document.querySelectorAll('.col-check');
    const checkContenedor = document.getElementById('checkColumnasEtiqueta');
    checkContenedor.innerHTML = Array.from(todasLasColumnas).map(c => `
        <label><input type="checkbox" class="new-tag-col" value="${c.value}"> ${c.dataset.label}</label>
    `).join('');

    renderizarEtiquetasModal();
}

function cerrarModalEtiquetas() {
    document.getElementById('modalEtiquetas').style.display = 'none';
    actualizarVistaParticipantes();
    actualizarTodo();
}

function renderizarEtiquetasModal() {
    const contenedor = document.getElementById('listaEtiquetasModal');
    contenedor.innerHTML = configEtiquetas.map((eti, idx) => `
        <div class="modal-tag-item">
            <div>
                <strong>${eti.id}</strong> - ${eti.desc} <br>
                <span style="font-size: 0.75rem; color: gray;">Columnas: ${eti.columnas.join(', ')}</span>
            </div>
            <button class="btn-cancel" onclick="eliminarEtiqueta(${idx})" style="padding: 4px 8px;">Borrar</button>
        </div>
    `).join('');
}

function guardarNuevaEtiqueta() {
    const idStr = document.getElementById('nuevaEtiquetaSigla').value.trim().toUpperCase();
    const descStr = document.getElementById('nuevaEtiquetaDesc').value.trim();
    const colsSeleccionadas = Array.from(document.querySelectorAll('.new-tag-col:checked')).map(cb => cb.value);

    if (!idStr || !descStr || colsSeleccionadas.length === 0) {
        alert("Llena la sigla, la descripción y selecciona al menos una columna.");
        return;
    }

    if (configEtiquetas.some(e => e.id === idStr)) {
        alert("Esa sigla ya existe.");
        return;
    }

    configEtiquetas.push({ id: idStr, desc: descStr, columnas: colsSeleccionadas });
    localStorage.setItem('configEtiquetas_v2', JSON.stringify(configEtiquetas));

    document.getElementById('nuevaEtiquetaSigla').value = '';
    document.getElementById('nuevaEtiquetaDesc').value = '';
    document.querySelectorAll('.new-tag-col').forEach(cb => cb.checked = false);

    renderizarEtiquetasModal();
}

function eliminarEtiqueta(idx) {
    const etiquetaId = configEtiquetas[idx].id;
    if (confirm(`¿Borrar la etiqueta ${etiquetaId}?`)) {
        configEtiquetas.splice(idx, 1);
        localStorage.setItem('configEtiquetas_v2', JSON.stringify(configEtiquetas));

        participantesData.forEach(p => {
            p.tags = p.tags.filter(t => t !== etiquetaId);
        });
        guardarParticipantes();
        renderizarEtiquetasModal();
    }
}

// --- LÓGICA DE BOSQUEJOS ---

function actualizarVistaBosquejos() {
    const listaUL = document.getElementById('listaBosquejos');
    if (!listaUL) return;

    listaUL.innerHTML = ''; // Limpiar la lista

    // 1. Agrupar los bosquejos importados/añadidos por categoría
    const grupos = {};
    listaBosquejos.forEach((b, originalIndex) => {
        const categoria = obtenerCategoriaBosquejo(b.numero);
        if (!grupos[categoria]) grupos[categoria] = [];
        // Guardamos el índice original para que los botones de editar/eliminar funcionen perfecto
        grupos[categoria].push({ ...b, originalIndex });
    });

    // 2. Ordenar las categorías para que se vean estructuradas
    const categoriasOrdenadas = Object.keys(CATEGORIAS_BOSQUEJOS).concat(["Otros"]);

    let html = '';

    categoriasOrdenadas.forEach(cat => {
        if (grupos[cat] && grupos[cat].length > 0) {
            // Creamos un desplegable (<details>) para cada categoría
            html += `
            <li style="display:block; padding: 0; border: none; margin-bottom: 5px;">
                <details style="border: 1px solid var(--border); border-radius: 6px; background: var(--bg-secondary); overflow: hidden;">
                    <summary style="font-size: 0.85rem; font-weight: bold; cursor: pointer; padding: 8px; list-style-position: inside; color: var(--primary);">
                        📋 ${cat} (${grupos[cat].length})
                    </summary>
                    <ul style="list-style: none; padding: 0; margin: 0; background: var(--bg-main);">
            `;

            // Añadimos los bosquejos de esta categoría
            grupos[cat].forEach(b => {
                html += `
                    <li style="display:flex; justify-content:space-between; align-items:center; padding: 6px 10px; border-top:1px solid var(--border);">
                        <span style="font-size: 0.8em; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width: 75%;" title="${b.tema}">
                            <b>N° ${b.numero}</b>: ${b.tema}
                        </span>
                        <div style="display: flex; gap: 4px;">
                            <button class="btn-theme" style="padding: 2px 6px; font-size: 0.75rem;" onclick="editarBosquejo(${b.originalIndex})">✎</button>
                            <button class="btn-cancel" style="padding: 2px 6px; font-size: 0.75rem;" onclick="eliminarBosquejo(${b.originalIndex})">×</button>
                        </div>
                    </li>`;
            });

            html += `</ul></details></li>`;
        }
    });

    listaUL.innerHTML = html;
}

function agregarBosquejo() {
    const inputNum = document.getElementById('nuevoBosquejoNum');
    const numero = inputNum.value.trim();

    if (numero) {
        if (listaBosquejos.some(b => b.numero === numero)) {
            alert("Ese número de bosquejo ya existe.");
            return;
        }
        const tema = prompt(`Introduce el TEMA para el bosquejo N° ${numero}:`);
        if (tema !== null && tema.trim() !== "") {
            listaBosquejos.push({ numero: numero, tema: tema.trim() });
            listaBosquejos.sort((a, b) => parseInt(a.numero) - parseInt(b.numero));
            localStorage.setItem('listaBosquejos_v1', JSON.stringify(listaBosquejos));
            inputNum.value = '';
            actualizarTodo();
        }
    }
}

function editarBosquejo(index) {
    const b = listaBosquejos[index];
    const nuevoNumero = prompt("Editar N°:", b.numero);
    if (nuevoNumero === null) return;
    const nuevoTema = prompt("Editar tema:", b.tema);
    if (nuevoTema === null) return;
    listaBosquejos[index] = { numero: nuevoNumero.trim(), tema: nuevoTema.trim() };
    listaBosquejos.sort((a, b) => parseInt(a.numero) - parseInt(b.numero));
    localStorage.setItem('listaBosquejos_v1', JSON.stringify(listaBosquejos));
    actualizarTodo();
}

function eliminarBosquejo(index) {
    if (confirm(`¿Eliminar el bosquejo N° ${listaBosquejos[index].numero}?`)) {
        listaBosquejos.splice(index, 1);
        localStorage.setItem('listaBosquejos_v1', JSON.stringify(listaBosquejos));
        actualizarTodo();
    }
}

function seleccionarBosquejo(selectElement) {
    const id = selectElement.dataset.fechaId;
    const numeroSeleccionado = selectElement.value;
    guardarDatoSabado(selectElement);

    const bosquejoObj = listaBosquejos.find(b => b.numero === numeroSeleccionado);
    const inputTema = document.getElementById(`tema_${id}`);

    if (inputTema) {
        if (bosquejoObj) {
            inputTema.value = bosquejoObj.tema;
        } else if (numeroSeleccionado === "") {
            inputTema.value = "";
        }
        // Guardar el tema auto-rellenado también
        guardarDatoSabado(inputTema);
    }
}

// --- ASIGNACIONES Y TABLA ---

function guardarManual(fechaId, nombre, rol) {
    if (bloqueados[fechaId]) return;
    if (nombre !== "") {
        const manualHoy = manuales[fechaId] || {};
        const aleatorioHoy = asignaciones[fechaId] || {};
        const yaAsignado = Object.entries({ ...aleatorioHoy, ...manualHoy }).some(([key, val]) => val === nombre && key !== rol);
        if (yaAsignado) {
            alert(`¡Error! ${nombre} ya tiene una tarea asignada para este día.`);
            actualizarTodo();
            return;
        }
    }
    if (!manuales[fechaId]) manuales[fechaId] = {};
    if (nombre === "") delete manuales[fechaId][rol];
    else manuales[fechaId][rol] = nombre;
    localStorage.setItem('manuales_v3', JSON.stringify(manuales));
    actualizarTodo();
}

function toggleBloqueo(id) {
    bloqueados[id] = !bloqueados[id];
    localStorage.setItem('bloqueados_v1', JSON.stringify(bloqueados));
    actualizarTodo();
}

function borrarFila(id) {
    if (bloqueados[id]) return;
    if (asignaciones[id]) {
        delete asignaciones[id];
        actualizarTodo();
    }
}

function obtenerHabilitadosParaRol(rolBase) {
    const etiquetasPermitidas = configEtiquetas.filter(eti => eti.columnas.includes(rolBase)).map(eti => eti.id);
    if (etiquetasPermitidas.length === 0) return participantesData.map(p => p.nombre).sort();

    return participantesData
        .filter(p => p.tags.some(tag => etiquetasPermitidas.includes(tag)))
        .map(p => p.nombre)
        .sort((a, b) => a.localeCompare(b));
}

function asignarFila(id) {
    if (bloqueados[id]) return;

    let rolesPlano = [];
    columnasElegidas.forEach(col => {
        for (let i = 0; i < col.cantidad; i++) rolesPlano.push(`${col.id}_${i}`);
    });

    if (!asignaciones[id]) asignaciones[id] = {};
    let yaAsignadosHoy = Object.values(manuales[id] || {});

    rolesPlano.forEach(rolUnico => {
        if (!manuales[id]?.[rolUnico]) {
            const rolBase = rolUnico.substring(0, rolUnico.lastIndexOf('_'));
            const candidatos = obtenerHabilitadosParaRol(rolBase).filter(nombre => !yaAsignadosHoy.includes(nombre));

            if (candidatos.length > 0) {
                const elegido = candidatos[Math.floor(Math.random() * candidatos.length)];
                asignaciones[id][rolUnico] = elegido;
                yaAsignadosHoy.push(elegido);
            }
        }
    });
    actualizarTodo();
}

function actualizarBotonesDeLimpieza() {
    const contenedor = document.getElementById('contenedorBotonesDinamicos');
    if (!contenedor) return;
    contenedor.innerHTML = '';
    columnasElegidas.forEach(col => {
        const btn = document.createElement('button');
        btn.className = 'btn-clear';
        btn.innerHTML = `🗑️ ${col.label.substring(0, 4)}.`;
        btn.title = `Limpiar columna ${col.label}`;
        btn.onclick = () => { if (confirm(`¿Limpiar todas las asignaciones de ${col.label}?`)) limpiarColumna(col.id); };
        contenedor.appendChild(btn);
    });
}

function asignarAleatoriamente() {
    if (columnasElegidas.length === 0) { alert("⚠️ Selecciona al menos una columna."); return; }
    if (participantesData.length === 0) { alert("⚠️ No hay participantes."); return; }

    const fechas = generarFechas();
    fechas.forEach(f => {
        const id = f.toISOString().split('T')[0];
        asignarFila(id);
    });
}

function limpiarColumna(rolBase) {
    Object.keys(asignaciones).forEach(id => {
        if (asignaciones[id]) {
            Object.keys(asignaciones[id]).forEach(key => {
                if (key.startsWith(rolBase)) delete asignaciones[id][key];
            });
        }
    });
    actualizarTodo();
}

function limpiarAsignaciones() {
    if (confirm("¿Vaciar todas las asignaciones ALEATORIAS? (Las manuales se conservarán)")) {
        asignaciones = {};
        actualizarTodo();
    }
}

function obtenerDiasSeleccionados() {
    return Array.from(document.querySelectorAll('.dia-check:checked')).map(cb => parseInt(cb.value));
}

function generarFechas() {
    const inicioStr = document.getElementById('fechaInicio').value;
    const finalStr = document.getElementById('fechaFin').value;
    if (!inicioStr || !finalStr) return [];

    const lista = [];
    const diasPermitidos = obtenerDiasSeleccionados();
    let f = new Date(inicioStr + 'T00:00:00');
    const fEnd = new Date(finalStr + 'T00:00:00');

    if (fEnd < f) return [];
    while (f <= fEnd) {
        if (diasPermitidos.includes(f.getDay())) lista.push(new Date(f));
        f.setDate(f.getDate() + 1);
        if (lista.length > 60) break;
    }
    return lista;
}

function ajustarPorComboDias() {
    const inicioStr = document.getElementById('fechaInicio').value;
    const dias = document.getElementById('cantidadFechas').value;
    if (!inicioStr || dias === "custom") return;

    let fInicio = new Date(inicioStr + 'T00:00:00');
    let fFin = new Date(fInicio);
    fFin.setDate(fInicio.getDate() + (parseInt(dias) - 1));
    document.getElementById('fechaFin').value = fFin.toISOString().split('T')[0];
    actualizarTodo();
}

function manejarCambioFechaManual() {
    document.getElementById('cantidadFechas').value = "custom";
    actualizarTodo();
}

function actualizarDatosColumnas() {
    columnasElegidas.forEach(col => {
        const input = document.querySelector(`.col-num[data-rol="${col.id}"]`);
        if (input) col.cantidad = parseInt(input.value) || 1;
    });
}

function actualizarEncabezado() {
    let html = `<tr><th>Fecha / Día</th>`;
    columnasElegidas.forEach(col => html += `<th colspan="${col.cantidad}">${col.label}</th>`);
    html += `<th style="width: 40px;">🔒</th><th style="width: 40px;">➕</th><th style="width: 40px;">🗑️</th></tr>`;
    const thead = document.querySelector('#tablaAsignaciones thead');
    if (thead) thead.innerHTML = html;
}

function actualizarTodo() {
    localStorage.setItem('columnasElegidas_v1', JSON.stringify(columnasElegidas));

    actualizarVistaParticipantes();
    actualizarVistaBosquejos();
    actualizarBotonesDeLimpieza();
    actualizarEncabezado();

    let rolesPlano = [];
    columnasElegidas.forEach(col => {
        for (let i = 0; i < col.cantidad; i++) rolesPlano.push(`${col.id}_${i}`);
    });

    const tablaBody = document.getElementById('cuerpoTabla');
    if (!tablaBody) return;
    tablaBody.innerHTML = '';
    const fechas = generarFechas();
    let mesActual = -1;

    fechas.forEach(f => {
        if (f.getMonth() !== mesActual) {
            mesActual = f.getMonth();
            const nombreMes = f.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
            tablaBody.innerHTML += `<tr><td colspan="${rolesPlano.length + 4}" class="mes-header">📅 ${nombreMes}</td></tr>`;
        }

        const id = f.toISOString().split('T')[0];
        const estaBloqueado = bloqueados[id];

        let celdas = rolesPlano.map(rol => {
            const valor = manuales[id]?.[rol] || asignaciones[id]?.[rol] || "";
            const rolBase = rol.substring(0, rol.lastIndexOf('_'));
            const listaParaRol = obtenerHabilitadosParaRol(rolBase);

            return `<td>
                <select class="${manuales[id]?.[rol] ? 'manual-selected' : ''}" 
                        onchange="guardarManual('${id}', this.value, '${rol}')" ${estaBloqueado ? 'disabled' : ''}>
                    <option value="">--</option>
                    ${listaParaRol.map(n => `<option value="${n}" ${valor === n ? 'selected' : ''}>${n}</option>`).join('')}
                </select>
            </td>`;
        }).join('');

        const fila = document.createElement('tr');
        if (estaBloqueado) fila.className = 'locked-row';
        fila.innerHTML = `
            <td class="date-cell"><b>${f.toLocaleDateString('es-ES', { weekday: 'short' })}</b> ${f.toLocaleDateString('es-ES', { day: '2-digit' })}</td>
            ${celdas}
            <td><button onclick="toggleBloqueo('${id}')">${estaBloqueado ? '🔒' : '🔓'}</button></td>
            <td><button onclick="asignarFila('${id}')" ${estaBloqueado ? 'disabled' : ''}>+</button></td>
            <td><button onclick="borrarFila('${id}')" ${estaBloqueado ? 'disabled' : ''}>🗑️</button></td>`;
        tablaBody.appendChild(fila);

        // FILA EXTRA SOLO SI ESTÁ ACTIVADA
        if (incluirExtrasSabado && (f.getDay() === 6 || f.getDay() === 0)) {
            const totalColumnas = rolesPlano.length + 4;
            const sabadoFila = document.createElement('tr');
            sabadoFila.className = 'sabado-extra-row';
            const datosSabado = sabadoData[id] || {};

            sabadoFila.innerHTML = `
                <td colspan="${totalColumnas}" style="padding: 4px; background-color: var(--bg-secondary); border-top: 1px dashed var(--border-th);">
                    <div style="display: grid; grid-template-columns: 1.5fr 1fr 2fr 1.5fr; gap: 8px;">
                        <div>
                            <span style="font-size: 0.7rem; font-weight: bold; display: block; margin-bottom: 1px; color: var(--primary);">Conferenciante</span>
                            <input type="text" placeholder="Nombre..." value="${datosSabado.conferenciante || ''}" data-fecha-id="${id}" data-sabado-rol="conferenciante" onchange="guardarDatoSabado(this)">
                        </div>
                        <div>
                            <span style="font-size: 0.7rem; font-weight: bold; display: block; margin-bottom: 1px; color: var(--primary);">Bosquejo</span>
                            <select data-fecha-id="${id}" data-sabado-rol="bosquejo" onchange="seleccionarBosquejo(this)">
                                <option value="">-- Elegir --</option>
                                ${listaBosquejos.map(b => `<option value="${b.numero}" ${datosSabado.bosquejo === b.numero ? 'selected' : ''}>N° ${b.numero} - ${b.tema.length > 25 ? b.tema.substring(0, 25) + '...' : b.tema}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <span style="font-size: 0.7rem; font-weight: bold; display: block; margin-bottom: 1px; color: var(--primary);">Tema</span>
                            <input type="text" id="tema_${id}" placeholder="Título del tema..." value="${datosSabado.tema || ''}" data-fecha-id="${id}" data-sabado-rol="tema" onchange="guardarDatoSabado(this)">
                        </div>
                        <div>
                            <span style="font-size: 0.7rem; font-weight: bold; display: block; margin-bottom: 1px; color: var(--primary);">Hospitalidad</span>
                            <input type="text" placeholder="Asignado a..." value="${datosSabado.hospitalidad || ''}" data-fecha-id="${id}" data-sabado-rol="hospitalidad" onchange="guardarDatoSabado(this)">
                        </div>
                    </div>
                </td>
            `;
            tablaBody.appendChild(sabadoFila);
        }
    });
}

function exportarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // 1. OBTENER VALORES
    const tituloPrincipal = (document.getElementById('pdfTitle') ? document.getElementById('pdfTitle').value : 'PROGRAMA') || 'PROGRAMA';
    const subtituloPersonalizado = document.getElementById('pdfSubtitle') ? document.getElementById('pdfSubtitle').value : '';
    const estiloElegido = (document.getElementById('pdfStyle') ? document.getElementById('pdfStyle').value : 'moderno') || 'moderno';

    // 2. DICCIONARIO DE TEMAS SEGURO
    const temas = {
        moderno: { primary: [45, 69, 97], secondary: [245, 248, 250], text: [30, 30, 30], table: 'grid', accent: true },
        clasico: { primary: [0, 0, 0], secondary: [240, 240, 240], text: [0, 0, 0], table: 'striped', accent: false },
        minimalista: { primary: [60, 60, 60], secondary: [255, 255, 255], text: [40, 40, 40], table: 'plain', accent: false },
        corporativo: { primary: [0, 51, 102], secondary: [232, 241, 250], text: [20, 20, 20], table: 'grid', accent: true },
        oscuro: { primary: [40, 40, 40], secondary: [60, 60, 60], text: [50, 50, 50], table: 'grid', accent: true },
        bosque: { primary: [34, 94, 34], secondary: [240, 248, 240], text: [20, 40, 20], table: 'striped', accent: true },
        oceano: { primary: [0, 105, 148], secondary: [230, 245, 250], text: [0, 50, 70], table: 'grid', accent: true },
        vintage: { primary: [101, 67, 33], secondary: [245, 235, 215], text: [60, 30, 10], table: 'striped', accent: true },
        elegante: { primary: [88, 24, 31], secondary: [252, 248, 240], text: [50, 10, 10], table: 'grid', accent: true },
        industrial: { primary: [50, 50, 50], secondary: [230, 230, 230], text: [30, 30, 30], table: 'grid', accent: true, line: [255, 102, 0] },
        pastel: { primary: [180, 140, 200], secondary: [255, 250, 255], text: [100, 80, 120], table: 'striped', accent: true },
        energetico: { primary: [255, 204, 0], secondary: [255, 252, 230], text: [0, 0, 0], table: 'grid', accent: true, headerText: [0, 0, 0] }
    };

    const config = temas[estiloElegido] || temas.moderno;

    // 3. PREPARAR DATOS
    const rolesPlano = [];
    columnasElegidas.forEach(col => {
        for (let i = 0; i < col.cantidad; i++) rolesPlano.push(`${col.id}_${i}`);
    });

    if (rolesPlano.length === 0) {
        alert("Selecciona al menos una columna.");
        return;
    }

    const head = [[{ content: 'DÍA', styles: { halign: 'center' } }]];
    columnasElegidas.forEach(col => {
        head[0].push({ content: col.label.toUpperCase(), colSpan: col.cantidad, styles: { halign: 'center' } });
    });

    const fechas = generarFechas();
    const meses = {};
    fechas.forEach(f => {
        const nombreMes = f.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        if (!meses[nombreMes]) meses[nombreMes] = [];
        meses[nombreMes].push(f);
    });

    let currentY = 20;

    // 4. GENERACIÓN POR MES
    Object.keys(meses).forEach((nombreMes, index) => {
        if (index > 0 && currentY > pageHeight - 60) {
            doc.addPage();
            currentY = 20;
        }

        // Encabezado principal
        if (index === 0 || currentY === 20) {
            if (config.accent) {
                doc.setFillColor(...(config.line || config.primary));
                doc.rect(14, currentY - 6, 1.5, 12, 'F');
            }
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...config.text);
            doc.setFontSize(16);
            doc.text(tituloPrincipal.toUpperCase(), (config.accent ? 18 : 14), currentY);

            if (subtituloPersonalizado) {
                doc.setFont("helvetica", "normal");
                doc.setTextColor(100, 100, 100);
                doc.setFontSize(9);
                doc.text(subtituloPersonalizado, (config.accent ? 18 : 14), currentY + 6);
                currentY += 18;
            } else {
                currentY += 12;
            }
        }

        // Separador de Mes
        doc.setFillColor(...config.secondary);
        doc.rect(14, currentY, pageWidth - 28, 8, 'F');
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...(estiloElegido === 'clasico' ? [0, 0, 0] : config.primary));
        doc.setFontSize(10);
        doc.text(nombreMes.toUpperCase(), 18, currentY + 5.5);
        currentY += 10;

        const bodyMes = [];
        meses[nombreMes].forEach((f, i) => {
            const id = f.toISOString().split('T')[0];
            const diaStr = f.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit' }).replace('.', '').toUpperCase();
            const esFinde = f.getDay() === 6 || f.getDay() === 0;
            const colorFila = esFinde ? config.secondary : [255, 255, 255];

            const hasExtraRow = incluirExtrasSabado && esFinde && sabadoData[id];

            const mainLineWidth = hasExtraRow ? { top: 0.1, bottom: 0, left: 0.1, right: 0.1 } : { top: 0.1, bottom: 0.1, left: 0.1, right: 0.1 };

            const fila = [{
                content: diaStr,
                styles: {
                    fontStyle: 'bold',
                    fillColor: colorFila,
                    textColor: [50, 50, 50],
                    halign: 'center',
                    lineWidth: mainLineWidth
                }
            }];

            rolesPlano.forEach(rol => {
                fila.push({
                    content: manuales[id]?.[rol] || asignaciones[id]?.[rol] || "-",
                    styles: {
                        fillColor: colorFila,
                        lineWidth: mainLineWidth
                    }
                });
            });
            bodyMes.push(fila);

            if (hasExtraRow) {
                const s = sabadoData[id];
                const info = `Conferenciante: ${s.conferenciante || '-'}   •   Bosquejo: N° ${s.bosquejo || '-'}   •   Tema: ${s.tema || '-'}   •   Hospitalidad: ${s.hospitalidad || '-'}`;

                bodyMes.push([{
                    content: info,
                    colSpan: rolesPlano.length + 1,
                    styles: {
                        fontSize: 7.5,
                        fontStyle: 'normal',
                        textColor: config.text,
                        halign: 'left',
                        fillColor: colorFila,
                        cellPadding: { top: 4, bottom: 4, left: 2, right: 2 },
                        lineWidth: { top: 0.1, bottom: 0.1, left: 0.1, right: 0.1 }
                    }
                }]);
            }

            if (i < meses[nombreMes].length - 1) {
                bodyMes.push([{
                    content: '',
                    colSpan: rolesPlano.length + 1,
                    styles: {
                        minCellHeight: 2,
                        fillColor: [255, 255, 255],
                        lineWidth: 0,
                        cellPadding: 0
                    }
                }]);
            }
        });

        doc.autoTable({
            head: head,
            body: bodyMes,
            startY: currentY,
            theme: config.table,
            styles: {
                fontSize: rolesPlano.length > 5 ? 7 : 8,
                cellPadding: 3,
                lineColor: [200, 200, 200],
                lineWidth: 0.1
            },
            headStyles: {
                fillColor: estiloElegido === 'minimalista' ? [255, 255, 255] : config.primary,
                textColor: config.headerText || (estiloElegido === 'minimalista' ? [0, 0, 0] : [255, 255, 255]),
                fontStyle: 'bold',
                halign: 'center',
                lineWidth: 0.1
            },
            margin: { left: 14, right: 14 },
            didDrawPage: (data) => {
                const pageCount = doc.internal.getNumberOfPages();
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text("Página " + pageCount, pageWidth / 2, pageHeight - 10, { align: 'center' });
            }
        });

        currentY = doc.lastAutoTable.finalY + 6;
    });

    const nombreArchivo = tituloPrincipal.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`${nombreArchivo}.pdf`);
}

function abrirModalLimpiezaManual() {
    const modal = document.getElementById('modalLimpiezaManual');
    const contenedor = document.getElementById('contenedorCheckboxesModal');
    if (!contenedor || !modal) return;
    contenedor.innerHTML = '';

    const rolesConAsignacionesManuales = new Set();
    Object.values(manuales).forEach(dia => {
        Object.keys(dia).forEach(rolCompleto => {
            const rb = rolCompleto.substring(0, rolCompleto.lastIndexOf('_'));
            if (rb) rolesConAsignacionesManuales.add(rb);
        });
    });

    const columnasParaLimpiar = columnasElegidas.filter(col => rolesConAsignacionesManuales.has(col.id));

    if (columnasParaLimpiar.length === 0) {
        alert("No hay asignaciones manuales para limpiar en las columnas actuales.");
        return;
    }

    columnasParaLimpiar.forEach(col => {
        const item = document.createElement('label');
        item.innerHTML = `<input type="checkbox" class="modal-col-check" value="${col.id}"><span>${col.label}</span>`;
        contenedor.appendChild(item);
    });

    modal.style.display = 'flex';
}

function cerrarModalLimpiezaManual() {
    document.getElementById('modalLimpiezaManual').style.display = 'none';
}

function ejecutarLimpiezaManualModal() {
    const seleccionados = Array.from(document.querySelectorAll('.modal-col-check:checked')).map(cb => cb.value);
    if (seleccionados.length === 0) { alert("Selecciona al menos una columna."); return; }

    Object.keys(manuales).forEach(idFecha => {
        Object.keys(manuales[idFecha]).forEach(rolUnico => {
            const rolBase = rolUnico.substring(0, rolUnico.lastIndexOf('_'));
            if (seleccionados.includes(rolBase)) delete manuales[idFecha][rolUnico];
        });
        if (Object.keys(manuales[idFecha]).length === 0) delete manuales[idFecha];
    });

    localStorage.setItem('manuales_v3', JSON.stringify(manuales));
    cerrarModalLimpiezaManual();
    actualizarTodo();
}

function guardarSeleccionDias() {
    localStorage.setItem('savedDias', JSON.stringify(obtenerDiasSeleccionados()));
}

function guardarDatoSabado(input) {
    const id = input.dataset.fechaId;
    const rol = input.dataset.sabadoRol;
    const valor = input.value.trim();

    if (!sabadoData[id]) sabadoData[id] = {};

    if (valor) sabadoData[id][rol] = valor;
    else {
        delete sabadoData[id][rol];
        if (Object.keys(sabadoData[id]).length === 0) delete sabadoData[id];
    }
    localStorage.setItem('sabadoData_v1', JSON.stringify(sabadoData));
}

actualizarTodo();
