FROM node:20-bookworm

# Instala ffmpeg y dependencias de Python necesarias para yt-dlp
RUN apt-get update && apt-get install -y ffmpeg python3 python3-pip python3-setuptools python3-wheel \
 && pip3 install --no-cache-dir yt-dlp \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .
RUN npm install --omit=dev

EXPOSE 8080
CMD ["npm", "start"]

