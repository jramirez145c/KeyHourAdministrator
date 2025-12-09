// admin.js - Lógica específica para administrador

let proyectoEditando = null;

// Inicializar panel del administrador
function initAdminPanel() {
    // Verificar autenticación y rol
    if (!Auth.requireLogin() || !Auth.requireRole('admin')) {
        return;
    }
    
    const user = Auth.getCurrentUser();
    document.getElementById('adminName').textContent = user.nombre || user.email;
    
    // Cargar datos
    cargarEncargados();
    cargarProyectos();
    cargarHistorial();
    cargarResumenHoras();
    
    // Configurar formularios
    document.getElementById('crearProyectoForm').addEventListener('submit', crearProyecto);
}

// Cargar lista de encargados
function cargarEncargados() {
    const encargados = DB.getEncargados();
    const selectCrear = document.getElementById('encargadoProyecto');
    const selectEditar = document.getElementById('editarEncargado');
    
    selectCrear.innerHTML = '<option value="">Selecciona un encargado...</option>';
    selectEditar.innerHTML = '<option value="">Selecciona un encargado...</option>';
    
    encargados.forEach(encargado => {
        const option1 = document.createElement('option');
        option1.value = encargado.email;
        option1.textContent = `${encargado.nombre} (${encargado.email})`;
        selectCrear.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = encargado.email;
        option2.textContent = `${encargado.nombre} (${encargado.email})`;
        selectEditar.appendChild(option2);
    });
}

// Crear nuevo proyecto
function crearProyecto(e) {
    e.preventDefault();
    
    const nombre = document.getElementById('nombreProyecto').value.trim();
    const descripcion = document.getElementById('descripcionProyecto').value.trim();
    const horas = parseInt(document.getElementById('horasProyecto').value);
    const cupos = parseInt(document.getElementById('cuposProyecto').value);
    const encargado = document.getElementById('encargadoProyecto').value;
    
    // Validaciones
    if (!nombre || !descripcion || !horas || !cupos || !encargado) {
        alert('Por favor completa todos los campos');
        return;
    }
    
    if (horas <= 0) {
        alert('Las horas deben ser mayores a 0');
        return;
    }
    
    if (cupos <= 0) {
        alert('Los cupos deben ser mayores a 0');
        return;
    }
    
    const proyectoData = {
        nombre,
        descripcion,
        horas_otorgadas: horas,
        cupos,
        encargado,
        ubicacion: 'Por definir',
        requisitos: 'Sin requisitos específicos'
    };
    
    const proyecto = DB.crearProyecto(proyectoData);
    
    if (proyecto) {
        alert('Proyecto creado exitosamente');
        
        // Limpiar formulario
        document.getElementById('crearProyectoForm').reset();
        
        // Actualizar listas
        cargarProyectos();
        cargarHistorial();
    } else {
        alert('Error al crear el proyecto');
    }
}

// Cargar todos los proyectos
function cargarProyectos() {
    const proyectos = DB.getProyectos();
    const tbody = document.querySelector('#proyectosTable tbody');
    tbody.innerHTML = '';
    
    proyectos.forEach(proyecto => {
        const row = document.createElement('tr');
        
        let estadoClass = '';
        switch(proyecto.estado) {
            case 'Activo': estadoClass = 'badge-success'; break;
            case 'Finalizado': estadoClass = 'badge-secondary'; break;
            case 'Cancelado': estadoClass = 'badge-danger'; break;
        }
        
        row.innerHTML = `
            <td>${proyecto.id}</td>
            <td>${proyecto.nombre}</td>
            <td>${proyecto.encargado}</td>
            <td><span class="badge ${estadoClass}">${proyecto.estado}</span></td>
            <td>${proyecto.cupos_disponibles || 0}/${proyecto.cupos}</td>
            <td>${proyecto.horas_otorgadas}</td>
            <td>
                <button onclick="editarProyecto(${proyecto.id})" class="btn btn-primary btn-sm">
                    <i class="fas fa-edit"></i> Editar
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Editar proyecto
function editarProyecto(proyectoId) {
    const proyecto = DB.getProyecto(proyectoId);
    if (!proyecto) return;
    
    proyectoEditando = proyecto;
    
    // Llenar formulario de edición
    document.getElementById('editarProyectoId').value = proyecto.id;
    document.getElementById('editarNombre').value = proyecto.nombre;
    document.getElementById('editarDescripcion').value = proyecto.descripcion;
    document.getElementById('editarHoras').value = proyecto.horas_otorgadas;
    document.getElementById('editarCupos').value = proyecto.cupos;
    document.getElementById('editarEstado').value = proyecto.estado;
    
    // Seleccionar encargado actual
    const selectEncargado = document.getElementById('editarEncargado');
    for (let i = 0; i < selectEncargado.options.length; i++) {
        if (selectEncargado.options[i].value === proyecto.encargado) {
            selectEncargado.selectedIndex = i;
            break;
        }
    }
    
    // Mostrar modal
    document.getElementById('editarModal').style.display = 'block';
}

// Guardar cambios del proyecto
function guardarCambiosProyecto() {
    if (!proyectoEditando) return;
    
    const id = parseInt(document.getElementById('editarProyectoId').value);
    const nombre = document.getElementById('editarNombre').value.trim();
    const descripcion = document.getElementById('editarDescripcion').value.trim();
    const horas = parseInt(document.getElementById('editarHoras').value);
    const cupos = parseInt(document.getElementById('editarCupos').value);
    const encargado = document.getElementById('editarEncargado').value;
    const estado = document.getElementById('editarEstado').value;
    
    // Validaciones
    if (!nombre || !descripcion || !horas || !cupos || !encargado || !estado) {
        alert('Por favor completa todos los campos');
        return;
    }
    
    if (horas <= 0) {
        alert('Las horas deben ser mayores a 0');
        return;
    }
    
    if (cupos <= 0) {
        alert('Los cupos deben ser mayores a 0');
        return;
    }
    
    const datos = {
        nombre,
        descripcion,
        horas_otorgadas: horas,
        cupos,
        encargado,
        estado
    };
    
    if (DB.actualizarProyecto(id, datos)) {
        alert('Proyecto actualizado exitosamente');
        closeEditarModal();
        cargarProyectos();
        cargarHistorial();
    } else {
        alert('Error al actualizar el proyecto');
    }
}

// Cerrar modal de edición
function closeEditarModal() {
    document.getElementById('editarModal').style.display = 'none';
    proyectoEditando = null;
}

// Cargar historial de proyectos
function cargarHistorial() {
    const historial = DB.getProyectosHistorial();
    const tbody = document.querySelector('#historialTable tbody');
    tbody.innerHTML = '';
    
    if (historial.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="8" class="text-center">No hay proyectos en el historial</td>`;
        tbody.appendChild(row);
        return;
    }
    
    historial.forEach(proyecto => {
        const row = document.createElement('tr');
        
        let estadoClass = '';
        switch(proyecto.estado) {
            case 'Finalizado': estadoClass = 'badge-secondary'; break;
            case 'Cancelado': estadoClass = 'badge-danger'; break;
        }
        
        // Obtener estudiantes aceptados
        const postulaciones = DB.getPostulacionesPorProyecto(proyecto.id);
        const aceptados = postulaciones
            .filter(p => p.estado === 'Aceptado')
            .map(p => p.estudiante)
            .join(', ');
        
        row.innerHTML = `
            <td>${proyecto.id}</td>
            <td>${proyecto.nombre}</td>
            <td>${proyecto.encargado}</td>
            <td>${proyecto.horas_otorgadas}</td>
            <td>${proyecto.cupos}</td>
            <td><span class="badge ${estadoClass}">${proyecto.estado}</span></td>
            <td>${proyecto.creado_en}</td>
            <td>${aceptados || 'Ninguno'}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Cargar resumen de horas por estudiante
function cargarResumenHoras() {
    const estudiantes = DB.getEstudiantes();
    const tbody = document.querySelector('#resumenHorasTable tbody');
    tbody.innerHTML = '';
    
    estudiantes.forEach(estudiante => {
        const resumen = DB.getResumenHorasEstudiante(estudiante.email);
        
        let estadoClass = '';
        let estadoTexto = '';
        
        if (resumen.horas_aprobadas_ano >= resumen.horas_requeridas) {
            estadoClass = 'badge-success';
            estadoTexto = 'Cumplido';
        } else if (resumen.horas_aprobadas_ano > 0) {
            estadoClass = 'badge-warning';
            estadoTexto = `Faltan ${resumen.horas_faltantes} horas`;
        } else {
            estadoClass = 'badge-danger';
            estadoTexto = 'Sin horas';
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${estudiante.nombre} (${estudiante.email})</td>
            <td>${resumen.porcentaje_beca}%</td>
            <td>${resumen.horas_requeridas}</td>
            <td>${resumen.horas_aprobadas_ano.toFixed(1)}</td>
            <td>${resumen.horas_acumuladas.toFixed(1)}</td>
            <td><span class="badge ${estadoClass}">${estadoTexto}</span></td>
        `;
        
        tbody.appendChild(row);
    });
}

// Verificar cumplimiento anual
function verificarCumplimientoAnual() {
    DB.verificarCumplimientoAnual();
    alert('Verificación de cumplimiento anual ejecutada. Se han generado notificaciones para los estudiantes que no cumplen.');
    cargarResumenHoras();
}

// Cerrar sesión
function logout() {
    Auth.logout();
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initAdminPanel);