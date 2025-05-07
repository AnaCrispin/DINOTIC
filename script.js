let bancoPreguntas = [];
let preguntaActiva = false;
let resolverPregunta;
let preguntasRespondidas = 0;  // Contador de preguntas respondidas por turno
const preguntasPorTurno = 4;   // Cuántas preguntas debe responder cada jugador
let teclasHabilitadas = false;
let ultimoObjetoGenerado = null;
let preguntasUsadas = [];




// fetch("preguntas.json")
// .then(res => res.json())
// .then(data => {
//     bancoPreguntas = data;
//     console.log("📚 Preguntas cargadas:", bancoPreguntas.length);
// })
// .catch(err => console.error("❌ Error al cargar preguntas:", err));

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

        // Guarda el puntaje y nombre en el ranking
        const equipo = localStorage.getItem("nombreEquipo") || "Anónimo";
        const datos = JSON.parse(localStorage.getItem("rankingGlobal") || "[]");
        datos.push({ nombre: equipo, puntaje: score });

        // Ordena y guarda
        datos.sort((a, b) => b.puntaje - a.puntaje);
        localStorage.setItem("rankingGlobal", JSON.stringify(datos.slice(0, 5))); // top 5

        // Muestra
        const lista = document.getElementById("lista-ranking");
        lista.innerHTML = "";
        datos.slice(0, 5).forEach(e => {
            const li = document.createElement("li");
            li.textContent = `${e.nombre}: ${e.puntaje}`;
            lista.appendChild(li);
        });
    }


    function guardarPuntaje(nombre, puntaje) {
        const ranking = JSON.parse(localStorage.getItem("ranking")) || [];
        ranking.push({ nombre, puntaje });
        ranking.sort((a, b) => b.puntaje - a.puntaje);
        localStorage.setItem("ranking", JSON.stringify(ranking.slice(0, 10)));
    }

    function mostrarRanking() {
        const lista = document.getElementById("lista-ranking");
        const ranking = JSON.parse(localStorage.getItem("ranking")) || [];

        lista.innerHTML = "";

        ranking.forEach((item, index) => {
            const li = document.createElement("li");
            li.textContent = `${index + 1}. ${item.nombre} - ${item.puntaje} pts`;
            lista.appendChild(li);
        });

        document.getElementById("ranking").classList.remove("oculto");
    }


    const canal = new BroadcastChannel("canal_control_dino");

    canal.onmessage = (event) => {
        const { tipo, direccion } = event.data;
        console.log("📥 Movimiento externo:", direccion);

        // ✅ Si hay una pregunta activa, interpretamos la respuesta
        // if (preguntaActiva && tipo === "movimiento") {
        //     if (direccion === "derecha") resolverPregunta(true);   // VERDADERO
        //     if (direccion === "izquierda") resolverPregunta(false); // FALSO
        //     return; // No mover al personaje mientras responde
        // }
        if (preguntaActiva && tipo === "movimiento") {
            if (!teclasHabilitadas) return; // ⛔️ Bloquea si aún no está habilitado

            if (direccion === "derecha") resolverPregunta(true);
            if (direccion === "izquierda") resolverPregunta(false);
            return;
        }

        // ✅ Si no hay pregunta, mover normalmente al Dino
        if (tipo === "movimiento") {
            if (direccion === "izquierda") personajeX -= 40;
            if (direccion === "derecha") personajeX += 40;
            if (direccion === "saltar" && !enElAire) {
                velocidadY = salto;
                enElAire = true;
            }
        }
    };


    let fondoOffset = 0;

    let objetos = [];
    let nivelActual = "basico"; // luego lo podremos cambiar dinámicamente

    function generarObjeto() {
        const tipos = ["estrella", "bomba", "virus"];

        let tipo;
        do {
            tipo = tipos[Math.floor(Math.random() * tipos.length)];
        } while ((tipo === "estrella" || tipo === "virus") && tipo === ultimoObjetoGenerado);

        ultimoObjetoGenerado = tipo;

        const imagen = new Image();
        imagen.src = tipo === "estrella" ? "assets/star.png" :
            tipo === "bomba" ? "assets/bomba.png" :
                "assets/virus.png";

        let velocidadBase = 0.8;
        if (nivelActual === "intermedio") velocidadBase = 2.5;
        if (nivelActual === "avanzado") velocidadBase = 3.5;

        objetos.push({
            tipo,
            x: Math.random() * canvas.width,
            y: -50,
            ancho: 30,
            alto: 30,
            velocidadY: velocidadBase + Math.random(),
            imagen: imagen
        });
    }



    const niveles = ["basico", "intermedio", "avanzado"];
    let turnoActual = 0;
    nivelActual = niveles[turnoActual];
    // Inicialmente: "basico"

    function cambiarTurno() {
        turnoActual = (turnoActual + 1) % niveles.length;
        nivelActual = niveles[turnoActual];

        const nombreNivel = nivelActual.charAt(0).toUpperCase() + nivelActual.slice(1);

        document.getElementById("jugador-activo").textContent = "Jugador: Nivel " + nombreNivel;
        document.getElementById("level-indicator").textContent = "Nivel " + (turnoActual + 1);

        const indicador = document.getElementById("level-indicator");

        // 🧠 Reiniciar animación
        indicador.style.display = "none";
        indicador.offsetHeight; // forzar reflow
        indicador.style.display = "block";

        setTimeout(() => {
            indicador.style.display = "none";
        }, 3000);

        console.log("🔁 Cambió turno a:", nivelActual);
    }
    function mostrarFeedback(texto) {
        const feedbackModal = document.getElementById("feedback-modal");
        const feedbackTexto = document.getElementById("feedback-texto");
        const blurLayer = document.getElementById("blur-layer");

        feedbackTexto.innerHTML = texto;
        feedbackModal.classList.remove("oculto");
        blurLayer.classList.remove("oculto");

        setTimeout(() => {
            feedbackModal.classList.add("oculto");
            blurLayer.classList.add("oculto");
        }, 6000); // dura 4 segundos
    }
    function mostrarPreguntaAleatoria(tipoPregunta) {
        if (!puedeMostrarPregunta) return;

        const preguntasFiltradas = bancoPreguntas.filter(
            p => p.tipo === tipoPregunta &&
                p.nivel === nivelActual &&
                !preguntasUsadas.includes(p.texto)
        );

        if (preguntasFiltradas.length === 0) return;

        const pregunta = preguntasFiltradas[Math.floor(Math.random() * preguntasFiltradas.length)];
        preguntasUsadas.push(pregunta.texto);

        const modal = document.getElementById("pregunta-modal");
        const texto = document.getElementById("texto-pregunta");

        modal.classList.remove("oculto");
        texto.textContent = pregunta.texto;
        cancelAnimationFrame(animacionID);

        preguntaActiva = true;
        teclasHabilitadas = false; // 🔒 Bloqueo inmediato

        resolverPregunta = (respuestaJugador) => {
            if (!preguntaActiva) return;
            cancelAnimationFrame(animacionID);

            if (respuestaJugador === pregunta.respuesta) {
                score += 10;
                mostrarFeedback("✅ ¡Correcto!<br><br>" + pregunta.explicacion);
            } else {
                const respuestaCorrecta = pregunta.respuesta ? "VERDADERO" : "FALSO";
                mostrarFeedback("❌ Incorrecto<br>Respuesta correcta: " + respuestaCorrecta + "<br><br>" + pregunta.explicacion);
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

            setTimeout(() => {
                gameLoop();
            }, 6000);
        };

        // 👂 Escuchar respuesta solo después de 4 segundos
        function escucharRespuesta(e) {
            if (!teclasHabilitadas) return;
            if (e.key === "ArrowRight") resolverPregunta(true);
            if (e.key === "ArrowLeft") resolverPregunta(false);
            document.removeEventListener("keydown", escucharRespuesta);
        }

        setTimeout(() => {
            teclasHabilitadas = false;
            document.addEventListener("keydown", escucharRespuesta);

            setTimeout(() => {
                teclasHabilitadas = true;
            }, 6000); // ⏳ Ahora: 6 segundos para evitar pulsaciones impulsivas
        }, 200);

    }






    let animacionID;
    let tiempoInicio = Date.now();
    let puedeMostrarPregunta = false;

    function gameLoop() {
        // Activar preguntas después de 3 segundos
        if (!puedeMostrarPregunta && Date.now() - tiempoInicio > 3000) {
            puedeMostrarPregunta = true;
        }

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
        // Generar objetos aleatoriamente
        if (Math.random() < 0.02) {
            generarObjeto();
        }

        // Dibujar y mover objetos
        for (let i = objetos.length - 1; i >= 0; i--) {
            const obj = objetos[i];
            obj.y += obj.velocidadY;
            ctx.drawImage(obj.imagen, obj.x, obj.y, obj.ancho, obj.alto);

            // Detectar colisión con el Dino
            const colision = personajeX < obj.x + obj.ancho &&
                personajeX + 60 > obj.x &&
                personajeY < obj.y + obj.alto &&
                personajeY + 60 > obj.y;

            if (colision) {
                if (obj.tipo === "estrella" && puedeMostrarPregunta) {
                    mostrarPreguntaAleatoria("seguridad");
                }
                if (obj.tipo === "bomba") {
                    score -= 2;
                }
                if (obj.tipo === "virus" && puedeMostrarPregunta) {
                    mostrarPreguntaAleatoria("virus");
                }

                objetos.splice(i, 1);
                actualizarHUD();
            }

            // Eliminar si cae fuera de pantalla
            if (obj.y > canvas.height) {
                objetos.splice(i, 1);
            }
        }



    }
    function restartGame() {
        personajeX = canvas.width / 3;
        personajeY = canvas.height - 100;
        velocidadY = 0;
        enElAire = false;
        score = 0;

        // 🔁 Reiniciar turno y nivel
        turnoActual = 0;
        nivelActual = niveles[turnoActual];

        // ⏱️ Reinicio del temporizador de preguntas
        tiempoInicio = Date.now();
        puedeMostrarPregunta = false;
        preguntaActiva = false;

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

    // Esperar a que se carguen las preguntas antes de iniciar
    fetch("preguntas.json")
        .then(res => res.json())
        .then(data => {
            bancoPreguntas = data;
            console.log("📚 Preguntas cargadas:", bancoPreguntas.length);
            iniciarJuego(); // ← Solo se ejecuta si las preguntas ya están listas
        })
        .catch(err => {
            console.error("❌ Error al cargar preguntas:", err);
            alert("Error cargando preguntas. Verifica preguntas.json.");
        });

});