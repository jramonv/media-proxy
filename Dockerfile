FROM node:20-slim

USER root
RUN apt-get update && apt-get install -y ffmpeg python3-pip \
 && pip3 install yt-dlp && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

RUN npm install --omit=dev

EXPOSE 8080
CMD ["npm", "start"]
