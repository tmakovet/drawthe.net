FROM nginx:latest

EXPOSE 80

COPY  build /opt/drawthenet/build/
COPY  examples /opt/drawthenet/examples/
COPY  templates /opt/drawthenet/templates/
COPY  *.html /opt/drawthenet/

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/drawthenet.conf

ENTRYPOINT ["nginx", "-g", "daemon off;"]