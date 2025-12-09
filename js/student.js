// student.js - Lógica específica para estudiante

let proyectoSeleccionado = null;

// Inicializar panel del estudiante
function initStudentPanel() {
    // Verificar autenticación y rol
    if (!Auth.requireLogin() || !Auth.requireRole('estudiante')) {
        return;
    }
    
    const user = Auth.getCurrentUser();
    document.getElementById('studentName').textContent = user.nombre || user.email;
    
    // Cargar datos
    cargarProyectosActivos();
    cargarProyectosAceptados();
    cargarMisPostulaciones();
    cargarNotificaciones();
    
    // Configurar formulario de horas
    document.getElementById('registrarHorasForm').addEventListener('submit', registrarHoras);
}

// Cargar proyectos activos
function cargarProyectosActivos() {
    const proyectos = DB.getProyectos('Activo');
    const tbody = document.querySelector('#proyectosTable tbody');
    tbody.innerHTML = '';
    
    proyectos.forEach(proyecto => {
        const row = document.createElement('tr');
        
        // Verificar si ya está postulado
        const postulaciones = DB.getPostulacionesPorEstudiante(Auth.getCurrentUser().email);
        const postulacion = postulaciones.find(p => p.proyecto_id === proyecto.id);
        
        let estadoBoton = '';
        let accion = '';
        
        if (postulacion) {
            estadoBoton = `<span class="badge badge-${postulacion.estado === 'Aceptado' ? 'success' : 
                          postulacion.estado === 'Rechazado' ? 'danger' : 'warning'}">${postulacion.estado}</span>`;
            accion = estadoBoton;
        } else {
            accion = `<button onclick="verDetalleProyecto(${proyecto.id})" class="btn btn-primary btn-sm">
                         <i class="fas fa-eye"></i> Ver Detalle
                      </button>`;
        }
        
        row.innerHTML = `
            <td>${proyecto.id}</td>
            <td>${proyecto.nombre}</td>
            <td>${proyecto.encargado}</td>
            <td>${proyecto.cupos_disponibles}/${proyecto.cupos}</td>
            <td>${proyecto.horas_otorgadas}</td>
            <td>${accion}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Ver detalle del proyecto
function verDetalleProyecto(proyectoId) {
    const proyecto = DB.getProyecto(proyectoId);
    if (!proyecto) return;
    
    proyectoSeleccionado = proyecto;
    
    // Llenar modal
    document.getElementById('modalProyectoNombre').textContent = proyecto.nombre;
    document.getElementById('modalProyectoDescripcion').textContent = proyecto.descripcion;
    document.getElementById('modalProyectoEncargado').textContent = proyecto.encargado;
    document.getElementById('modalProyectoCupos').textContent = `${proyecto.cupos_disponibles}/${proyecto.cupos}`;
    document.getElementById('modalProyectoHoras').textContent = proyecto.horas_otorgadas;
    document.getElementById('modalProyectoEstado').textContent = proyecto.estado;
    
    // Verificar estado de postulación del usuario
    const user = Auth.getCurrentUser();
    const postulaciones = DB.getPostulacionesPorEstudiante(user.email);
    const postulacion = postulaciones.find(p => p.proyecto_id === proyecto.id);
    
    const estadoDiv = document.getElementById('estadoPostulacion');
    const botonesDiv = document.getElementById('botonesPostulacion');
    
    if (postulacion) {
        estadoDiv.innerHTML = `
            <strong>Tu estado de postulación:</strong>
            <span class="badge badge-${postulacion.estado === 'Aceptado' ? 'success' : 
                               postulacion.estado === 'Rechazado' ? 'danger' : 'warning'}">
                ${postulacion.estado}
            </span>
            ${postulacion.razon_rechazo ? `<br><small>Razón: ${postulacion.razon_rechazo}</small>` : ''}
        `;
        estadoDiv.className = `alert alert-${postulacion.estado === 'Aceptado' ? 'success' : 
                                             postulacion.estado === 'Rechazado' ? 'danger' : 'warning'}`;
        botonesDiv.style.display = 'none';
    } else {
        estadoDiv.innerHTML = '<strong>Estado:</strong> No postulado';
        estadoDiv.className = 'alert alert-info';
        
        // Mostrar botón solo si el proyecto está activo y hay cupos
        if (proyecto.estado === 'Activo' && proyecto.cupos_disponibles > 0) {
            botonesDiv.style.display = 'block';
        } else {
            botonesDiv.style.display = 'none';
            estadoDiv.innerHTML += `<br><small>${proyecto.estado !== 'Activo' ? 'Proyecto no activo' : 'No hay cupos disponibles'}</small>`;
        }
    }
    
    // Mostrar modal
    document.getElementById('proyectoModal').style.display = 'block';
}

// Postular a proyecto
function postularProyecto() {
    if (!proyectoSeleccionado) return;
    
    const user = Auth.getCurrentUser();
    const result = DB.postularEstudiante(proyectoSeleccionado.id, user.email);
    
    if (result.success) {
        alert('¡Postulación enviada exitosamente!');
        closeModal();
        cargarProyectosActivos();
        cargarMisPostulaciones();
    } else {
        alert('Error: ' + result.message);
    }
}

// Cargar proyectos aceptados para registrar horas
function cargarProyectosAceptados() {
    const user = Auth.getCurrentUser();
    const proyectosAceptados = DB.getProyectosAceptados(user.email);
    const select = document.getElementById('proyectoAceptado');
    
    select.innerHTML = '<option value="">Selecciona un proyecto...</option>';
    
    proyectosAceptados.forEach(proyecto => {
        const option = document.createElement('option');
        option.value = proyecto.id;
        option.textContent = `${proyecto.nombre} (${proyecto.horas_otorgadas} horas)`;
        select.appendChild(option);
    });
}

// Registrar horas
function registrarHoras(e) {
    e.preventDefault();
    
    const user = Auth.getCurrentUser();
    const proyectoId = parseInt(document.getElementById('proyectoAceptado').value);
    const fecha = document.getElementById('fechaHoras').value;
    const cantidad = parseFloat(document.getElementById('cantidadHoras').value);
    const descripcion = document.getElementById('descripcionHoras').value;
    
    // Validaciones
    if (!proyectoId) {
        alert('Selecciona un proyecto');
        return;
    }
    
    if (cantidad <= 0) {
        alert('Las horas deben ser mayores a 0');
        return;
    }
    
    if (!fecha) {
        alert('Ingresa una fecha válida');
        return;
    }
    
    const datos = {
        estudiante: user.email,
        proyecto_id: proyectoId,
        fecha: fecha,
        descripcion: descripcion,
        cantidad: cantidad
    };
    
    const result = DB.registrarHoras(datos);
    
    if (result.success) {
        alert('Horas registradas exitosamente. Pendiente de aprobación.');
        
        // Limpiar formulario
        document.getElementById('registrarHorasForm').reset();
        
        // Actualizar notificaciones
        cargarNotificaciones();
    } else {
        alert('Error: ' + result.message);
    }
}

// Cargar mis postulaciones
function cargarMisPostulaciones() {
    const user = Auth.getCurrentUser();
    const postulaciones = DB.getPostulacionesPorEstudiante(user.email);
    const tbody = document.querySelector('#postulacionesTable tbody');
    tbody.innerHTML = '';
    
    postulaciones.forEach(postulacion => {
        const row = document.createElement('tr');
        
        let estadoClass = '';
        switch(postulacion.estado) {
            case 'Aceptado': estadoClass = 'badge-success'; break;
            case 'Rechazado': estadoClass = 'badge-danger'; break;
            default: estadoClass = 'badge-warning';
        }
        
        row.innerHTML = `
            <td>${postulacion.proyecto_nombre}</td>
            <td><span class="badge ${estadoClass}">${postulacion.estado}</span></td>
            <td>${new Date(postulacion.fecha).toLocaleDateString()}</td>
            <td>${postulacion.razon_rechazo || '-'}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Cargar notificaciones
function cargarNotificaciones() {
    const user = Auth.getCurrentUser();
    const notificaciones = DB.getNotificacionesPorUsuario(user.email);
    const container = document.getElementById('notificacionesList');
    container.innerHTML = '';
    
    if (notificaciones.length === 0) {
        container.innerHTML = '<p class="text-muted">No hay notificaciones</p>';
        return;
    }
    
    notificaciones.forEach(notificacion => {
        const div = document.createElement('div');
        div.className = `notification-item ${notificacion.leido ? '' : 'unread'}`;
        
        let icon = 'fa-info-circle';
        let color = 'info';
        
        switch(notificacion.tipo) {
            case 'exito': icon = 'fa-check-circle'; color = 'success'; break;
            case 'advertencia': icon = 'fa-exclamation-triangle'; color = 'warning'; break;
            case 'error': icon = 'fa-times-circle'; color = 'danger'; break;
        }
        
        div.innerHTML = `
            <div class="notification-icon">
                <i class="fas ${icon} text-${color}"></i>
            </div>
            <div class="notification-content">
                <p>${notificacion.mensaje}</p>
                <small>${new Date(notificacion.fecha).toLocaleString()}</small>
            </div>
            <div class="notification-actions">
                ${!notificacion.leido ? `
                    <button onclick="marcarNotificacionLeida(${notificacion.id})" 
                            class="btn btn-sm btn-outline">
                        <i class="fas fa-check"></i> Marcar leída
                    </button>
                ` : ''}
            </div>
        `;
        
        container.appendChild(div);
    });
}

// Marcar notificación como leída
function marcarNotificacionLeida(id) {
    if (DB.marcarNotificacionComoLeida(id)) {
        cargarNotificaciones();
    }
}

// Cerrar modal
function closeModal() {
    document.getElementById('proyectoModal').style.display = 'none';
    proyectoSeleccionado = null;
}

// Cerrar sesión
function logout() {
    Auth.logout();
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initStudentPanel);