document.addEventListener("DOMContentLoaded", function () {
    const video = document.getElementById("video");
    const canvas = document.getElementById("canvas");
    const captureBtn = document.getElementById("captureBtn");
    const imageUpload = document.getElementById("imageUpload");
    const sendBtn = document.getElementById("sendBtn");
    const emotionResult = document.getElementById("emotionResult");
    const chatbotMessage = document.getElementById("chatbotMessage");
    const chatbox = document.getElementById("chatbox");
    const sendMessageBtn = document.getElementById("sendMessageBtn");
    const userInput = document.getElementById("userInput");

    // Activar la cámara
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            video.srcObject = stream;
        })
        .catch(err => {
            console.error("Error al acceder a la cámara: ", err);
        });

    let capturedImage = null;

    // Capturar imagen desde la cámara
    captureBtn.addEventListener("click", () => {
        const context = canvas.getContext("2d");
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convertir a formato Blob y luego a archivo
        canvas.toBlob(blob => {
            capturedImage = new File([blob], "captured_photo.jpg", { type: "image/jpeg" });
            alert("Imagen capturada. Presiona 'Analizar Emoción'.");
        }, "image/jpeg");
    });

    // Enviar la imagen al backend para análisis de emociones
    sendBtn.addEventListener("click", () => {
        const formData = new FormData();
    
        if (capturedImage) {
            formData.append("file", capturedImage);
        } else if (imageUpload.files.length > 0) {
            formData.append("file", imageUpload.files[0]);
        } else {
            alert("Por favor, sube una imagen o toma una foto.");
            return;
        }
    
        fetch("/analyze", {
            method: "POST",
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            let emotion = data.emotion;
            emotionResult.textContent = "Emoción detectada: " + emotion;
    
            let emotionMessage = "";
            switch (emotion.toLowerCase()) {
                case "happy":
                case "feliz":
                    emotionMessage = "¡Qué alegría verte feliz! 😊 ¿Qué te hace sentir así hoy?";
                    break;
                case "sad":
                case "triste":
                    emotionMessage = "Parece que estás triste 😔. ¿Quieres contarme qué pasa?";
                    break;
                case "angry":
                case "enojado":
                    emotionMessage = "Veo que estás molesto 💢. ¿Quieres hablar de lo que te preocupa?";
                    break;
                case "surprised":
                case "sorprendido":
                    emotionMessage = "¡Vaya! Parece que algo te sorprendió 😲. ¿Qué fue lo que pasó?";
                    break;
                default:
                    emotionMessage = "Hola, ¿cómo te sientes hoy? 😊";
                    break;
            }
    
            // Insertar mensaje inicial del chatbot con mejor presentación
            chatbox.innerHTML += `
                <div class="mensaje bot">
                    <p><strong>🤖 ALEXIA:</strong> ${emotionMessage}</p>
                </div>
            `;
            chatbox.scrollTop = chatbox.scrollHeight; // Hacer scroll para ver el último mensaje
        })
        .catch(error => console.error("Error:", error));
    });

    // Enviar mensaje al chatbot manualmente
    sendMessageBtn.addEventListener("click", () => sendMessage());
    userInput.addEventListener("keypress", function (event) {
        if (event.key === "Enter") {
            sendMessage();
        }
    });

    // Obtener el nombre del usuario desde localStorage
    const usuario = localStorage.getItem("nombreUsuario") || "Invitado";

    // Función para enviar mensajes al chatbot
    function sendMessage(initialMessage = "") {
        let message = initialMessage || userInput.value.trim();
    
        if (message !== "") {
            // Agregar el mensaje del usuario
            chatbox.innerHTML += `
                <div class="mensaje usuario">
                    <p><strong>🧑 ${usuario}:</strong> ${message}</p>
                </div>
            `;
            userInput.value = "";
    
            // 💬 Mostrar el efecto de "escribiendo..."
            const typingIndicator = document.createElement("div");
            typingIndicator.classList.add("mensaje", "bot");
            typingIndicator.innerHTML = `<p><strong>🤖 ALEXIA:</strong> <em>Está escribiendo...</em></p>`;
            chatbox.appendChild(typingIndicator);
            chatbox.scrollTop = chatbox.scrollHeight;
    
            // ⏳ Simular escritura durante 1.5 segundos antes de responder
            setTimeout(() => {
                getChatbotResponse(message).then(response => {
                    // Eliminar el indicador de escritura
                    chatbox.removeChild(typingIndicator);
    
                    // Limpiar ** y * en la respuesta
                    let cleanResponse = response.replace(/\*\*/g, "").replace(/\*/g, "");
    
                    // Agregar el mensaje del chatbot
                    chatbox.innerHTML += `
                        <div class="mensaje bot">
                            <p><strong>🤖 ALEXIA:</strong> ${cleanResponse}</p>
                        </div>
                    `;
                    chatbox.scrollTop = chatbox.scrollHeight;
                });
            }, 1500); // ⏳ Espera 1.5 segundos antes de mostrar la respuesta
        }
    }

    // Obtener respuesta del chatbot usando Gemini AI
    async function getChatbotResponse(input) {
        const apiKey = "AIzaSyDzICOxy2E1YX4bmhh9sc7YnBqsguiYYPU";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const data = {
            contents: [{ role: "user", parts: [{ text: input }] }]
        };

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.candidates && result.candidates.length > 0) {
                return result.candidates[0].content.parts[0].text;
            } else {
                return "Lo siento, no entendí bien. 🤖";
            }
        } catch (error) {
            console.error("Error con la API:", error);
            return "Lo siento, hubo un problema con la conexión. 😕";
        }
    }
});
