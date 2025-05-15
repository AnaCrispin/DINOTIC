// script.js actualizado con Socket.IO y mejoras
let bancoPreguntas = [];
let preguntaActiva = false;
let resolverPregunta;
let preguntasRespondidas = 0;
const preguntasPorTurno = 4;
let teclasHabilitadas = false;
let ultimoObjetoGenerado = null;
let preguntasUsadas = [];

window.addEventListener("DOMContentLoaded", () => {
    let selectedCharacter = localStorage.getItem("selectedCharacter") || "dino";
    let nombreEquipo = localStorage.getItem("nombreEquipo") || "Equipo Anónimo";
    let score = 0;

    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth * 0.7;
    canvas.height = window.innerHeight * 0.75;

    let personajeX = canvas.width / 3;
    let personajeY = canvas.height - 100;
    let velocidadY = 0;
    let enElAire = false;

    const gravedad = 1.5;
    const salto = -18;

    let personajeImg = new Image();
    personajeImg.src = selectedCharacter === "dino" ? "assets/dino2.png" : "assets/auto.png";

    const socket = io("https://netrunnerdino.upea.edu.bo");
    socket.on("movimiento", ({ tipo, direccion }) => {
        if (preguntaActiva && tipo === "movimiento") {
            if (!teclasHabilitadas) return;
            if (direccion === "derecha") resolverPregunta(true);
            if (direccion === "izquierda") resolverPregunta(false);
            return;
        }

        if (tipo === "movimiento") {
            if (direccion === "izquierda") personajeX -= 40;
            if (direccion === "derecha") personajeX += 40;
            if (direccion === "saltar" && !enElAire) {
                velocidadY = salto;
                enElAire = true;
            }
        }
    });

    function actualizarCamaraEstado(vivo) {
        const estado = document.getElementById("camera-status");
        estado.className = vivo ? "estado-verde" : "estado-rojo";
    }

    function actualizarHUD() {
        const nombreNivel = nivelActual.charAt(0).toUpperCase() + nivelActual.slice(1);
        document.getElementById("puntos").textContent = "Puntaje: " + score;
        document.getElementById("preguntas-restantes").textContent =
            "Preguntas restantes: " + (preguntasPorTurno - preguntasRespondidas);
        document.getElementById("jugador-activo").textContent =
            "Jugador: Nivel " + nombreNivel;
        document.getElementById("nombre-equipo").textContent = nombreEquipo;
    }

    function ocultarPantallaFinal() {
        const pantalla = document.getElementById("final-screen");
        if (pantalla) pantalla.classList.add("oculto");
    }

    function mostrarPantallaFinal() {
        const pantalla = document.getElementById("final-screen");
        const ranking = document.getElementById("ranking");
        if (pantalla) pantalla.classList.remove("oculto");
        if (ranking) ranking.classList.remove("oculto");

        document.getElementById("final-score").textContent = "Tu puntaje: " + score;
        const equipo = localStorage.getItem("nombreEquipo") || "Anónimo";
        const datos = JSON.parse(localStorage.getItem("rankingGlobal") || "[]");
        datos.push({ nombre: equipo, puntaje: score });
        datos.sort((a, b) => b.puntaje - a.puntaje);
        localStorage.setItem("rankingGlobal", JSON.stringify(datos.slice(0, 5)));

        const lista = document.getElementById("lista-ranking");
        lista.innerHTML = "";
        datos.slice(0, 5).forEach(e => {
            const li = document.createElement("li");
            li.textContent = `${e.nombre}: ${e.puntaje}`;
            lista.appendChild(li);
        });
    }

    let fondoOffset = 0;
    let objetos = [];
    let nivelActual = "basico";
    const niveles = ["basico", "intermedio", "avanzado"];
    let turnoActual = 0;

    function cambiarTurno() {
        turnoActual = (turnoActual + 1) % niveles.length;
        nivelActual = niveles[turnoActual];
        preguntasUsadas = []; // Reset preguntas por nivel

        const nombreNivel = nivelActual.charAt(0).toUpperCase() + nivelActual.slice(1);
        document.getElementById("jugador-activo").textContent = "Jugador: Nivel " + nombreNivel;
        document.getElementById("level-indicator").textContent = "Nivel " + (turnoActual + 1);

        const indicador = document.getElementById("level-indicator");
        indicador.style.display = "none";
        indicador.offsetHeight;
        indicador.style.display = "block";
        setTimeout(() => indicador.style.display = "none", 3000);
    }

    function generarObjeto() {
        const tipos = ["estrella", "bomba", "virus"];
        let tipo;
        do {
            tipo = tipos[Math.floor(Math.random() * tipos.length)];
        } while ((tipo === "estrella" || tipo === "virus") && tipo === ultimoObjetoGenerado);
        ultimoObjetoGenerado = tipo;

        const imagen = new Image();
        imagen.src = `assets/${tipo === 'estrella' ? 'star' : tipo}.png`;

        let velocidadBase = nivelActual === "intermedio" ? 2.5 : nivelActual === "avanzado" ? 3.5 : 0.8;
        objetos.push({ tipo, x: Math.random() * canvas.width, y: -50, ancho: 30, alto: 30, velocidadY: velocidadBase + Math.random(), imagen });
    }

    function mostrarFeedback(texto) {
        const modal = document.getElementById("feedback-modal");
        const textoDiv = document.getElementById("feedback-texto");
        const blur = document.getElementById("blur-layer");
        textoDiv.innerHTML = texto;
        modal.classList.remove("oculto");
        blur.classList.remove("oculto");
        setTimeout(() => {
            modal.classList.add("oculto");
            blur.classList.add("oculto");
        }, 6000);
    }

    function mostrarPreguntaAleatoria(tipoPregunta) {
        if (!puedeMostrarPregunta) return;
        const preguntasFiltradas = bancoPreguntas.filter(
            p => p.tipo === tipoPregunta && p.nivel === nivelActual && !preguntasUsadas.includes(p.texto)
        );
        if (preguntasFiltradas.length === 0) {
            alert("No hay más preguntas disponibles en este nivel.");
            return;
        }

        const pregunta = preguntasFiltradas[Math.floor(Math.random() * preguntasFiltradas.length)];
        preguntasUsadas.push(pregunta.texto);

        const modal = document.getElementById("pregunta-modal");
        const texto = document.getElementById("texto-pregunta");
        modal.classList.remove("oculto");
        texto.textContent = pregunta.texto;
        cancelAnimationFrame(animacionID);

        preguntaActiva = true;
        teclasHabilitadas = false;

        resolverPregunta = (respuestaJugador) => {
            if (!preguntaActiva) return;
            cancelAnimationFrame(animacionID);
            if (respuestaJugador === pregunta.respuesta) {
                score += 10;
                mostrarFeedback("✅ ¡Correcto!<br><br>" + pregunta.explicacion);
            } else {
                const correcta = pregunta.respuesta ? "VERDADERO" : "FALSO";
                mostrarFeedback("❌ Incorrecto<br>Respuesta correcta: " + correcta + "<br><br>" + pregunta.explicacion);
            }

            preguntasRespondidas++;
            if (preguntasRespondidas >= preguntasPorTurno) {
                preguntasRespondidas = 0;
                cambiarTurno();
            }

            document.getElementById("pregunta-modal").classList.add("oculto");
            preguntaActiva = false;
            puedeMostrarPregunta = false;
            tiempoInicio = Date.now();
            actualizarHUD();
            setTimeout(() => gameLoop(), 6000);
        };

        function escucharRespuesta(e) {
            if (!teclasHabilitadas) return;
            if (e.key === "ArrowRight") resolverPregunta(true);
            if (e.key === "ArrowLeft") resolverPregunta(false);
            document.removeEventListener("keydown", escucharRespuesta);
        }

        setTimeout(() => {
            document.addEventListener("keydown", escucharRespuesta);
            setTimeout(() => teclasHabilitadas = true, 6000);
        }, 200);
    }

    let animacionID;
    let tiempoInicio = Date.now();
    let puedeMostrarPregunta = false;

    function gameLoop() {
        if (!puedeMostrarPregunta && Date.now() - tiempoInicio > 3000) puedeMostrarPregunta = true;

        animacionID = requestAnimationFrame(gameLoop);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        fondoOffset -= 2;
        ctx.fillStyle = "#101010";
        ctx.fillRect(fondoOffset % canvas.width, 0, canvas.width, canvas.height);
        ctx.fillRect((fondoOffset % canvas.width) + canvas.width, 0, canvas.width, canvas.height);

        velocidadY += gravedad;
        personajeY += velocidadY;
        if (personajeY >= canvas.height - 100) {
            personajeY = canvas.height - 100;
            enElAire = false;
        }

        ctx.drawImage(personajeImg, personajeX, personajeY, 60, 60);

        if (Math.random() < 0.02) generarObjeto();

        for (let i = objetos.length - 1; i >= 0; i--) {
            const obj = objetos[i];
            obj.y += obj.velocidadY;
            ctx.drawImage(obj.imagen, obj.x, obj.y, obj.ancho, obj.alto);

            const colision = personajeX < obj.x + obj.ancho && personajeX + 60 > obj.x && personajeY < obj.y + obj.alto && personajeY + 60 > obj.y;
            if (colision) {
                if (obj.tipo === "estrella" && puedeMostrarPregunta) mostrarPreguntaAleatoria("seguridad");
                if (obj.tipo === "virus" && puedeMostrarPregunta) mostrarPreguntaAleatoria("virus");
                if (obj.tipo === "bomba") score -= 2;
                objetos.splice(i, 1);
                actualizarHUD();
            }
            if (obj.y > canvas.height) objetos.splice(i, 1);
        }
    }

    function restartGame() {
        personajeX = canvas.width / 3;
        personajeY = canvas.height - 100;
        velocidadY = 0;
        enElAire = false;
        score = 0;
        turnoActual = 0;
        nivelActual = niveles[turnoActual];
        tiempoInicio = Date.now();
        puedeMostrarPregunta = false;
        preguntaActiva = false;
        preguntasUsadas = [];
        actualizarHUD();
        actualizarCamaraEstado(true);
        ocultarPantallaFinal();
        gameLoop();
    }

    window.restartGame = restartGame;

    const iniciarJuego = () => {
        actualizarCamaraEstado(true);
        actualizarHUD();
        ocultarPantallaFinal();
        gameLoop();
    };

    fetch("preguntas.json")
        .then(res => res.json())
        .then(data => {
            bancoPreguntas = data;
            console.log("📚 Preguntas cargadas:", bancoPreguntas.length);
            iniciarJuego();
        })
        .catch(err => {
            console.error("❌ Error al cargar preguntas:", err);
            alert("Error cargando preguntas. Verifica preguntas.json.");
        });
});
