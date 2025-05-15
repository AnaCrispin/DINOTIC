// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// 🟢 Configurar Socket.IO con CORS y path personalizado
const io = new Server(server, {
    cors: {
        origin: "*"
    },
    path: "/juegouticdino/socket.io"
});

// 🟢 Servir archivos estáticos (juego y control)
app.use(express.static(__dirname));

// 🟢 Ruta de prueba
app.get("/juegouticdino/prueba", (req, res) => {
    res.send("✅ Servidor Express responde correctamente.");
});

// 🟢 Manejo de eventos de WebSocket
io.on("connection", (socket) => {
    console.log("🟢 Cliente conectado:", socket.id);

    socket.on("movimiento", (data) => {
        socket.broadcast.emit("movimiento", data);
    });

    socket.on("disconnect", () => {
        console.log("🔴 Cliente desconectado:", socket.id);
    });
});

// 🟢 Iniciar servidor en puerto 3000
server.listen(3000, () => {
    console.log("🚀 Servidor escuchando en puerto 3000");
});
