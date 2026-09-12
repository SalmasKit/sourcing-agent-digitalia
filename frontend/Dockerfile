FROM nginxinc/nginx-unprivileged:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY dist /usr/share/nginx/html
ARG BUILD_DATE
RUN echo $BUILD_DATE > /usr/share/nginx/html/build.txt
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]


