# QPlay 👑

QPlay es una aplicación web de código abierto para crear y jugar cuestionarios interactivos en tiempo real. Diseñada especialmente para el entorno educativo, permite gamificar el aula de forma sencilla y dinámica, funcionando en cualquier dispositivo con un navegador web moderno.


---

## Características principales

* **Juego en tiempo real**: El presentador controla el ritmo de la partida y los jugadores ven las preguntas y resultados al instante.
* **Múltiples tipos de pregunta**: Soporte para Quiz (una respuesta correcta), Respuesta Múltiple (varias respuestas correctas) y Verdadero/Falso.
* **Soporte para Markdown y LaTeX**: Las preguntas y respuestas pueden incluir formato de texto enriquecido y fórmulas matemáticas complejas gracias a KaTeX.
* **Sin necesidad de servidor central**: Utiliza tecnología P2P (PeerJS) para la comunicación directa entre el presentador y los jugadores, eliminando la necesidad de un backend complejo.
* **Internacionalización (i18n)**: La interfaz está disponible en varios idiomas (español, catalán, inglés, gallego y euskera) y es fácilmente extensible.
* **Accesibilidad**: Los jugadores se unen fácilmente con un código corto de 5 letras, sin necesidad de registros. Se genera un código QR para un acceso aún más rápido.
* **Herramientas de creación integradas**:
    * Un **editor manual** (`editor.html`) para crear y modificar preguntas una a una, con previsualización en tiempo real.
    * Un **asistente con IA** (`editor_ia.html`) que genera un prompt optimizado para modelos como ChatGPT, permitiendo crear cuestionarios completos a partir de un tema y un nivel educativo.
* **Gestión de cuestionarios**: Guarda y carga tus cuestionarios en un sencillo formato CSV.

## Tecnologías utilizadas

* **Frontend**: HTML5, CSS3, JavaScript (ES6+)
* **Frameworks y Librerías**:
    * **Tailwind CSS**: Para un diseño de interfaz moderno y responsivo.
    * **PeerJS**: Para la comunicación P2P entre clientes.
    * **KaTeX**: Para el renderizado de fórmulas matemáticas LaTeX.
    * **marked.js**: Para el parseo de Markdown.
    * **qrcode.js**: Para la generación de códigos QR.

## Uso

1.  **Como Presentador**:
    * Abre el fichero `index.html` en tu navegador.
    * Carga un cuestionario en formato `.csv` o crea uno nuevo usando los editores.
    * Comparte el código de la partida o el QR con los jugadores.
    * Inicia el juego y controla el avance de las preguntas.

2.  **Como Jugador**:
    * Accede al fichero `jugador.html` desde cualquier dispositivo.
    * Introduce tu nombre y el código de la partida proporcionado por el presentador.
    * ¡A jugar! Responde a las preguntas antes de que se acabe el tiempo.

## Autor

Creado por **Juan José de Haro**.
* **Web**: [bilatria.org](https://bilatria.org)

## Licencia

Este proyecto está bajo la Licencia [Creative Commons BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

## Sugerencias y errores

Si encuentras algún error o tienes una idea para mejorar la aplicación, no dudes en comunicarlo.
* **Escribe un comentario o sugerencia**: [Abrir una issue en GitHub](https://github.com/jjdeharo/qplay/issues)
