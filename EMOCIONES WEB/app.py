from flask import Flask, request, jsonify, render_template, redirect, url_for, session
from flask_mysqldb import MySQL
import cv2
import numpy as np
import os
from deepface import DeepFace
import MySQLdb.cursors
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)

# 📌 Configuración de MySQL
app.config["MYSQL_HOST"] = "127.0.0.1"
app.config["MYSQL_PORT"] = 3306
app.config["MYSQL_USER"] = "alexis"
app.config["MYSQL_PASSWORD"] = "Montiel_alexis77"
app.config["MYSQL_DB"] = "mindvibe"

# 📌 Clave secreta para manejar sesiones
app.config["SECRET_KEY"] = "clave_super_secreta"

mysql = MySQL(app)

# 📌 Carpeta para subir imágenes
UPLOAD_FOLDER = "static/uploads"
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# 📌 Función para preprocesar la imagen antes del análisis
def preprocess_image(image_path):
    image = cv2.imread(image_path)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
    
    if len(faces) == 0:
        return None  # No se detectó rostro

    return image_path

# 📌 Función para analizar la emoción con DeepFace
def analyze_emotion(image_path):
    try:
        # Se ejecuta la detección de emociones
        analysis = DeepFace.analyze(img_path=image_path, actions=["emotion"], enforce_detection=False)

        # Verifica si hay resultados
        if isinstance(analysis, list) and len(analysis) > 0:
            emotion = analysis[0]["dominant_emotion"]
            return emotion
        else:
            return "No se pudo detectar una emoción"
    except Exception as e:
        return f"Error en análisis: {str(e)}"


# 📌 Chatbot basado en emoción detectada
def chatbot_response(emotion):
    responses = {
        "happy": "¡Genial! Sigue disfrutando tu día. 😊",
        "sad": "Parece que estás triste. ¿Quieres escuchar música relajante? 🎶",
        "angry": "Respira profundo. ¿Te gustaría hacer una actividad para calmarte? 🧘",
        "surprise": "¡Vaya! Algo inesperado pasó. ¿Quieres compartirlo? 🤔",
        "fear": "Todo estará bien. Trata de relajarte un poco. 💙",
        "neutral": "Todo parece tranquilo. ¡Sigue adelante! 🚀",
        "disgust": "Algo te desagrada. Tal vez hablar de ello te ayude. 🧐",
        "contempt": "Pareces molesto. ¿Qué te gustaría hacer para relajarte? 🤨"
    }
    return responses.get(emotion, "No pude detectar la emoción. Inténtalo de nuevo.")

# 📌 Ruta para mostrar el formulario de registro
@app.route('/')
def formulario():
    return render_template('formulario.html')

# 📌 Ruta para guardar usuario en la BD y redirigir al login
@app.route('/guardar', methods=['POST'])
def guardar():
    if request.method == 'POST':
        nombre = request.form['nombre']
        correo = request.form['correo']
        contraseña = request.form['contraseña']

        # Encriptar la contraseña antes de guardarla
        hashed_password = generate_password_hash(contraseña)

        cur = mysql.connection.cursor()
        cur.execute("INSERT INTO usuarios (nombre, correo, contraseña) VALUES (%s, %s, %s)", 
                    (nombre, correo, hashed_password))
        mysql.connection.commit()
        cur.close()

        return redirect(url_for('login'))  # Redirige al login

# 📌 Ruta para iniciar sesión
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        correo = request.form['correo']
        contraseña = request.form['contraseña']

        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        cursor.execute("SELECT * FROM usuarios WHERE correo = %s", (correo,))
        usuario = cursor.fetchone()

        if usuario and check_password_hash(usuario['contraseña'], contraseña):
            session['usuario'] = usuario['nombre']
            return redirect(url_for('index'))  # Redirige a la página de detección
        else:
            return "Credenciales incorrectas. <a href='/login'>Intentar de nuevo</a>"

    return render_template('login.html')

# 📌 Ruta para cerrar sesión
@app.route('/logout')
def logout():
    session.pop('usuario', None)
    return redirect(url_for('login'))

# 📌 Ruta para la detección de emociones (requiere sesión)
@app.route('/detectar', methods=['GET'])
def index():
    if 'usuario' in session:
        return render_template("index.html", usuario=session['usuario'])
    return redirect(url_for('login'))  # Redirige al login si no hay sesión

# 📌 Ruta para analizar la emoción desde una imagen
@app.route("/analyze", methods=["POST"])
def analyze():
    if "file" not in request.files:
        return jsonify({"error": "No se envió ninguna imagen"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "Nombre de archivo vacío"}), 400

    file_path = os.path.join(app.config["UPLOAD_FOLDER"], file.filename)
    file.save(file_path)

    emotion = analyze_emotion(file_path)
    message = chatbot_response(emotion)

    return jsonify({"emotion": emotion, "message": message})

# 📌 Ejecutar la aplicación
if __name__ == "__main__":
    app.run(debug=True)
