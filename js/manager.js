// manager.js - Lógica específica para encargado

let proyectoActual = null;
let postulacionActual = null;

// Inicializar panel del encargado
function initManagerPanel() {
    // Verificar autenticación y rol
    if (!Auth.requireLogin() || !Auth.requireRole('encargado')) {
        return;
    }
    
    const user = Auth.getCurrentUser();
    document.getElementById('managerName').textContent = user.nombre || user.email;
    
    // Cargar datos
    cargarProyectosAsignados();
    cargarHorasPendientes();
}

// Cargar proyectos asignados al encargado
function cargarProyectosAsignados() {
    const user = Auth.getCurrentUser();
    const proyectos = DB.getProyectos();
    const proyectosAsignados = proyectos.filter(p => p.encargado === user.email);
    
    const tbody = document.querySelector('#proyectosAsignadosTable tbody');
    tbody.innerHTML = '';
    
    if (proyectosAsignados.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="6" class="text-center">No tienes proyectos asignados</td>`;
        tbody.appendChild(row);
        return;
    }
    
    proyectosAsignados.forEach(proyecto => {
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
            <td><span class="badge ${estadoClass}">${proyecto.estado}</span></td>
            <td>${proyecto.aceptados_count || 0}/${proyecto.cupos}</td>
            <td>${proyecto.horas_otorgadas}</td>
            <td>
                <button onclick="verPostulaciones(${proyecto.id}, '${proyecto.nombre}')" 
                        class="btn btn-primary btn-sm"
                        ${proyecto.estado !== 'Activo' ? 'disabled' : ''}>
                    <i class="fas fa-users"></i> Ver Postulaciones
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Ver postulaciones de un proyecto
function verPostulaciones(proyectoId, proyectoNombre) {
    proyectoActual = proyectoId;
    
    document.getElementById('proyectoSeleccionadoNombre').textContent = proyectoNombre;
    document.getElementById('postulacionesSection').style.display = 'block';
    
    cargarPostulacionesProyecto();
}

// Cargar postulaciones del proyecto seleccionado
function cargarPostulacionesProyecto() {
    if (!proyectoActual) return;
    
    const postulaciones = DB.getPostulacionesPorProyecto(proyectoActual);
    const tbody = document.querySelector('#postulacionesTable tbody');
    tbody.innerHTML = '';
    
    if (postulaciones.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="4" class="text-center">No hay postulaciones para este proyecto</td>`;
        tbody.appendChild(row);
        return;
    }
    
    postulaciones.forEach(postulacion => {
        const row = document.createElement('tr');
        
        let estadoClass = '';
        let botones = '';
        
        switch(postulacion.estado) {
            case 'Aceptado': 
                estadoClass = 'badge-success';
                botones = '<span class="text-success">Aceptado</span>';
                break;
            case 'Rechazado': 
                estadoClass = 'badge-danger';
                botones = `<span class="text-danger">Rechazado${postulacion.razon_rechazo ? ': ' + postulacion.razon_rechazo : ''}</span>`;
                break;
            case 'Pendiente':
                estadoClass = 'badge-warning';
                botones = `
                    <button onclick="aceptarPostulacion(${postulacion.id})" class="btn btn-success btn-sm">
                        <i class="fas fa-check"></i> Aceptar
                    </button>
                    <button onclick="abrirModalRechazar(${postulacion.id})" class="btn btn-danger btn-sm">
                        <i class="fas fa-times"></i> Rechazar
                    </button>
                `;
                break;
        }
        
        row.innerHTML = `
            <td>${postulacion.estudiante}</td>
            <td>${new Date(postulacion.fecha).toLocaleDateString()}</td>
            <td><span class="badge ${estadoClass}">${postulacion.estado}</span></td>
            <td>${botones}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Aceptar postulación
function aceptarPostulacion(postulacionId) {
    if (!proyectoActual) return;
    
    // Verificar cupos disponibles
    const proyecto = DB.getProyecto(proyectoActual);
    if (proyecto.cupos_disponibles <= 0) {
        alert('No hay cupos disponibles en este proyecto');
        return;
    }
    
    const result = DB.actualizarEstadoPostulacion(postulacionId, 'Aceptado');
    
    if (result.success) {
        alert('Postulación aceptada exitosamente');
        cargarPostulacionesProyecto();
        cargarProyectosAsignados(); // Actualizar cupos ocupados
    } else {
        alert('Error: ' + result.message);
    }
}

// Abrir modal para rechazar postulación
function abrirModalRechazar(postulacionId) {
    postulacionActual = postulacionId;
    document.getElementById('rechazarModal').style.display = 'block';
}

// Confirmar rechazo de postulación
function confirmarRechazar() {
    const razon = document.getElementById('razonRechazo').value.trim();
    
    if (!razon) {
        alert('Debes proporcionar una razón para el rechazo');
        return;
    }
    
    const result = DB.actualizarEstadoPostulacion(postulacionActual, 'Rechazado', razon);
    
    if (result.success) {
        alert('Postulación rechazada exitosamente');
        closeRechazarModal();
        cargarPostulacionesProyecto();
    } else {
        alert('Error al rechazar postulación');
    }
}

// Cerrar modal de rechazo
function closeRechazarModal() {
    document.getElementById('rechazarModal').style.display = 'none';
    document.getElementById('razonRechazo').value = '';
    postulacionActual = null;
}

// Cargar horas pendientes de aprobación
function cargarHorasPendientes() {
    const user = Auth.getCurrentUser();
    const horas = DB.getHorasPorEncargado(user.email);
    
    const tbody = document.querySelector('#horasPendientesTable tbody');
    tbody.innerHTML = '';
    
    if (horas.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="8" class="text-center">No hay horas pendientes de aprobación</td>`;
        tbody.appendChild(row);
        return;
    }
    
    horas.forEach(hora => {
        const row = document.createElement('tr');
        
        let estadoClass = '';
        let botones = '';
        
        switch(hora.estado) {
            case 'Aprobado': 
                estadoClass = 'badge-success';
                botones = '<span class="text-success">Aprobado</span>';
                break;
            case 'Rechazado': 
                estadoClass = 'badge-danger';
                botones = '<span class="text-danger">Rechazado</span>';
                break;
            case 'Pendiente':
                estadoClass = 'badge-warning';
                botones = `
                    <button onclick="aprobarHora(${hora.id})" class="btn btn-success btn-sm">
                        <i class="fas fa-check"></i> Aprobar
                    </button>
                    <button onclick="rechazarHora(${hora.id})" class="btn btn-danger btn-sm">
                        <i class="fas fa-times"></i> Rechazar
                    </button>
                `;
                break;
        }
        
        row.innerHTML = `
            <td>${hora.id}</td>
            <td>${hora.estudiante}</td>
            <td>${hora.proyecto_nombre}</td>
            <td>${new Date(hora.fecha).toLocaleDateString()}</td>
            <td>${hora.descripcion}</td>
            <td>${hora.cantidad}</td>
            <td><span class="badge ${estadoClass}">${hora.estado}</span></td>
            <td>${botones}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Aprobar horas
function aprobarHora(horaId) {
    if (DB.actualizarEstadoHora(horaId, 'Aprobado')) {
        alert('Horas aprobadas exitosamente');
        cargarHorasPendientes();
    } else {
        alert('Error al aprobar horas');
    }
}

// Rechazar horas
function rechazarHora(horaId) {
    if (DB.actualizarEstadoHora(horaId, 'Rechazado')) {
        alert('Horas rechazadas');
        cargarHorasPendientes();
    } else {
        alert('Error al rechazar horas');
    }
}

// Cerrar sesión
function logout() {
    Auth.logout();
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initManagerPanel);