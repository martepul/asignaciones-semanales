let participantes = JSON.parse(localStorage.getItem('micro_participantes')) || [];
let manuales = JSON.parse(localStorage.getItem('manuales_v3')) || {};
let bloqueados = JSON.parse(localStorage.getItem('bloqueados_v1')) || {};
let asignaciones = {};
let columnasElegidas = JSON.parse(localStorage.getItem('columnasElegidas_v1')) || []; // Guarda objetos: {id, label, cantidad}

document.addEventListener('DOMContentLoaded', () => {
    applyTheme(); // Aplicar tema oscuro/claro

    const themeButton = document.getElementById('btn-theme');
    if (themeButton) {
        themeButton.addEventListener('click', toggleTheme);
    }
    // Cargar título guardado
    const savedTitle = localStorage.getItem('pdfTitle');
    const titleInput = document.getElementById('pdfTitle');
    if (savedTitle) {
        titleInput.value = savedTitle;
    }
    titleInput.addEventListener('input', () => {
        localStorage.setItem('pdfTitle', titleInput.value);
    });

    // Cargar selección de días guardada
    const diasCheckboxes = document.querySelectorAll('.dia-check');
    const savedDias = JSON.parse(localStorage.getItem('savedDias')) || [];
    if(savedDias.length > 0){
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


    // Fechas iniciales
    const hoy = new Date();
    document.getElementById('fechaInicio').value = hoy.toISOString().split('T')[0];

    // EVENTO CLAVE: Orden de columnas y cantidades
    document.querySelectorAll('.col-check').forEach(check => {
        const rol = check.value;
        const colGuardada = columnasElegidas.find(c => c.id === rol);

        if (colGuardada) {
            check.checked = true;
            const numInput = document.querySelector(`.col-num[data-rol="${rol}"]`);
            if (numInput) {
                numInput.value = colGuardada.cantidad;
            }
        } else {
            check.checked = false;
        }

        check.addEventListener('change', function () {
            manejarSeleccionColumna(this);
        });
    });

    document.querySelectorAll('.col-num').forEach(numInput => {
        numInput.addEventListener('change', () => {
            if (columnasElegidas.length > 0) {
                actualizarDatosColumnas();
                actualizarTodo();
            }
        });
    });

    ajustarPorComboDias();
});

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

// Función para aplicar el tema al cargar la página
function applyTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
        // Si no hay tema guardado, usar la preferencia del sistema
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
}



// Opcional: Escuchar cambios en la preferencia del sistema
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    // Solo cambiar si no hay un tema guardado manualmente
    if (!localStorage.getItem('theme')) {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    }
});

function toggleSidebar() {
    const layout = document.querySelector('.main-layout');
    const btn = document.getElementById('toggleSidebar');
    const icon = document.getElementById('sidebarIcon');
    const text = document.getElementById('sidebarText');

    if (!layout) return;

    const isHidden = layout.classList.toggle('sidebar-hidden');

    // Actualización de UI
    if (btn) {
        btn.classList.toggle('sidebar-hidden-active', isHidden);
        if (icon) icon.innerText = isHidden ? "➡️" : "⬅️";
        if (text) text.innerText = isHidden ? "Mostrar Panel" : "Ocultar Panel";
    }

    // Esperar a que termine la transición CSS (300ms) para refrescar la tabla
    setTimeout(() => {
        if (typeof actualizarTodo === 'function') {
            actualizarTodo();
        }
    }, 300);
}

function agregarParticipante() {
    const input = document.getElementById('nuevoNombre');
    const nombre = input.value.trim();
    if (nombre && !participantes.includes(nombre)) {
        participantes.push(nombre);
        input.value = '';
        actualizarTodo();
    }
}

function editarParticipante(index) {
    const nombreAntiguo = participantes[index];
    const nuevoNombre = prompt("Editar nombre:", nombreAntiguo);
    if (nuevoNombre && nuevoNombre.trim() !== "" && nuevoNombre !== nombreAntiguo) {
        const nombreLimpio = nuevoNombre.trim();
        participantes[index] = nombreLimpio;
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
        actualizarTodo();
    }
}

function eliminarParticipante(index) {
    if (confirm("¿Quitar de la lista?")) {
        participantes.splice(index, 1);
        actualizarTodo();
    }
}

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

function asignarFila(id) {
    if (bloqueados[id]) return;

    let rolesPlano = [];
    columnasElegidas.forEach(col => {
        for (let i = 0; i < col.cantidad; i++) rolesPlano.push(`${col.id}_${i}`);
    });

    let pool = [...participantes].sort(() => Math.random() - 0.5);
    // Quitar a los que ya están puestos a mano hoy
    let yaAsignados = Object.values(manuales[id] || {});
    pool = pool.filter(p => !yaAsignados.includes(p));

    if (!asignaciones[id]) asignaciones[id] = {};

    rolesPlano.forEach(rol => {
        if (!manuales[id]?.[rol]) {
            if (pool.length > 0) {
                asignaciones[id][rol] = pool.shift();
            }
        }
    });
    actualizarTodo();
}

function actualizarBotonesDeLimpieza() {
    const contenedor = document.getElementById('contenedorBotonesDinamicos');
    contenedor.innerHTML = ''; // Limpiar botones anteriores

    columnasElegidas.forEach(col => {
        const btn = document.createElement('button');
        btn.className = 'btn-clear';
        // Usamos el label de la columna para el texto del botón
        btn.innerHTML = `🗑️ ${col.label.substring(0, 4)}.`;
        btn.title = `Limpiar columna ${col.label}`;

        // Al hacer clic, llama a la función de limpieza que creamos antes
        btn.onclick = () => {
            if (confirm(`¿Limpiar todas las asignaciones de ${col.label}?`)) {
                limpiarColumna(col.id);
            }
        };

        contenedor.appendChild(btn);
    });
}

function asignarAleatoriamente() {
    // 1. Validación de seguridad
    if (columnasElegidas.length === 0) {
        alert("⚠️ Por favor, selecciona al menos una columna en el panel lateral antes de asignar.");
        return;
    }

    if (participantes.length === 0) {
        alert("⚠️ No hay participantes en la lista.");
        return;
    }

    // 2. Ejecutar la asignación por cada fila de la tabla
    const fechas = generarFechas();
    fechas.forEach(f => {
        const id = f.toISOString().split('T')[0];
        asignarFila(id); // Esta función ya la actualizamos antes para usar roles dinámicos
    });
}

// Limpiar una columna completa
function limpiarColumna(rolBase) {
    // Recorremos los días en el objeto de asignaciones aleatorias
    Object.keys(asignaciones).forEach(id => {
        if (asignaciones[id]) {
            Object.keys(asignaciones[id]).forEach(key => {
                // Si la columna pertenece al rol (ej: plataforma_0), la borramos
                if (key.startsWith(rolBase)) {
                    delete asignaciones[id][key];
                }
            });
        }
    });

    // NOTA: No tocamos el objeto 'manuales' aquí para que tus selecciones a mano sigan ahí.
    actualizarTodo();
}

// Vaciar absolutamente todas las asignaciones (Limpiar Todo)
function limpiarAsignaciones() {
    if (confirm("¿Estás seguro de que deseas vaciar todas las asignaciones ALEATORIAS? (Las manuales se conservarán)")) {
        // Vaciamos solo el objeto de asignaciones automáticas
        asignaciones = {};
        // No tocamos el objeto 'manuales'
        actualizarTodo();
    }
}

function obtenerDiasSeleccionados() {
    const checkboxes = document.querySelectorAll('.dia-check:checked');
    return Array.from(checkboxes).map(cb => parseInt(cb.value));
}

// La función generarFechas ahora es más sencilla porque siempre lee los inputs
function generarFechas() {
    const inicioStr = document.getElementById('fechaInicio').value;
    const finalStr = document.getElementById('fechaFin').value;

    if (!inicioStr || !finalStr) return [];

    const lista = [];
    const diasPermitidos = obtenerDiasSeleccionados();

    let f = new Date(inicioStr + 'T00:00:00');
    const fEnd = new Date(finalStr + 'T00:00:00');

    // Seguridad: si la fecha final es menor a la inicial, no hace nada
    if (fEnd < f) return [];

    while (f <= fEnd) {
        if (diasPermitidos.includes(f.getDay())) {
            lista.push(new Date(f));
        }
        f.setDate(f.getDate() + 1);

        // Límite de seguridad para evitar bloqueos del navegador
        if (lista.length > 60) break;
    }
    return lista;
}

// Función para cuando se cambia el combo (1 semana, 15 días, etc.)
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

// Función para cuando el usuario toca manualmente las fechas
function manejarCambioFechaManual() {
    // Cambiamos el selector a "Personalizado"
    document.getElementById('cantidadFechas').value = "custom";
    actualizarTodo();
}

// Sincroniza las cantidades si el checkbox ya está marcado
function actualizarDatosColumnas() {
    columnasElegidas.forEach(col => {
        const input = document.querySelector(`.col-num[data-rol="${col.id}"]`);
        if (input) col.cantidad = parseInt(input.value) || 1;
    });
}

function actualizarEncabezado() {
    let html = `<tr><th>Fecha / Día</th>`;
    columnasElegidas.forEach(col => {
        html += `<th colspan="${col.cantidad}">${col.label}</th>`;
    });
    html += `<th style="width: 40px;">🔒</th><th style="width: 40px;">➕</th><th style="width: 40px;">🗑️</th></tr>`;
    document.querySelector('#tablaAsignaciones thead').innerHTML = html;
}

function actualizarTodo() {
    localStorage.setItem('columnasElegidas_v1', JSON.stringify(columnasElegidas));
    localStorage.setItem('micro_participantes', JSON.stringify(participantes));

    // Lista de participantes en sidebar
    const listaUL = document.getElementById('listaParticipantes');
    listaUL.innerHTML = participantes.map((p, idx) => `
        <li style="display:flex; justify-content:space-between; align-items:center; padding:5px 0; border-bottom:1px solid var(--border)">
            <span>${p}</span>
            <div>
                <button onclick="editarParticipante(${idx})">✎</button>
                <button onclick="eliminarParticipante(${idx})">×</button>
            </div>
        </li>`).join('');

    actualizarBotonesDeLimpieza();
    actualizarEncabezado();

    // Crear lista plana de roles (ej: plataforma_0, audio_video_0, audio_video_1...)
    let rolesPlano = [];
    columnasElegidas.forEach(col => {
        for (let i = 0; i < col.cantidad; i++) {
            rolesPlano.push(`${col.id}_${i}`);
        }
    });

    const tablaBody = document.getElementById('cuerpoTabla');
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
            return `<td>
                <select class="${manuales[id]?.[rol] ? 'manual-selected' : ''}" 
                        onchange="guardarManual('${id}', this.value, '${rol}')" ${estaBloqueado ? 'disabled' : ''}>
                    <option value="">--</option>
                    ${participantes.map(p => `<option value="${p}" ${valor === p ? 'selected' : ''}>${p}</option>`).join('')}
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
    });
}

function exportarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. Configuración de Roles y Encabezados
    const rolesPlano = [];
    columnasElegidas.forEach(col => {
        for (let i = 0; i < col.cantidad; i++) {
            rolesPlano.push(`${col.id}_${i}`);
        }
    });

    if (rolesPlano.length === 0) {
        alert("Selecciona al menos una columna antes de exportar.");
        return;
    }

    const head = [];
    const headerRow = [];

    headerRow.push({ content: 'Fecha / Día', styles: { halign: 'center', valign: 'middle' } });

    columnasElegidas.forEach(col => {
        headerRow.push({
            content: col.label,
            colSpan: col.cantidad,
            styles: { halign: 'center' }
        });
    });
    head.push(headerRow);

    // 2. Agrupar fechas por mes
    const fechas = generarFechas();
    const meses = {};
    fechas.forEach(f => {
        const nombreMes = f.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        if (!meses[nombreMes]) meses[nombreMes] = [];
        meses[nombreMes].push(f);
    });

    let currentY = 20; // Espacio inicial para el logo y título

    // 3. Dibujar Encabezado Principal (Logo y Título General)
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    const pdfTitle = document.getElementById('pdfTitle').value || 'Cong. Simón Bolívar';
    doc.text(pdfTitle, 12, currentY);

    // Título Principal Centrado
    doc.setFontSize(12);
    doc.text("ASIGNACIONES SEMANALES", pageWidth / 2, currentY, { align: 'center' });

    // Línea inferior que ocupa todo el ancho (de margen a margen)
    doc.setLineWidth(0.5);
    doc.line(10, currentY + 4, pageWidth - 10, currentY + 4);

    currentY += 15; // Bajar para empezar las tablas

    // 4. Iterar sobre cada mes
    Object.keys(meses).forEach((nombreMes) => {
        // Título del Mes (Asignaciones del mes específico)
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        const tituloMes = `Mes: ${nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)}`;
        doc.text(tituloMes, 15, currentY);

        const bodyMes = meses[nombreMes].map(f => {
            const id = f.toISOString().split('T')[0];
            const dia = f.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit' });
            const fila = [dia];
            rolesPlano.forEach(rol => {
                fila.push(manuales[id]?.[rol] || asignaciones[id]?.[rol] || "-");
            });
            return fila;
        });

        // 5. Tabla en Blanco y Negro
        doc.autoTable({
            head: head,
            body: bodyMes,
            startY: currentY + 4,
            theme: 'grid',
            styles: {
                // Si hay más de 5 columnas, baja el tamaño de la letra a 7; si no, lo deja en 8.
                fontSize: rolesPlano.length > 5 ? 7 : 8.5,
                cellPadding: 1.5, // Reduce el espacio vacío dentro de las celdas para dar más lugar al texto
                halign: 'center',
                valign: 'middle',
                textColor: 0,
                lineColor: 0,
                lineWidth: 0.1,
                overflow: 'linebreak' // Permite que los nombres largos bajen a la siguiente línea
            },
            headStyles: {
                fillColor: 255,
                textColor: 0,
                fontStyle: 'bold',
                lineWidth: 0.2,
                // Ajuste dinámico también para los encabezados
                fontSize: rolesPlano.length > 5 ? 8 : 9,
            },
            margin: { left: 10, right: 10 },
            didDrawPage: (data) => {
                currentY = data.cursor.y + 15;
            }
        });

        currentY = doc.lastAutoTable.finalY + 12;
    });

    doc.save(`Asignaciones_${new Date().toLocaleDateString()}.pdf`);
}

function abrirModalLimpiezaManual() {
    const modal = document.getElementById('modalLimpiezaManual');
    const contenedor = document.getElementById('contenedorCheckboxesModal');

    contenedor.innerHTML = '';

    // 1. Identificar qué roles base (ej: 'microfono') tienen asignaciones manuales.
    const rolesConAsignacionesManuales = new Set();
    Object.values(manuales).forEach(dia => {
        Object.keys(dia).forEach(rolCompleto => {
            const rolBase = rolCompleto.split('_')[0];
            rolesConAsignacionesManuales.add(rolBase);
        });
    });

    // 2. De las columnas que el usuario tiene seleccionadas para ver en la tabla,
    //    filtramos para quedarnos solo con aquellas que SÍ tienen asignaciones manuales.
    const columnasParaLimpiar = columnasElegidas.filter(col => rolesConAsignacionesManuales.has(col.id));

    // 3. Si después de filtrar no queda ninguna, no hay nada que limpiar.
    if (columnasParaLimpiar.length === 0) {
        alert("No hay asignaciones manuales para limpiar en las columnas que se están mostrando actualmente.");
        return;
    }

    // 4. Si hay columnas, las mostramos en el modal.
    columnasParaLimpiar.forEach(col => {
        const item = document.createElement('label');
        item.innerHTML = `
            <input type="checkbox" class="modal-col-check" value="${col.id}">
            <span>${col.label}</span>
        `;
        contenedor.appendChild(item);
    });

    modal.style.display = 'flex';
}

function cerrarModalLimpiezaManual() {
    document.getElementById('modalLimpiezaManual').style.display = 'none';
}

// 3. Ejecutar la limpieza basada en la selección del modal
function ejecutarLimpiezaManualModal() {
    // Obtener qué roles base marcó el usuario en el modal
    const seleccionados = Array.from(document.querySelectorAll('.modal-col-check:checked')).map(cb => cb.value);

    if (seleccionados.length === 0) {
        alert("Por favor, selecciona al menos una columna para limpiar.");
        return;
    }

    // Recorrer el objeto de manuales
    Object.keys(manuales).forEach(idFecha => {
        Object.keys(manuales[idFecha]).forEach(rolUnico => {
            // rolUnico es algo como "audio_video_0", extraemos el prefijo "audio_video"
            const rolBase = rolUnico.split('_')[0];

            // Si el rol base está en la lista de seleccionados del modal, lo borramos
            if (seleccionados.includes(rolBase)) {
                delete manuales[idFecha][rolUnico];
            }
        });

        // Si el objeto de esa fecha quedó vacío, lo eliminamos para limpiar memoria
        if (Object.keys(manuales[idFecha]).length === 0) {
            delete manuales[idFecha];
        }
    });

    // Guardar cambios en LocalStorage y refrescar
    localStorage.setItem('manuales_v3', JSON.stringify(manuales));
    cerrarModalLimpiezaManual();
    actualizarTodo();
}

function guardarSeleccionDias() {
    const diasSeleccionados = obtenerDiasSeleccionados();
    localStorage.setItem('savedDias', JSON.stringify(diasSeleccionados));
}

actualizarTodo();
