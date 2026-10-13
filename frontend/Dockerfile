FROM nginx:alpine

# Salin konfigurasi kustom Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Salin file frontend statis ke web root Nginx
COPY . /usr/share/nginx/html

# Hapus file konfigurasi dan helper yang tidak perlu di-serve oleh Nginx
RUN rm -f /usr/share/nginx/html/nginx.conf \
          /usr/share/nginx/html/Dockerfile \
          /usr/share/nginx/html/server.js \
          /usr/share/nginx/html/vercel.json \
          /usr/share/nginx/html/README.md

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
