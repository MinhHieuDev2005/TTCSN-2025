# Base image
FROM node:18-alpine as build

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy application files
COPY . .

# Build environment variable
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Build application
RUN npm run build

# Serve application
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80
