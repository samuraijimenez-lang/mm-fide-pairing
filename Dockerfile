# Servicio de emparejamiento FIDE (Sistema Holandés) — bbpPairings + Node
# Etapa 1: compilar bbpPairings desde el código fuente (motor abierto, C++).
FROM gcc:13 AS build
RUN git clone --depth 1 https://github.com/BieremaBoyzProgramming/bbpPairings /src \
    && cd /src && make static=yes
# Etapa 2: runtime mínimo con Node.
FROM node:20-slim
WORKDIR /app
COPY --from=build /src/bbpPairings.exe /app/bbpPairings
RUN chmod +x /app/bbpPairings
COPY server.js /app/server.js
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]
