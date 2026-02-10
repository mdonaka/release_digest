FROM denoland/deno:2.1.4

WORKDIR /app

COPY . .

RUN deno cache manifest.ts

CMD ["task", "dev"]
