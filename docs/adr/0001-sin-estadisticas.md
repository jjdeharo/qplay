# 1. QPlay no recoge estadísticas de uso

Fecha: 2026-10-30 · Estado: aceptado

## Contexto

Desde marzo de 2026, `analytics.js` enviaba cada visita a un contador propio en bilateria.org (`https://bilateria.org/app/estadistica/qplay/track.php`), con una petición JSONP que se hacía después de cargar la página. Se cargaba en la portada del presentador (`index.html`) y en la página de los jugadores (`jugador.html`), y no contaba las visitas desde `localhost`. Para no contar dos veces al mismo navegador, guardaba la hora de la última visita en `localStorage` y solo volvía a contar al cabo de 30 minutos. La dirección del contador y el identificador del sitio iban en dos etiquetas `meta` de cada página.

En la portada llegó a mostrarse el recuento de visitas junto a un enlace «Privacidad» que explicaba el contador. A finales de ese mes se quitaron de la página, pero sus textos quedaron en los archivos de idioma.

La evaluación con la rúbrica VCER de la guía «Vibe coding responsable» puntúa con 0 el punto de datos personales si el recurso lleva analítica, sea propia o ajena. Además, cada visita hacía que el navegador del alumnado se comunicara con un servidor que no hace falta para jugar.

## Decisión

En la versión 1.3.4 se retira toda la analítica: el archivo `analytics.js`, su etiqueta `<script>` y las etiquetas `meta` `analytics-endpoint` y `analytics-site-id` de `index.html` y `jugador.html`. De los seis archivos de `locales/` se quitan las claves que ya no usaba ninguna página: `footer_analytics_visits`, `footer_analytics_today`, `footer_privacy_link` y `footer_privacy_notice`. QPlay solo se comunica ya con los servicios que necesita para funcionar: el servidor de señalización de PeerJS, que pone en contacto al presentador con los jugadores, y las bibliotecas que se cargan desde CDN.

## Alternativas descartadas

- **Mantener el contador propio.** No usaba cookies, pero seguía haciendo que cada navegador se comunicara con bilateria.org, y la rúbrica VCER puntúa con 0 cualquier analítica.

## Consecuencias

- Ya no hay cifras de uso de QPlay.
- Los datos del contador en el alojamiento de IONOS (`/app/estadistica/qplay/`) y en el panel central de estadísticas se archivan y se borran del servidor en una tarea aparte.
- En los navegadores que ya la visitaron queda la clave `analytics:last-visit:qplay` de `localStorage`, que ya no se lee ni se escribe.
