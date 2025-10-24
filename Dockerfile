FROM node:20-bookworm

# Instalar yt-dlp desde APT (sin pip) y ffmpeg
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg yt-dlp \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .
RUN npm install --omit=dev

EXPOSE 8080
CMD ["npm", "start"]

