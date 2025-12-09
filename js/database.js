// database.js - Base de datos simulada con todas las funcionalidades

class Database {
    constructor() {
        this.initDatabase();
    }
    
    initDatabase() {
        // Inicializar localStorage si no existe
        if (!localStorage.getItem('keyhour_users')) {
            this.initDefaultData();
        }
    }
    
    initDefaultData() {
        // Usuarios por defecto
        const users = [
            {
                id: 1,
                email: 'alumno1@key.edu.sv',
                password: '1234',
                rol: 'estudiante',
                porcentaje: 40,
                nombre: 'Juan Pérez'
            },
            {
                id: 2,
                email: 'alumno2@key.edu.sv',
                password: 'abcd',
                rol: 'estudiante',
                porcentaje: 80,
                nombre: 'María González'
            },
            {
                id: 3,
                email: 'encargado1@key.edu.sv',
                password: 'admin123',
                rol: 'encargado',
                porcentaje: 0,
                nombre: 'Carlos Rodríguez'
            },
            {
                id: 4,
                email: 'admin@key.edu.sv',
                password: 'root2025',
                rol: 'admin',
                porcentaje: 0,
                nombre: 'Administrador'
            }
        ];
        
        localStorage.setItem('keyhour_users', JSON.stringify(users));
        
        // Proyectos por defecto
        const proyectos = [
            {
                id: 1,
                nombre: 'Desarrollo App Móvil',
                descripcion: 'Desarrollo de aplicación móvil para gestión de biblioteca',
                horas_otorgadas: 120,
                cupos: 5,
                encargado: 'encargado1@key.edu.sv',
                estado: 'Activo',
                creado_en: '2024-01-15',
                ubicacion: 'Laboratorio 3',
                requisitos: 'React Native, JavaScript'
            },
            {
                id: 2,
                nombre: 'Investigación en IA',
                descripcion: 'Investigación sobre aplicaciones de IA en educación',
                horas_otorgadas: 80,
                cupos: 3,
                encargado: 'encargado1@key.edu.sv',
                estado: 'Activo',
                creado_en: '2024-02-10',
                ubicacion: 'Centro de Investigación',
                requisitos: 'Python básico'
            },
            {
                id: 3,
                nombre: 'Sistema Web Escolar',
                descripcion: 'Desarrollo de sistema web para gestión académica',
                horas_otorgadas: 150,
                cupos: 6,
                encargado: 'encargado1@key.edu.sv',
                estado: 'Finalizado',
                creado_en: '2023-11-05',
                ubicacion: 'Virtual',
                requisitos: 'HTML, CSS, JavaScript'
            }
        ];
        
        localStorage.setItem('keyhour_proyectos', JSON.stringify(proyectos));
        
        // Postulaciones vacías
        localStorage.setItem('keyhour_postulaciones', JSON.stringify([]));
        
        // Horas vacías
        localStorage.setItem('keyhour_horas', JSON.stringify([]));
        
        // Notificaciones vacías
        localStorage.setItem('keyhour_notificaciones', JSON.stringify([]));
        
        // Mensajes vacíos
        localStorage.setItem('keyhour_mensajes', JSON.stringify([]));
    }
    
    // ==================== USUARIOS ====================
    
    autenticarUsuario(correo, contraseña) {
        const users = JSON.parse(localStorage.getItem('keyhour_users') || '[]');
        const user = users.find(u => u.email === correo && u.password === contraseña);
        
        if (user) {
            // No devolver la contraseña
            const { password, ...userSinPassword } = user;
            return userSinPassword;
        }
        
        return null;
    }
    
    getUsuario(correo) {
        const users = JSON.parse(localStorage.getItem('keyhour_users') || '[]');
        const user = users.find(u => u.email === correo);
        
        if (user) {
            const { password, ...userSinPassword } = user;
            return userSinPassword;
        }
        
        return null;
    }
    
    getEncargados() {
        const users = JSON.parse(localStorage.getItem('keyhour_users') || '[]');
        return users
            .filter(u => u.rol === 'encargado')
            .map(({ password, ...user }) => user);
    }
    
    getEstudiantes() {
        const users = JSON.parse(localStorage.getItem('keyhour_users') || '[]');
        return users
            .filter(u => u.rol === 'estudiante')
            .map(({ password, ...user }) => user);
    }
    
    // ==================== PROYECTOS ====================
    
    getProyectos(filtroEstado = null) {
        let proyectos = JSON.parse(localStorage.getItem('keyhour_proyectos') || '[]');
        
        if (filtroEstado) {
            proyectos = proyectos.filter(p => p.estado === filtroEstado);
        }
        
        // Calcular cupos disponibles
        const postulaciones = this.getPostulaciones();
        
        return proyectos.map(proyecto => {
            const aceptados = postulaciones.filter(p => 
                p.proyecto_id === proyecto.id && p.estado === 'Aceptado'
            ).length;
            
            return {
                ...proyecto,
                aceptados_count: aceptados,
                cupos_disponibles: proyecto.cupos - aceptados
            };
        });
    }
    
    getProyecto(id) {
        const proyectos = JSON.parse(localStorage.getItem('keyhour_proyectos') || '[]');
        const proyecto = proyectos.find(p => p.id === id);
        
        if (proyecto) {
            const postulaciones = this.getPostulaciones();
            const aceptados = postulaciones.filter(p => 
                p.proyecto_id === id && p.estado === 'Aceptado'
            ).length;
            
            return {
                ...proyecto,
                aceptados_count: aceptados,
                cupos_disponibles: proyecto.cupos - aceptados
            };
        }
        
        return null;
    }
    
    crearProyecto(proyectoData) {
        const proyectos = JSON.parse(localStorage.getItem('keyhour_proyectos') || '[]');
        
        // Generar nuevo ID
        const nuevoId = proyectos.length > 0 ? Math.max(...proyectos.map(p => p.id)) + 1 : 1;
        
        const nuevoProyecto = {
            id: nuevoId,
            ...proyectoData,
            estado: 'Activo',
            creado_en: new Date().toISOString().split('T')[0]
        };
        
        proyectos.push(nuevoProyecto);
        localStorage.setItem('keyhour_proyectos', JSON.stringify(proyectos));
        
        return nuevoProyecto;
    }
    
    actualizarProyecto(id, datos) {
        const proyectos = JSON.parse(localStorage.getItem('keyhour_proyectos') || '[]');
        const index = proyectos.findIndex(p => p.id === id);
        
        if (index !== -1) {
            proyectos[index] = { ...proyectos[index], ...datos };
            localStorage.setItem('keyhour_proyectos', JSON.stringify(proyectos));
            return true;
        }
        
        return false;
    }
    
    getProyectosHistorial() {
        const proyectos = JSON.parse(localStorage.getItem('keyhour_proyectos') || '[]');
        return proyectos.filter(p => p.estado !== 'Activo');
    }
    
    // ==================== POSTULACIONES ====================
    
    getPostulaciones() {
        return JSON.parse(localStorage.getItem('keyhour_postulaciones') || '[]');
    }
    
    postularEstudiante(proyecto_id, estudiante_email) {
        const postulaciones = this.getPostulaciones();
        
        // Verificar si ya está postulado
        const yaPostulado = postulaciones.some(p => 
            p.proyecto_id === proyecto_id && p.estudiante === estudiante_email
        );
        
        if (yaPostulado) {
            return { success: false, message: 'Ya te has postulado a este proyecto' };
        }
        
        // Verificar que el proyecto esté activo
        const proyecto = this.getProyecto(proyecto_id);
        if (!proyecto || proyecto.estado !== 'Activo') {
            return { success: false, message: 'El proyecto no está disponible' };
        }
        
        const nuevaPostulacion = {
            id: postulaciones.length > 0 ? Math.max(...postulaciones.map(p => p.id)) + 1 : 1,
            proyecto_id,
            estudiante: estudiante_email,
            estado: 'Pendiente',
            fecha: new Date().toISOString(),
            razon_rechazo: null
        };
        
        postulaciones.push(nuevaPostulacion);
        localStorage.setItem('keyhour_postulaciones', JSON.stringify(postulaciones));
        
        return { success: true, postulacion: nuevaPostulacion };
    }
    
    getPostulacionesPorProyecto(proyecto_id) {
        const postulaciones = this.getPostulaciones();
        return postulaciones.filter(p => p.proyecto_id === proyecto_id);
    }
    
    getPostulacionesPorEstudiante(estudiante_email) {
        const postulaciones = this.getPostulaciones();
        const proyectos = JSON.parse(localStorage.getItem('keyhour_proyectos') || '[]');
        
        return postulaciones
            .filter(p => p.estudiante === estudiante_email)
            .map(postulacion => {
                const proyecto = proyectos.find(pr => pr.id === postulacion.proyecto_id);
                return {
                    ...postulacion,
                    proyecto_nombre: proyecto ? proyecto.nombre : 'Proyecto no encontrado'
                };
            });
    }
    
    actualizarEstadoPostulacion(postulacion_id, nuevo_estado, razon_rechazo = null) {
        const postulaciones = this.getPostulaciones();
        const index = postulaciones.findIndex(p => p.id === postulacion_id);
        
        if (index === -1) return false;
        
        // Verificar cupos si es aceptación
        if (nuevo_estado === 'Aceptado') {
            const postulacion = postulaciones[index];
            const proyecto = this.getProyecto(postulacion.proyecto_id);
            
            if (proyecto.cupos_disponibles <= 0) {
                return { success: false, message: 'No hay cupos disponibles' };
            }
        }
        
        postulaciones[index].estado = nuevo_estado;
        postulaciones[index].razon_rechazo = razon_rechazo;
        postulaciones[index].fecha_respuesta = new Date().toISOString();
        
        localStorage.setItem('keyhour_postulaciones', JSON.stringify(postulaciones));
        
        // Crear notificación
        this.crearNotificacion(
            postulaciones[index].estudiante,
            nuevo_estado === 'Aceptado' 
                ? `🎉 ¡Felicidades! Has sido aceptado en el proyecto`
                : `⚠️ Tu postulación ha sido rechazada`,
            nuevo_estado === 'Aceptado' ? 'exito' : 'advertencia'
        );
        
        return { success: true };
    }
    
    getProyectosAceptados(estudiante_email) {
        const postulaciones = this.getPostulaciones();
        const proyectos = JSON.parse(localStorage.getItem('keyhour_proyectos') || '[]');
        
        return postulaciones
            .filter(p => p.estudiante === estudiante_email && p.estado === 'Aceptado')
            .map(postulacion => {
                const proyecto = proyectos.find(pr => pr.id === postulacion.proyecto_id);
                return proyecto ? { ...proyecto, postulacion_id: postulacion.id } : null;
            })
            .filter(p => p !== null);
    }
    
    // ==================== HORAS ====================
    
    getHoras() {
        return JSON.parse(localStorage.getItem('keyhour_horas') || '[]');
    }
    
    registrarHoras(datos) {
        // Validar que el estudiante esté aceptado en el proyecto
        const postulaciones = this.getPostulaciones();
        const aceptado = postulaciones.some(p => 
            p.estudiante === datos.estudiante && 
            p.proyecto_id === datos.proyecto_id && 
            p.estado === 'Aceptado'
        );
        
        if (!aceptado) {
            return { success: false, message: 'No estás aceptado en este proyecto' };
        }
        
        // Validar horas > 0
        if (datos.cantidad <= 0) {
            return { success: false, message: 'Las horas deben ser mayores a 0' };
        }
        
        const horas = this.getHoras();
        const nuevaHora = {
            id: horas.length > 0 ? Math.max(...horas.map(h => h.id)) + 1 : 1,
            ...datos,
            estado: 'Pendiente',
            fecha_registro: new Date().toISOString(),
            ano: new Date().getFullYear()
        };
        
        horas.push(nuevaHora);
        localStorage.setItem('keyhour_horas', JSON.stringify(horas));
        
        return { success: true, hora: nuevaHora };
    }
    
    getHorasPorEstudiante(estudiante_email) {
        const horas = this.getHoras();
        const proyectos = JSON.parse(localStorage.getItem('keyhour_proyectos') || '[]');
        
        return horas
            .filter(h => h.estudiante === estudiante_email)
            .map(hora => {
                const proyecto = proyectos.find(p => p.id === hora.proyecto_id);
                return {
                    ...hora,
                    proyecto_nombre: proyecto ? proyecto.nombre : 'Proyecto no encontrado'
                };
            });
    }
    
    getHorasPorEncargado(encargado_email) {
        const horas = this.getHoras();
        const proyectos = JSON.parse(localStorage.getItem('keyhour_proyectos') || '[]');
        
        // Filtrar proyectos del encargado
        const proyectosEncargado = proyectos
            .filter(p => p.encargado === encargado_email)
            .map(p => p.id);
        
        return horas
            .filter(h => proyectosEncargado.includes(h.proyecto_id))
            .map(hora => {
                const proyecto = proyectos.find(p => p.id === hora.proyecto_id);
                return {
                    ...hora,
                    proyecto_nombre: proyecto ? proyecto.nombre : 'Proyecto no encontrado',
                    encargado: proyecto ? proyecto.encargado : null
                };
            });
    }
    
    actualizarEstadoHora(hora_id, nuevo_estado) {
        const horas = this.getHoras();
        const index = horas.findIndex(h => h.id === hora_id);
        
        if (index === -1) return false;
        
        horas[index].estado = nuevo_estado;
        localStorage.setItem('keyhour_horas', JSON.stringify(horas));
        
        // Crear notificación al estudiante
        this.crearNotificacion(
            horas[index].estudiante,
            nuevo_estado === 'Aprobado'
                ? `✅ ${horas[index].cantidad} horas aprobadas`
                : `❌ ${horas[index].cantidad} horas rechazadas`,
            nuevo_estado === 'Aprobado' ? 'exito' : 'advertencia'
        );
        
        return true;
    }
    
    getResumenHorasEstudiante(estudiante_email) {
        const horas = this.getHoras();
        const estudiante = this.getUsuario(estudiante_email);
        
        const anoActual = new Date().getFullYear();
        
        const horasAprobadasAno = horas
            .filter(h => h.estudiante === estudiante_email && 
                        h.estado === 'Aprobado' && 
                        h.ano === anoActual)
            .reduce((sum, h) => sum + h.cantidad, 0);
        
        const horasAcumuladas = horas
            .filter(h => h.estudiante === estudiante_email && 
                        h.estado === 'Aprobado' && 
                        h.ano < anoActual)
            .reduce((sum, h) => sum + h.cantidad, 0);
        
        return {
            estudiante: estudiante_email,
            porcentaje_beca: estudiante ? estudiante.porcentaje : 0,
            horas_requeridas: estudiante ? estudiante.porcentaje : 0,
            horas_aprobadas_ano: horasAprobadasAno,
            horas_acumuladas: horasAcumuladas,
            horas_faltantes: Math.max(0, (estudiante ? estudiante.porcentaje : 0) - horasAprobadasAno)
        };
    }
    
    // ==================== NOTIFICACIONES ====================
    
    crearNotificacion(usuario, mensaje, tipo = 'info') {
        const notificaciones = JSON.parse(localStorage.getItem('keyhour_notificaciones') || '[]');
        
        const nuevaNotificacion = {
            id: notificaciones.length > 0 ? Math.max(...notificaciones.map(n => n.id)) + 1 : 1,
            usuario,
            mensaje,
            tipo,
            fecha: new Date().toISOString(),
            leido: false
        };
        
        notificaciones.push(nuevaNotificacion);
        localStorage.setItem('keyhour_notificaciones', JSON.stringify(notificaciones));
        
        return nuevaNotificacion;
    }
    
    getNotificacionesPorUsuario(usuario_email, soloNoLeidas = false) {
        const notificaciones = JSON.parse(localStorage.getItem('keyhour_notificaciones') || '[]');
        
        let filtradas = notificaciones.filter(n => n.usuario === usuario_email);
        
        if (soloNoLeidas) {
            filtradas = filtradas.filter(n => !n.leido);
        }
        
        return filtradas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    }
    
    marcarNotificacionComoLeida(notificacion_id) {
        const notificaciones = JSON.parse(localStorage.getItem('keyhour_notificaciones') || '[]');
        const index = notificaciones.findIndex(n => n.id === notificacion_id);
        
        if (index !== -1) {
            notificaciones[index].leido = true;
            localStorage.setItem('keyhour_notificaciones', JSON.stringify(notificaciones));
            return true;
        }
        
        return false;
    }
    
    // ==================== VERIFICACIÓN ANUAL ====================
    
    verificarCumplimientoAnual() {
        const estudiantes = this.getEstudiantes();
        const anoActual = new Date().getFullYear();
        
        estudiantes.forEach(estudiante => {
            const resumen = this.getResumenHorasEstudiante(estudiante.email);
            
            if (resumen.horas_faltantes > 0) {
                // Crear notificación si no cumple
                this.crearNotificacion(
                    estudiante.email,
                    `⚠️ No has cumplido las horas requeridas. Te faltan ${resumen.horas_faltantes} horas para ${anoActual}.`,
                    'advertencia'
                );
            }
        });
    }
}

// Instancia global de la base de datos
window.DB = new Database();