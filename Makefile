APPNAME=ten-point-zero
BINARY=tpz
LINUX_ARCHIVE=${APPNAME}-${REV}_linux.tar.gz

PROJ_HOME=.
BIN_PATH=${PROJ_HOME}/bin
DIST_PATH=${PROJ_HOME}/dist
STAGING_AREA=${DIST_PATH}/${APPNAME}
CONFIG_FILE=${PROJ_HOME}/config/config.yml
INSTALL_FILES=${PROJ_HOME}/install
AUTOGEN_FILES=${PROJ_HOME}/data/generate/output
ARTIFACTS=${CONFIG_FILE} ${INSTALL_FILES}

VERSION=$(shell git describe --tags --abbrev=0)
REV=$(shell git describe --tags --long --dirty)
LDFLAGS=-ldflags "-X ${APPNAME}/cmd.Version=${VERSION} -X ${APPNAME}/cmd.Build=${BUILD}"

.DEFAULT_GOAL: build

.PHONY: build
build:
	# Run tests
	go test -race -tags debug,nodb ./...
	go vet ./...
	
	# Make binary
	mkdir -p ${BIN_PATH}
	go build ${LDFLAGS} -trimpath -tags pg -o ${BIN_PATH}/${BINARY} .

.PHONY: dist
dist:
	# Run tests
	go test -tags debug,nodb ./...
	go vet ./...

	# Clean the target destination for staging
	rm -rf ${DIST_PATH}/*
	mkdir -p ${STAGING_AREA}

	# Build for Linux and stage artifacts
	rsync -r --exclude='*/*.go' app/ ${STAGING_AREA}/app
	cp -r ${ARTIFACTS} ${STAGING_AREA}
	GOOS=linux go build ${LDFLAGS} -trimpath -tags pg -o ${STAGING_AREA}/${BINARY} .
	# User management tool
	GOOS=linux go build -trimpath -o ${STAGING_AREA}/createuser user/main.go

	# Package everything
	sleep 5
	chmod +x ${STAGING_AREA}/${BINARY} ${STAGING_AREA}/createuser
	tar -C ${DIST_PATH}/ -czpf ${LINUX_ARCHIVE} ${APPNAME}
	rm -rf ${DIST_PATH}/*
	mv ${LINUX_ARCHIVE} ${DIST_PATH}/

.PHONY: debug
debug:
	# Run tests
	go test -race -tags debug,nodb ./...
	go vet ./...

	# Make binary
	mkdir -p ${BIN_PATH}
	go build ${LDFLAGS} -race -trimpath -tags debug,profile,nodb -o ${BIN_PATH}/${BINARY} .
