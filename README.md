# Servicio de emparejamiento FIDE (bbpPairings) — Movimiento Maestro

Microservicio HTTP que ejecuta **bbpPairings** (motor abierto que implementa el
Sistema Holandés FIDE, con parejas idénticas a JaVaFo) y devuelve los emparejamientos.
Es lo que apunta un subdominio tipo `pareos.movimientomaestro.mx`, igual que Tornelo
apunta `javafo.tornelo.com` a su propio servidor.

## Por qué un servicio aparte
El plan **HostGator Business es hosting compartido**: no hay Java y `exec`/`proc_open`
suelen estar deshabilitados, así que el motor no puede correr dentro del WordPress.
Un subdominio en el mismo plan compartido = mismo servidor = mismas limitaciones. La
solución es apuntar el subdominio a una máquina que sí pueda ejecutar el binario.

## Contrato de la API
- `GET /health` -> `{"ok":true}`
- `POST /pair` (body = TRF en texto plano; header opcional `x-api-key`)
  - `?system=dutch` (por defecto) o `?system=burstein`
  - Respuesta: `{ ok, system, ngames, pairings:[{white,black}], byes:[id] }`
    (los números son los "start number" de cada jugador en el TRF; `byes` = quien descansa)

## Desplegar (elige uno)
Todas soportan Docker; sube este folder a un repo y conéctalo, o usa la CLI.
- **VPS HostGator** (mismo proveedor): instala Docker y `docker build -t pairing . && docker run -d -p 8080:8080 -e API_KEY=... pairing`. Apunta el subdominio (A record) a la IP del VPS + proxy TLS (Caddy/Nginx).
- **Render / Railway / Fly.io / Google Cloud Run**: crear servicio desde el repo; detectan el Dockerfile. Añade la variable `API_KEY`. Te dan una URL HTTPS; apunta el subdominio con CNAME.
- Prueba local: `docker build -t pairing . && docker run -p 8080:8080 pairing` y `curl -X POST --data-binary @ejemplo.trf localhost:8080/pair`.

## Seguridad
Define `API_KEY` (variable de entorno). El plugin WordPress la enviará en `x-api-key`.
Sin `API_KEY` el servicio queda abierto (solo para pruebas).

## Qué falta del lado WordPress (siguiente paso)
El plugin generará el TRF del torneo (jugadores + rating + resultados de rondas previas)
y llamará a `POST /pair`. Requisito: guardar un **rating/número de siembra** por jugador
al inscribirlo (FIDE ordena por rating).
