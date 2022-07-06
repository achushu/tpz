FROM ubuntu:18.04

ARG GOVER=1.18.2
ARG GOPKG=go${GOVER}.linux-amd64.tar.gz

RUN apt update -qq
RUN apt upgrade -qq -y

RUN apt install -y -qq wget
RUN wget https://go.dev/dl/${GOPKG}
RUN tar -xf ${GOPKG} && mv go /usr/local

ENV GOROOT=/usr/local/go
ENV PATH=$GOROOT/bin:$PATH