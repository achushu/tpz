# Competition Setup

## Build (Docker)

Create a Docker image with the `Dockerfile`
`docker build .`

Start a container and mount the host project home as a volume
`docker run -it -v <project_home>:/mnt/ten-point-zero <image_name>`

(Inside the container) Navigate to the mounted project home
`cd /mnt/ten-point-zero`

Build and package
`make dist`

Installation package can be found in `dist/` in the host project home

## On a previously setup machine

\* Assuming install directory `~/ten-point-zero/`

`cd ten-point-zero/install/scripts`
`chmod +x *.sh`
`sudo -u postgres ./reset_database.sh`
`cd ~/ten-point-zero/`
`./createuser`

## Run

`./tpz server config.yml`
