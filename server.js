const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// 👇 Aquí defines la ruta exacta para que coincida con el front
const io = new Server(server, {
    cors: {
        origin: "*"
    },
    path: "/juegouticdino/socket.io"
});

// 👇 Servir archivos estáticos (juego y control)
app.use(express.static(path.join(__dirname, 'juegouticdino')));

io.on('connection', (socket) => {
    console.log("🟢 Cliente conectado:", socket.id);

    socket.on("movimiento", (data) => {
        // 🔁 reenviamos a todos menos al que emitió
        socket.broadcast.emit("movimiento", data);
    });

    socket.on("disconnect", () => {
        console.log("🔴 Cliente desconectado:", socket.id);
    });
});

server.listen(3000, () => {
    console.log("🚀 Servidor escuchando en puerto 3000");
});
