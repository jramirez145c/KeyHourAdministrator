// backend/server.js
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { sql, config } = require('./db');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Servir archivos estáticos (frontend)
app.use(express.static(path.join(__dirname, '..')));

// Página principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// LOGIN
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Email y contraseña son obligatorios"
        });
    }

    if (password !== '1234') {
        return res.status(401).json({
            success: false,
            message: "Contraseña incorrecta"
        });
    }

    try {
        const pool = await sql.connect(config);

        const result = await pool.request()
            .input('correo', sql.VarChar, email)
            .query(`
                SELECT [Correo], [Tipo de Usuario]
                FROM [dbo].[Sheet1$]
                WHERE [Correo] = @correo
            `);

        if (result.recordset.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Usuario no encontrado"
            });
        }

        const rol = result.recordset[0]["Tipo de Usuario"];

        console.log("LOGIN OK:", email, rol);

        return res.json({
            success: true,
            rol,
            email
        });

    } catch (err) {
        console.log("\n-------------------------------------------");
        console.log("ERROR REAL DEL SERVIDOR:");
        console.log(err);
        console.log("-------------------------------------------\n");

        return res.status(500).json({
            success: false,
            message: "Error interno del servidor"
        });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor funcionando en http://localhost:${PORT}`);
});

