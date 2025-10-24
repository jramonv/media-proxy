FROM node:20-bookworm

# ffmpeg + curl + última yt-dlp (binario oficial)
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg ca-certificates curl \
 && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
 && chmod a+rx /usr/local/bin/yt-dlp \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .
RUN npm install --omit=dev

EXPOSE 8080
CMD ["npm", "start"]


