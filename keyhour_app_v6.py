# keyhour_app_v6.py
"""
Key Hour Administrator v6 (Tkinter)
- Correcciones en el flujo de postulación del estudiante:
    * El estudiante solo ve proyectos activos.
    * Al seleccionar un proyecto -> modal con detalle y botón 'Postularme'.
- Administrador: sección Historial de proyectos (Finalizado / Cancelado) con participantes aceptados y encargado.
- Basado en v5, extendido y ajustado.
"""

import tkinter as tk
from tkinter import ttk, messagebox
from datetime import datetime
import sqlite3
import os

DB_NAME = "keyhour_v6.db"

# ---------------------------
# Database helpers & init
# ---------------------------
def connect():
    return sqlite3.connect(DB_NAME)

def init_db():
    con = connect()
    cur = con.cursor()

    # usuarios
    cur.execute("""
    CREATE TABLE IF NOT EXISTS usuarios(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        correo TEXT UNIQUE,
        contraseña TEXT,
        rol TEXT,
        porcentaje INTEGER DEFAULT 0
    )
    """)

    # horas
    cur.execute("""
    CREATE TABLE IF NOT EXISTS horas(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        estudiante TEXT,
        proyecto_id INTEGER,
        fecha TEXT,
        descripcion TEXT,
        cantidad REAL,
        estado TEXT DEFAULT 'Pendiente',
        ano INTEGER
    )
    """)

    # proyectos
    cur.execute("""
    CREATE TABLE IF NOT EXISTS proyectos(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT,
        descripcion TEXT,
        horas_otorgadas REAL,
        cupos INTEGER,
        encargado TEXT,
        estado TEXT DEFAULT 'Activo',
        creado_en TEXT
    )
    """)

    # postulaciones
    cur.execute("""
    CREATE TABLE IF NOT EXISTS postulaciones(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        proyecto_id INTEGER,
        estudiante TEXT,
        estado TEXT DEFAULT 'Pendiente',
        fecha TEXT,
        UNIQUE(proyecto_id, estudiante)
    )
    """)

    # mensajes
    cur.execute("""
    CREATE TABLE IF NOT EXISTS mensajes(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        proyecto_id INTEGER,
        remitente TEXT,
        receptor TEXT,
        mensaje TEXT,
        fecha TEXT
    )
    """)

    # notificaciones
    cur.execute("""
    CREATE TABLE IF NOT EXISTS notificaciones(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        estudiante TEXT,
        mensaje TEXT,
        fecha TEXT,
        leido INTEGER DEFAULT 0
    )
    """)

    con.commit()
    con.close()

    preload_users()

def preload_users():
    con = connect()
    cur = con.cursor()
    defaults = [
        ("alumno1@key.edu.sv", "1234", "estudiante", 40),
        ("alumno2@key.edu.sv", "abcd", "estudiante", 80),
        ("encargado1@key.edu.sv", "admin123", "encargado", 0),
        ("admin@key.edu.sv", "root2025", "admin", 0)
    ]
    for correo, pwd, rol, pct in defaults:
        try:
            cur.execute("INSERT INTO usuarios (correo, contraseña, rol, porcentaje) VALUES (?, ?, ?, ?)",
                        (correo, pwd, rol, pct))
        except sqlite3.IntegrityError:
            pass
    con.commit()
    con.close()

# ---------------------------
# Basic DB helpers
# ---------------------------
def fetchall(q, params=()):
    con = connect()
    cur = con.cursor()
    cur.execute(q, params)
    rows = cur.fetchall()
    con.close()
    return rows

def execute(q, params=()):
    con = connect()
    cur = con.cursor()
    cur.execute(q, params)
    con.commit()
    con.close()

# ---------------------------
# Auth utils
# ---------------------------
def get_rol(correo, contra):
    r = fetchall("SELECT rol FROM usuarios WHERE correo=? AND contraseña=?", (correo, contra))
    return r[0][0] if r else None

def get_porcentaje(correo):
    r = fetchall("SELECT porcentaje FROM usuarios WHERE correo=?", (correo,))
    return int(r[0][0]) if r else 0

# ---------------------------
# Horas utils
# ---------------------------
def registrar_hora(estudiante, proyecto_id, fecha, descripcion, cantidad):
    if not fecha or not descripcion or not cantidad:
        return False, "Completa todos los campos."
    try:
        cantidad_f = float(cantidad)
    except:
        return False, "Horas inválidas."
    try:
        ano = int(fecha.split("-")[0])
    except:
        ano = datetime.now().year
    execute("INSERT INTO horas (estudiante, proyecto_id, fecha, descripcion, cantidad, estado, ano) VALUES (?, ?, ?, ?, ?, 'Pendiente', ?)",
            (estudiante, proyecto_id, fecha, descripcion, cantidad_f, ano))
    return True, "Horas registradas. Pendiente de aprobación."

def horas_aprobadas_por_anio(estudiante, ano):
    r = fetchall("SELECT COALESCE(SUM(cantidad),0) FROM horas WHERE estudiante=? AND ano=? AND estado='Aprobado'", (estudiante, ano))
    return float(r[0][0]) if r else 0.0

def horas_aprobadas_acumuladas_hasta(estudiante, ano):
    r = fetchall("SELECT COALESCE(SUM(cantidad),0) FROM horas WHERE estudiante=? AND ano<=? AND estado='Aprobado'", (estudiante, ano))
    return float(r[0][0]) if r else 0.0

# ---------------------------
# Proyectos & postulaciones
# ---------------------------
def crear_proyecto(nombre, descripcion, cupos, encargado, horas_otorgadas):
    ahora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    execute("INSERT INTO proyectos (nombre, descripcion, horas_otorgadas, cupos, encargado, estado, creado_en) VALUES (?, ?, ?, ?, ?, 'Activo', ?)",
            (nombre, descripcion, float(horas_otorgadas), int(cupos), encargado, ahora))

def editar_proyecto(pid, nombre, descripcion, cupos, encargado, horas_otorgadas, estado):
    execute("UPDATE proyectos SET nombre=?, descripcion=?, cupos=?, encargado=?, horas_otorgadas=?, estado=? WHERE id=?",
            (nombre, descripcion, int(cupos), encargado, float(horas_otorgadas), state_normalize(estado), pid))

def state_normalize(s):
    return s if s in ("Activo","Finalizado","Cancelado") else "Activo"

def listar_proyectos(filtro=None):
    q = "SELECT id, nombre, descripcion, horas_otorgadas, cupos, encargado, estado, creado_en FROM proyectos"
    if filtro == "activo":
        q += " WHERE estado='Activo'"
    elif filtro == "finalizado":
        q += " WHERE estado='Finalizado'"
    return fetchall(q)

def listar_proyectos_historial():
    return fetchall("SELECT id, nombre, descripcion, horas_otorgadas, cupos, encargado, estado, creado_en FROM proyectos WHERE estado!='Activo'")

def get_proyecto(pid):
    r = fetchall("SELECT id, nombre, descripcion, horas_otorgadas, cupos, encargado, estado, creado_en FROM proyectos WHERE id=?", (pid,))
    return r[0] if r else None

def postular(proyecto_id, estudiante):
    fecha = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    try:
        execute("INSERT INTO postulaciones (proyecto_id, estudiante, estado, fecha) VALUES (?, ?, 'Pendiente', ?)",
                (int(proyecto_id), estudiante, fecha))
        return True, "Postulación enviada (Pendiente)."
    except sqlite3.IntegrityError:
        return False, "Ya te postulaste a ese proyecto."

def listar_postulaciones_por_proyecto(pid):
    return fetchall("SELECT id, proyecto_id, estudiante, estado, fecha FROM postulaciones WHERE proyecto_id=? ORDER BY fecha DESC", (pid,))

def listar_postulaciones_por_estudiante(estudiante):
    return fetchall("""SELECT p.id, p.proyecto_id, pr.nombre, p.estado, p.fecha
                       FROM postulaciones p JOIN proyectos pr ON p.proyecto_id=pr.id
                       WHERE p.estudiante=? ORDER BY p.fecha DESC""", (estudiante,))

def cambiar_estado_postulacion(post_id, nuevo_estado):
    execute("UPDATE postulaciones SET estado=? WHERE id=?", (nuevo_estado, post_id))

def contar_aceptados(pid):
    r = fetchall("SELECT COUNT(*) FROM postulaciones WHERE proyecto_id=? AND estado='Aceptado'", (pid,))
    return int(r[0][0]) if r else 0

def hay_cupo(pid):
    p = get_proyecto(pid)
    if not p:
        return False
    cupos = p[4]
    aceptados = contar_aceptados(pid)
    return aceptados < cupos

def get_accepted_students(pid):
    rows = fetchall("SELECT estudiante FROM postulaciones WHERE proyecto_id=? AND estado='Aceptado'", (pid,))
    return [r[0] for r in rows]

# ---------------------------
# Mensajería
# ---------------------------
def enviar_mensaje(proyecto_id, remitente, receptor, texto):
    fecha = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    execute("INSERT INTO mensajes (proyecto_id, remitente, receptor, mensaje, fecha) VALUES (?, ?, ?, ?, ?)",
            (proyecto_id, remitente, receptor, texto, fecha))

def obtener_mensajes_proyecto(pid):
    return fetchall("SELECT id, remitente, receptor, mensaje, fecha FROM mensajes WHERE proyecto_id=? ORDER BY id ASC", (pid,))

def obtener_mensajes_entre(u1, u2):
    return fetchall("SELECT id, remitente, receptor, mensaje, fecha FROM mensajes WHERE (remitente=? AND receptor=?) OR (remitente=? AND receptor=?) ORDER BY id ASC",
                    (u1, u2, u2, u1))

# ---------------------------
# Notificaciones & verificación anual
# ---------------------------
def crear_notificacion(estudiante, mensaje):
    execute("INSERT INTO notificaciones (estudiante, mensaje, fecha, leido) VALUES (?, ?, ?, 0)",
            (estudiante, mensaje, datetime.now().strftime("%Y-%m-%d %H:%M:%S")))

def verificar_cumplimiento_anual(ano=None):
    if ano is None:
        ano = datetime.now().year
    studs = fetchall("SELECT correo, porcentaje FROM usuarios WHERE rol='estudiante'")
    for correo, pct in studs:
        aprobadas = horas_aprobadas_por_anio(correo, ano)
        requeridas = float(pct)
        if aprobadas < requeridas:
            faltan = requeridas - aprobadas
            msg = f"⚠️ {correo} no completó {requeridas:.1f}h en {ano}. Realizó {aprobadas:.1f}h. Faltan {faltan:.1f}h."
            rows = fetchall("SELECT COUNT(*) FROM notificaciones WHERE estudiante=? AND mensaje LIKE ? AND leido=0", (correo, f"%{ano}%"))
            if rows and rows[0][0] == 0:
                crear_notificacion(correo, msg)
        elif aprobadas > requeridas:
            extra = aprobadas - requeridas
            ano_sig = ano + 1
            rows = fetchall("""SELECT COALESCE(SUM(cantidad),0) FROM horas
                                WHERE estudiante=? AND ano=? AND descripcion LIKE ? AND estado='Aprobado'""",
                            (correo, ano_sig, f"%acumuladas%{ano}%"))
            ya = float(rows[0][0]) if rows else 0.0
            faltante = extra - ya
            if faltante > 0.0001:
                desc = f"Horas acumuladas del año {ano} (exceso: {extra:.1f}h)"
                execute("INSERT INTO horas (estudiante, proyecto_id, fecha, descripcion, cantidad, estado, ano) VALUES (?, NULL, ?, ?, ?, 'Aprobado', ?)",
                        (correo, f"{ano_sig}-01-01", desc, faltante, ano_sig))
    return True

# ---------------------------
# GUI - Main
# ---------------------------
root = tk.Tk()
root.title("Key Hour Administrator v6")
root.geometry("480x420")

tk.Label(root, text="🔑 Key Hour Administrator (v6)", font=("Arial", 16, "bold")).pack(pady=14)
tk.Label(root, text="Correo institucional:").pack()
entry_correo = tk.Entry(root, width=44)
entry_correo.pack(pady=6)
tk.Label(root, text="Contraseña:").pack()
entry_contra = tk.Entry(root, width=44, show="*")
entry_contra.pack(pady=6)

# ---- STUDENT PANEL ----
def open_panel_estudiante(correo):
    v = tk.Toplevel(root)
    v.title(f"Estudiante - {correo}")
    v.geometry("1000x700")

    tk.Label(v, text=f"👨‍🎓 Estudiante: {correo}", font=("Arial", 12, "bold")).pack(pady=6)

    # Proyectos disponibles (solo activos)
    frame_top = tk.Frame(v)
    frame_top.pack(fill="x", padx=8, pady=6)

    proj_frame = tk.LabelFrame(frame_top, text="Proyectos disponibles (Activos)")
    proj_frame.pack(side="left", fill="both", expand=True, padx=6, pady=4)

    tree_proj = ttk.Treeview(proj_frame, columns=("id","nombre","horas","cupos","encargado","estado"), show="headings", height=12)
    for c,h in zip(("id","nombre","horas","cupos","encargado","estado"), ("ID","Nombre","Horas","Cupos","Encargado","Estado")):
        tree_proj.heading(c, text=h)
        tree_proj.column(c, width=140 if c!="nombre" else 320)
    tree_proj.pack(fill="both", expand=True, padx=6, pady=6)

    def cargar_proyectos():
        for r in tree_proj.get_children():
            tree_proj.delete(r)
        rows = listar_proyectos(filtro="activo")
        for p in rows:
            pid, nombre, desc, horas_ot, cupos, encargado, estado, creado = p
            tree_proj.insert("", tk.END, values=(pid, nombre, horas_ot, cupos, encargado, estado))
    cargar_proyectos()

    btn_frame = tk.Frame(frame_top)
    btn_frame.pack(side="left", fill="y", padx=6)

    # Ahora la postulación se hace en el modal de detalle:
    def ver_detalle():
        sel = tree_proj.selection()
        if not sel:
            messagebox.showwarning("Atención", "Selecciona un proyecto.")
            return
        pid = tree_proj.item(sel[0])["values"][0]
        p = get_proyecto(pid)
        if not p:
            messagebox.showerror("Error", "Proyecto no encontrado.")
            return
        _, nombre, descripcion, horas_ot, cupos, encargado, estado, creado = p
        d = tk.Toplevel(v)
        d.title("Detalle proyecto")
        d.geometry("700x520")
        tk.Label(d, text=nombre, font=("Arial", 14, "bold")).pack(pady=6)
        tk.Label(d, text=f"Encargado: {encargado} | Cupos: {cupos} | Horas: {horas_ot} | Estado: {estado}").pack(pady=4)
        tk.Label(d, text="Descripción:", font=("Arial", 10, "bold")).pack(anchor="w", padx=8, pady=4)
        txt = tk.Text(d, height=12, wrap="word")
        txt.insert("1.0", descripcion)
        txt.config(state="disabled")
        txt.pack(fill="both", expand=True, padx=8, pady=6)

        # Mostrar si el usuario ya se postuló y estado
        rows = fetchall("SELECT estado FROM postulaciones WHERE proyecto_id=? AND estudiante=?", (pid, correo))
        estado_post = rows[0][0] if rows else None
        lbl_estado = tk.Label(d, text=f"Estado de tu postulación: {estado_post if estado_post else 'No postulaste'}", font=("Arial", 10))
        lbl_estado.pack(pady=4)

        def accion_postular_modal():
            # Solo si activo
            if estado != "Activo":
                messagebox.showerror("Error", "No puedes postular a un proyecto no activo.")
                return
            ok, msg = postular(pid, correo)
            if ok:
                messagebox.showinfo("Postulación", msg)
                lbl_estado.config(text=f"Estado de tu postulación: Pendiente")
            else:
                messagebox.showerror("Error", msg)

        tk.Button(d, text="Postularme", bg="#2196F3", fg="white", command=accion_postular_modal).pack(pady=6)
        tk.Button(d, text="Cerrar", command=d.destroy).pack(pady=6)

    tk.Button(btn_frame, text="Ver detalle y postular (modal)", command=ver_detalle).pack(pady=6)
    tk.Button(btn_frame, text="Actualizar proyectos", command=cargar_proyectos).pack(pady=6)

    # Postulaciones del estudiante
    post_frame = tk.LabelFrame(v, text="Mis postulaciones")
    post_frame.pack(fill="x", padx=8, pady=6)
    tree_post = ttk.Treeview(post_frame, columns=("id","proy_id","proy_nombre","estado","fecha"), show="headings", height=6)
    for c,h in zip(("id","proy_id","proy_nombre","estado","fecha"), ("ID","Proyecto ID","Proyecto","Estado","Fecha")):
        tree_post.heading(c, text=h)
        tree_post.column(c, width=200 if c!="proy_nombre" else 380)
    tree_post.pack(fill="x", padx=6, pady=6)

    def cargar_postulaciones():
        for r in tree_post.get_children():
            tree_post.delete(r)
        rows = listar_postulaciones_por_estudiante(correo)
        for r in rows:
            tree_post.insert("", tk.END, values=r)
    cargar_postulaciones()

    # Registro de horas (por proyecto aceptado)
    reg_frame = tk.LabelFrame(v, text="Registrar horas (proyectos aceptados)")
    reg_frame.pack(fill="x", padx=8, pady=6)
    tk.Label(reg_frame, text="Proyecto (aceptado):").grid(row=0, column=0, padx=6, pady=4, sticky="e")
    combo_aceptados = ttk.Combobox(reg_frame, values=[], width=60)
    combo_aceptados.grid(row=0, column=1, padx=6, pady=4, sticky="w")

    def cargar_aceptados():
        rows = fetchall("""SELECT pr.id, pr.nombre FROM postulaciones p
                           JOIN proyectos pr ON p.proyecto_id=pr.id
                           WHERE p.estudiante=? AND p.estado='Aceptado'""", (correo,))
        vals = [f"{r[0]} - {r[1]}" for r in rows]
        combo_aceptados['values'] = vals
        if vals:
            combo_aceptados.current(0)
    cargar_aceptados()

    tk.Label(reg_frame, text="Fecha (AAAA-MM-DD):").grid(row=1, column=0, padx=6, pady=4, sticky="e")
    e_fecha = tk.Entry(reg_frame); e_fecha.grid(row=1, column=1, padx=6, pady=4, sticky="w")
    e_fecha.insert(0, datetime.now().strftime("%Y-%m-%d"))
    tk.Label(reg_frame, text="Descripción:").grid(row=2, column=0, padx=6, pady=4, sticky="e")
    e_desc = tk.Entry(reg_frame, width=70); e_desc.grid(row=2, column=1, padx=6, pady=4, sticky="w")
    tk.Label(reg_frame, text="Horas:").grid(row=3, column=0, padx=6, pady=4, sticky="e")
    e_horas = tk.Entry(reg_frame); e_horas.grid(row=3, column=1, padx=6, pady=4, sticky="w")

    def accion_registrar_hora():
        sel = combo_aceptados.get()
        if not sel:
            messagebox.showwarning("Atención", "No estás aceptado en ningún proyecto.")
            return
        pid = int(sel.split(" - ")[0])
        ok, msg = registrar_hora(correo, pid, e_fecha.get().strip(), e_desc.get().strip(), e_horas.get().strip())
        if ok:
            messagebox.showinfo("Éxito", msg)
            e_desc.delete(0, tk.END); e_horas.delete(0, tk.END)
        else:
            messagebox.showerror("Error", msg)

    tk.Button(reg_frame, text="Registrar horas", bg="#4CAF50", fg="white", command=accion_registrar_hora).grid(row=4, column=0, columnspan=2, pady=6)

    # Chat: si aceptado en proyecto -> chat por proyecto
    chat_frame = tk.LabelFrame(v, text="Chat (proyectos aceptados)")
    chat_frame.pack(fill="both", expand=True, padx=8, pady=6)
    tree_chat = ttk.Treeview(chat_frame, columns=("remitente","mensaje","fecha"), show="headings", height=12)
    for c,h in zip(("remitente","mensaje","fecha"), ("Remitente","Mensaje","Fecha")):
        tree_chat.heading(c, text=h)
        tree_chat.column(c, width=280 if c!="fecha" else 160)
    tree_chat.pack(fill="both", expand=True, padx=6, pady=6)

    combo_chat = ttk.Combobox(v, values=[], width=80)
    combo_chat.pack(pady=4)
    def cargar_chat_combo():
        rows = fetchall("""SELECT pr.id, pr.nombre FROM postulaciones p
                          JOIN proyectos pr ON p.proyecto_id=pr.id
                          WHERE p.estudiante=? AND p.estado='Aceptado'""", (correo,))
        vals = [f"{r[0]} - {r[1]}" for r in rows]
        combo_chat['values'] = vals
        if vals:
            combo_chat.current(0)
    cargar_chat_combo()

    def cargar_chat():
        tree_chat.delete(*tree_chat.get_children())
        sel = combo_chat.get()
        if not sel:
            return
        pid = int(sel.split(" - ")[0])
        msgs = obtener_mensajes_proyecto(pid)
        for m in msgs:
            tree_chat.insert("", tk.END, values=(m[1], m[3], m[4]))

    cargar_chat()

    frame_msg = tk.Frame(v)
    frame_msg.pack(fill="x", padx=8, pady=4)
    entry_msg = tk.Entry(frame_msg, width=80)
    entry_msg.pack(side="left", padx=6)
    def enviar_msg():
        sel = combo_chat.get()
        if not sel:
            messagebox.showwarning("Atención", "Selecciona un proyecto para chatear.")
            return
        pid = int(sel.split(" - ")[0])
        txt = entry_msg.get().strip()
        if not txt:
            return
        p = get_proyecto(pid)
        if not p:
            messagebox.showerror("Error", "Proyecto no encontrado.")
            return
        encargado = p[5]
        enviar_mensaje(pid, correo, encargado, txt)
        entry_msg.delete(0, tk.END)
        cargar_chat()
    tk.Button(frame_msg, text="Enviar", bg="#4CAF50", fg="white", command=enviar_msg).pack(side="left", padx=6)

    # utilidad
    util_frame = tk.Frame(v)
    util_frame.pack(pady=6)
    tk.Button(util_frame, text="Actualizar todo", command=lambda: (cargar_proyectos(), cargar_postulaciones(), cargar_aceptados(), cargar_chat_combo(), cargar_chat())).pack()

# ---- ENCARGADO PANEL ----
def open_panel_encargado(correo):
    v = tk.Toplevel(root)
    v.title(f"Encargado - {correo}")
    v.geometry("1100x700")

    tk.Label(v, text=f"👨‍💼 Encargado: {correo}", font=("Arial", 12, "bold")).pack(pady=6)

    # Proyectos asignados
    frame_p = tk.LabelFrame(v, text="Mis proyectos asignados")
    frame_p.pack(fill="x", padx=8, pady=6)
    tree_p = ttk.Treeview(frame_p, columns=("id","nombre","horas","cupos","estado"), show="headings", height=6)
    for c,h in zip(("id","nombre","horas","cupos","estado"), ("ID","Nombre","Horas","Cupos","Estado")):
        tree_p.heading(c, text=h)
        tree_p.column(c, width=180 if c!="nombre" else 520)
    tree_p.pack(fill="x", padx=6, pady=6)

    def cargar_proyectos_asig():
        for r in tree_p.get_children():
            tree_p.delete(r)
        rows = fetchall("SELECT id, nombre, horas_otorgadas, cupos, estado FROM proyectos WHERE encargado=?", (correo,))
        for r in rows:
            tree_p.insert("", tk.END, values=r)
    cargar_proyectos_asig()

    # Postulaciones
    post_frame = tk.LabelFrame(v, text="Postulaciones (selecciona proyecto y pulsa 'Ver postulaciones')")
    post_frame.pack(fill="both", expand=True, padx=8, pady=6)
    tree_post = ttk.Treeview(post_frame, columns=("id","estudiante","estado","fecha"), show="headings", height=10)
    for c,h in zip(("id","estudiante","estado","fecha"), ("ID","Estudiante","Estado","Fecha")):
        tree_post.heading(c, text=h)
        tree_post.column(c, width=260)
    tree_post.pack(fill="both", expand=True, padx=6, pady=6)

    def ver_postulaciones():
        sel = tree_p.selection()
        if not sel:
            messagebox.showwarning("Atención", "Selecciona un proyecto.")
            return
        pid = tree_p.item(sel[0])["values"][0]
        rows = listar_postulaciones_por_proyecto(pid)
        tree_post.delete(*tree_post.get_children())
        for r in rows:
            tree_post.insert("", tk.END, values=(r[0], r[2], r[3], r[4]))

    def aceptar():
        sel = tree_post.selection()
        if not sel:
            messagebox.showwarning("Atención", "Selecciona una postulación.")
            return
        post_id = tree_post.item(sel[0])["values"][0]
        # comprobar cupo
        row = fetchall("SELECT proyecto_id FROM postulaciones WHERE id=?", (post_id,))
        if not row:
            messagebox.showerror("Error", "Postulación no encontrada.")
            return
        pid = row[0][0]
        if not hay_cupo(pid):
            messagebox.showerror("Error", "No hay cupos disponibles.")
            return
        cambiar_estado_postulacion(post_id, "Aceptado")
        messagebox.showinfo("Hecho", "Postulación aceptada.")
        ver_postulaciones()
        cargar_proyectos_asig()

    def rechazar():
        sel = tree_post.selection()
        if not sel:
            messagebox.showwarning("Atención", "Selecciona una postulación.")
            return
        post_id = tree_post.item(sel[0])["values"][0]
        cambiar_estado_postulacion(post_id, "Rechazado")
        messagebox.showinfo("Hecho", "Postulación rechazada.")
        ver_postulaciones()
        cargar_proyectos_asig()

    btns = tk.Frame(v)
    btns.pack(pady=6)
    tk.Button(btns, text="Ver postulaciones", command=ver_postulaciones).pack(side="left", padx=6)
    tk.Button(btns, text="✅ Aceptar", bg="#4CAF50", fg="white", command=aceptar).pack(side="left", padx=6)
    tk.Button(btns, text="❌ Rechazar", bg="#f44336", fg="white", command=rechazar).pack(side="left", padx=6)

    # Aprobación de horas
    apro_frame = tk.LabelFrame(v, text="Aprobación de horas por proyecto")
    apro_frame.pack(fill="both", expand=True, padx=8, pady=6)
    tree_horas = ttk.Treeview(apro_frame, columns=("id","estudiante","proyecto","fecha","desc","cantidad","estado","ano"), show="headings", height=10)
    for c,h in zip(("id","estudiante","proyecto","fecha","desc","cantidad","estado","ano"),
                   ("ID","Estudiante","Proyecto","Fecha","Descripción","Horas","Estado","Año")):
        tree_horas.heading(c, text=h)
        tree_horas.column(c, width=140 if c!="desc" and c!="proyecto" else 300)
    tree_horas.pack(fill="both", expand=True, padx=6, pady=6)

    def cargar_horas_pendientes():
        rows = fetchall("""SELECT h.id, h.estudiante, pr.nombre, h.fecha, h.descripcion, h.cantidad, h.estado, h.ano
                           FROM horas h JOIN proyectos pr ON h.proyecto_id=pr.id
                           WHERE pr.encargado=? ORDER BY h.ano DESC, h.fecha DESC""", (correo,))
        tree_horas.delete(*tree_horas.get_children())
        for r in rows:
            tree_horas.insert("", tk.END, values=r)
    cargar_horas_pendientes()

    def aprobar_hora():
        sel = tree_horas.selection()
        if not sel:
            messagebox.showwarning("Atención", "Selecciona un registro.")
            return
        hid = tree_horas.item(sel[0])["values"][0]
        execute("UPDATE horas SET estado='Aprobado' WHERE id=?", (hid,))
        messagebox.showinfo("Éxito", "Registro aprobado.")
        cargar_horas_pendientes()

    def denegar_hora():
        sel = tree_horas.selection()
        if not sel:
            messagebox.showwarning("Atención", "Selecciona un registro.")
            return
        hid = tree_horas.item(sel[0])["values"][0]
        execute("UPDATE horas SET estado='Rechazado' WHERE id=?", (hid,))
        messagebox.showinfo("Hecho", "Registro rechazado.")
        cargar_horas_pendientes()

    btns2 = tk.Frame(v)
    btns2.pack(pady=6)
    tk.Button(btns2, text="Actualizar horas", command=cargar_horas_pendientes).pack(side="left", padx=6)
    tk.Button(btns2, text="✅ Aprobar hora", bg="#4CAF50", fg="white", command=aprobar_hora).pack(side="left", padx=6)
    tk.Button(btns2, text="❌ Denegar hora", bg="#f44336", fg="white", command=denegar_hora).pack(side="left", padx=6)

    # Chat por proyecto
    chat_frame = tk.LabelFrame(v, text="Chat por proyecto (con estudiantes aceptados)")
    chat_frame.pack(fill="both", expand=True, padx=8, pady=6)
    tree_chat = ttk.Treeview(chat_frame, columns=("remitente","mensaje","fecha"), show="headings", height=10)
    for c,h in zip(("remitente","mensaje","fecha"), ("Remitente","Mensaje","Fecha")):
        tree_chat.heading(c, text=h)
        tree_chat.column(c, width=300 if c!="fecha" else 160)
    tree_chat.pack(fill="both", expand=True, padx=6, pady=6)

    combo_proj = ttk.Combobox(v, values=[], width=80)
    combo_proj.pack(pady=4)
    def cargar_combo_proyectos():
        rows = fetchall("SELECT id, nombre FROM proyectos WHERE encargado=?", (correo,))
        vals = [f"{r[0]} - {r[1]}" for r in rows]
        combo_proj['values'] = vals
        if vals:
            combo_proj.current(0)
    cargar_combo_proyectos()

    def cargar_chat_proj():
        tree_chat.delete(*tree_chat.get_children())
        sel = combo_proj.get()
        if not sel:
            return
        pid = int(sel.split(" - ")[0])
        msgs = obtener_mensajes_proyecto(pid)
        for m in msgs:
            tree_chat.insert("", tk.END, values=(m[1], m[3], m[4]))
    cargar_chat_proj()

    frame_msg = tk.Frame(v)
    frame_msg.pack(fill="x", padx=8, pady=4)
    entry_msg = tk.Entry(frame_msg, width=80)
    entry_msg.pack(side="left", padx=6)
    def enviar_chat_enc():
        sel = combo_proj.get()
        if not sel:
            messagebox.showwarning("Atención", "Selecciona un proyecto.")
            return
        pid = int(sel.split(" - ")[0])
        txt = entry_msg.get().strip()
        if not txt:
            return
        enviar_mensaje(pid, correo, None, txt)
        entry_msg.delete(0, tk.END)
        cargar_chat_proj()
    tk.Button(frame_msg, text="Enviar", bg="#2196F3", fg="white", command=enviar_chat_enc).pack(side="left", padx=6)

    tk.Button(v, text="Actualizar todo", command=lambda: (cargar_proyectos_asig(), ver_postulaciones(), cargar_horas_pendientes(), cargar_combo_proyectos(), cargar_chat_proj())).pack(pady=6)

# ---- ADMIN PANEL ----
def open_panel_admin(correo):
    v = tk.Toplevel(root)
    v.title(f"Administrador - {correo}")
    v.geometry("1200x900")

    tk.Label(v, text=f"🧑‍💻 Administrador: {correo}", font=("Arial", 12, "bold")).pack(pady=6)

    # Crear proyecto
    create_frame = tk.LabelFrame(v, text="Crear nuevo proyecto")
    create_frame.pack(fill="x", padx=8, pady=6)
    tk.Label(create_frame, text="Nombre:").grid(row=0, column=0, padx=6, pady=4)
    e_nombre = tk.Entry(create_frame, width=50); e_nombre.grid(row=0, column=1, padx=6, pady=4)
    tk.Label(create_frame, text="Horas a otorgar:").grid(row=0, column=2, padx=6, pady=4)
    e_horas = tk.Entry(create_frame, width=8); e_horas.grid(row=0, column=3, padx=6, pady=4)
    tk.Label(create_frame, text="Cupos:").grid(row=1, column=0, padx=6, pady=4)
    e_cupos = tk.Entry(create_frame, width=8); e_cupos.grid(row=1, column=1, padx=6, pady=4, sticky="w")
    tk.Label(create_frame, text="Encargado:").grid(row=1, column=2, padx=6, pady=4)
    encargados = [r[0] for r in fetchall("SELECT correo FROM usuarios WHERE rol='encargado'")]
    encargado_var = ttk.Combobox(create_frame, values=encargados, width=36)
    encargado_var.grid(row=1, column=3, padx=6, pady=4)
    tk.Label(create_frame, text="Descripción:").grid(row=2, column=0, padx=6, pady=4)
    e_desc = tk.Text(create_frame, height=4, width=120); e_desc.grid(row=3, column=0, columnspan=4, padx=6, pady=4)

    def accion_crear():
        nombre = e_nombre.get().strip()
        desc = e_desc.get("1.0", "end").strip()
        horas = e_horas.get().strip()
        cupos = e_cupos.get().strip()
        encargado = encargado_var.get().strip()
        if not nombre or not desc or not horas or not cupos or not encargado:
            messagebox.showwarning("Atención", "Completa todos los campos.")
            return
        try:
            crear_proyecto(nombre, desc, int(cupos), encargado, float(horas))
            messagebox.showinfo("Éxito", "Proyecto creado.")
            e_nombre.delete(0, tk.END); e_desc.delete("1.0", "end"); e_horas.delete(0, tk.END); e_cupos.delete(0, tk.END)
            cargar_proyectos_admin()
        except Exception as ex:
            messagebox.showerror("Error", f"No se pudo crear: {ex}")

    tk.Button(create_frame, text="Crear proyecto", bg="#2196F3", fg="white", command=accion_crear).grid(row=4, column=0, columnspan=4, pady=6)

    # Tabla proyectos admin
    admin_frame = tk.LabelFrame(v, text="Proyectos (Administrar)")
    admin_frame.pack(fill="both", expand=False, padx=8, pady=6)
    tree_admin = ttk.Treeview(admin_frame, columns=("id","nombre","horas","cupos","encargado","estado","creado"), show="headings", height=8)
    for c,h in zip(("id","nombre","horas","cupos","encargado","estado","creado"), ("ID","Nombre","Horas","Cupos","Encargado","Estado","Creado")):
        tree_admin.heading(c, text=h)
        tree_admin.column(c, width=160 if c!="nombre" else 420)
    tree_admin.pack(fill="both", padx=6, pady=6)

    def cargar_proyectos_admin():
        tree_admin.delete(*tree_admin.get_children())
        rows = listar_proyectos()
        for p in rows:
            pid, nombre, desc, horas_ot, cupos, encargado, estado, creado = p
            tree_admin.insert("", tk.END, values=(pid, nombre, horas_ot, cupos, encargado, estado, creado))
    cargar_proyectos_admin()

    def editar_sel():
        sel = tree_admin.selection()
        if not sel:
            messagebox.showwarning("Atención", "Selecciona un proyecto.")
            return
        pid = tree_admin.item(sel[0])["values"][0]
        p = get_proyecto(pid)
        if not p:
            messagebox.showerror("Error", "Proyecto no encontrado.")
            return
        d = tk.Toplevel(v); d.title("Editar proyecto (admin)"); d.geometry("760x520")
        tk.Label(d, text="Editar proyecto", font=("Arial", 12, "bold")).pack(pady=6)
        tk.Label(d, text="Nombre").pack(); e_n = tk.Entry(d, width=80); e_n.insert(0, p[1]); e_n.pack()
        tk.Label(d, text="Descripción").pack(); e_d = tk.Text(d, height=8, width=90); e_d.insert("1.0", p[2]); e_d.pack()
        tk.Label(d, text="Horas").pack(); e_h = tk.Entry(d); e_h.insert(0, str(p[3])); e_h.pack()
        tk.Label(d, text="Cupos").pack(); e_c = tk.Entry(d); e_c.insert(0, str(p[4])); e_c.pack()
        tk.Label(d, text="Encargado").pack(); e_enc = ttk.Combobox(d, values=[r[0] for r in fetchall("SELECT correo FROM usuarios WHERE rol='encargado'")], width=60); e_enc.set(p[5]); e_enc.pack()
        tk.Label(d, text="Estado").pack(); e_est = ttk.Combobox(d, values=["Activo","Finalizado","Cancelado"], width=20); e_est.set(p[6]); e_est.pack()
        def guardar_admin():
            try:
                editar_proyecto(pid, e_n.get().strip(), e_d.get("1.0","end").strip(), int(e_c.get().strip()), e_enc.get().strip(), float(e_h.get().strip()), e_est.get().strip())
                messagebox.showinfo("Hecho", "Proyecto actualizado.")
                cargar_proyectos_admin()
                d.destroy()
            except Exception as ex:
                messagebox.showerror("Error", f"No se pudo guardar: {ex}")
        tk.Button(d, text="Guardar cambios", bg="#4CAF50", fg="white", command=guardar_admin).pack(pady=8)
        def marcar_finalizado():
            if messagebox.askyesno("Confirmar", "¿Marcar proyecto como Finalizado?"):
                editar_proyecto(pid, p[1], p[2], p[4], p[5], p[3], "Finalizado")
                messagebox.showinfo("Hecho","Proyecto marcado Finalizado.")
                cargar_proyectos_admin()
                d.destroy()
        tk.Button(d, text="Marcar como Finalizado", bg="#f44336", fg="white", command=marcar_finalizado).pack(pady=4)

    tk.Button(v, text="Editar proyecto seleccionado", command=editar_sel).pack(pady=6)
    tk.Button(v, text="Actualizar proyectos", command=cargar_proyectos_admin).pack(pady=6)

    # Horas por estudiante: ver horas por año y acumuladas
    hrs_frame = tk.LabelFrame(v, text="Horas por estudiante (por año y acumuladas)")
    hrs_frame.pack(fill="both", expand=True, padx=8, pady=6)
    tree_hs = ttk.Treeview(hrs_frame, columns=("estudiante","beca","requeridas","aprobadas_ano","acumuladas"), show="headings", height=10)
    for c,h in zip(("estudiante","beca","requeridas","aprobadas_ano","acumuladas"), ("Estudiante","Beca(%)","Horas Req.","Aprobadas (Año)","Acumuladas hasta año")):
        tree_hs.heading(c, text=h)
        tree_hs.column(c, width=220 if c=="estudiante" else 140)
    tree_hs.pack(fill="both", expand=True, padx=6, pady=6)

    def cargar_horas_estudiantes():
        tree_hs.delete(*tree_hs.get_children())
        rows = fetchall("SELECT correo, porcentaje FROM usuarios WHERE rol='estudiante'")
        ano = datetime.now().year
        for correo_s, pct in rows:
            aprob = horas_aprobadas_por_anio(correo_s, ano)
            acum = horas_aprobadas_acumuladas_hasta(correo_s, ano)
            tree_hs.insert("", tk.END, values=(correo_s, pct, pct, f"{aprob:.1f}", f"{acum:.1f}"))
    cargar_horas_estudiantes()
    tk.Button(v, text="Actualizar resumen horas", command=cargar_horas_estudiantes).pack(pady=6)
    tk.Button(v, text="Verificar cumplimiento anual (año actual)", command=lambda: (verificar_cumplimiento_anual(), messagebox.showinfo("Hecho","Verificación ejecutada."))).pack(pady=4)

    # Historial (Finalizados / Cancelados) - NUEVO
    hist_frame = tk.LabelFrame(v, text="Historial de proyectos (Finalizados / Cancelados)")
    hist_frame.pack(fill="both", expand=True, padx=8, pady=6)
    tree_hist = ttk.Treeview(hist_frame, columns=("id","nombre","encargado","horas","cupos","estado","creado","participantes"), show="headings", height=8)
    for c,h in zip(("id","nombre","encargado","horas","cupos","estado","creado","participantes"),
                   ("ID","Nombre","Encargado","Horas","Cupos","Estado","Creado","Participantes (aceptados)")):
        tree_hist.heading(c, text=h)
        tree_hist.column(c, width=140 if c not in ("nombre","participantes") else 320)
    tree_hist.pack(fill="both", expand=True, padx=6, pady=6)

    def cargar_historial():
        tree_hist.delete(*tree_hist.get_children())
        rows = listar_proyectos_historial()
        for p in rows:
            pid, nombre, desc, horas_ot, cupos, encargado, estado, creado = p
            participants = ", ".join(get_accepted_students(pid)) or "-"
            tree_hist.insert("", tk.END, values=(pid, nombre, encargado, horas_ot, cupos, estado, creado, participants))
    cargar_historial()
    tk.Button(v, text="Actualizar historial", command=cargar_historial).pack(pady=6)

    # Chat admin
    chat_frame = tk.LabelFrame(v, text="Chat administrador (por usuario o por proyecto)")
    chat_frame.pack(fill="both", expand=True, padx=8, pady=6)
    tree_chat = ttk.Treeview(chat_frame, columns=("remitente","receptor","mensaje","fecha"), show="headings", height=10)
    for c,h in zip(("remitente","receptor","mensaje","fecha"), ("Remitente","Receptor","Mensaje","Fecha")):
        tree_chat.heading(c, text=h)
        tree_chat.column(c, width=260 if c!="fecha" else 160)
    tree_chat.pack(fill="both", expand=True, padx=6, pady=6)

    combo_target = ttk.Combobox(v, values=[], width=60)
    combo_target.pack(pady=4)
    def cargar_targets():
        users = [r[0] for r in fetchall("SELECT correo FROM usuarios WHERE rol IN ('estudiante','encargado')")]
        projs = [f"PROJ-{r[0]} - {r[1]}" for r in fetchall("SELECT id, nombre FROM proyectos")]
        combo_target['values'] = users + projs
        if users:
            combo_target.current(0)
    cargar_targets()

    def cargar_chat_target():
        tree_chat.delete(*tree_chat.get_children())
        sel = combo_target.get()
        if not sel:
            return
        if sel.startswith("PROJ-"):
            pid = int(sel.split(" - ")[0].replace("PROJ-",""))
            msgs = obtener_mensajes_proyecto(pid)
            for m in msgs:
                tree_chat.insert("", tk.END, values=(m[2], str(m[3]), m[4], m[5]) if False else (m[2], str(m[3]), m[4], m[4]))  # safe fallback
        else:
            target = sel
            msgs = obtener_mensajes_entre(correo, target)
            for m in msgs:
                tree_chat.insert("", tk.END, values=(m[1], m[2] if m[2] else target, m[3], m[4]))
    cargar_chat_target()

    frame_msg = tk.Frame(v)
    frame_msg.pack(fill="x", padx=8, pady=4)
    entry_msg = tk.Entry(frame_msg, width=80)
    entry_msg.pack(side="left", padx=6)
    def enviar_msg_admin():
        sel = combo_target.get()
        if not sel:
            messagebox.showwarning("Atención", "Selecciona un usuario o proyecto.")
            return
        txt = entry_msg.get().strip()
        if not txt:
            return
        if sel.startswith("PROJ-"):
            pid = int(sel.split(" - ")[0].replace("PROJ-",""))
            enviar_mensaje(pid, correo, None, txt)
        else:
            receptor = sel
            enviar_mensaje(None, correo, receptor, txt)
        entry_msg.delete(0, tk.END)
        cargar_chat_target()
    tk.Button(frame_msg, text="Enviar", bg="#2196F3", fg="white", command=enviar_msg_admin).pack(side="left", padx=6)
    tk.Button(v, text="Refrescar targets & chats", command=lambda: (cargar_targets(), cargar_chat_target())).pack(pady=6)

# ---------------------------
# Login action
# ---------------------------
def iniciar_sesion():
    correo = entry_correo.get().strip()
    contra = entry_contra.get().strip()
    if not correo or not contra:
        messagebox.showwarning("Atención", "Completa los campos.")
        return
    rol = get_rol(correo, contra)
    if not rol:
        messagebox.showerror("Error", "Credenciales incorrectas.")
        return
    if rol == "estudiante":
        open_panel_estudiante(correo)
    elif rol == "encargado":
        open_panel_encargado(correo)
    elif rol == "admin":
        open_panel_admin(correo)

btn_login = tk.Button(root, text="Iniciar sesión", bg="#4CAF50", fg="white", width=20, command=iniciar_sesion)
btn_login.pack(pady=18)

tk.Label(root, text="© Instituto Kriete de Ingeniería y Ciencias", font=("Arial", 8)).pack(side="bottom", pady=8)

# ---------------------------
# Inicializar DB & run
# ---------------------------
if __name__ == "__main__":
    init_db()
    root.mainloop()
