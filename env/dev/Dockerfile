FROM ubuntu:22.04

ARG GOVER=1.20.3
ARG GOPKG=go${GOVER}.linux-amd64.tar.gz

RUN apt update -qq
RUN apt upgrade -qq -y

RUN apt install -y -qq wget rsync cmake git

# install Go
RUN wget https://go.dev/dl/${GOPKG}
RUN tar -xf ${GOPKG} && mv go /usr/local
ENV GOROOT=/usr/local/go
ENV PATH=$GOROOT/bin:$PATH