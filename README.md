# Ten Point Zero

Competition judging and management system designed for wushu.

Offers ring-based scoring and interfaces for competition management and score displays.

## Wushu

Supports scoring and rulesets for wushu / kung fu competitions.

### Ten point scoring (USWU)

- Offers hints for common deductions and scoring guidelines

### International Wushu Federation (IWUF)

- Scoring interfaces for A, B, and C panel judges
- Deduction validation and timing for A panel judges
- Simple interface with scoring guidelines for B panel judges
- Nandu sheet with descriptive names and point values for C panel judges

## User Guide

### Start Server

`./tpz server`

### Reset Database

Given a file of competition data exists at `./install/pg/competition.sql`:

`cd install/bin`
`sudo -u postgres ./reset_database.sh`
`sudo -u postgres psql -d tpz --file=../pg/competition.sql`
`cd ../..`
`./createuser`

### Security

Current security relies on a secured local network where all the clients are trusted.

## Installation

### Ubuntu 18.04 (Bionic)

NOTE: The installer will create a user, `tpzadmin` to administer the `tpz` database.

1. Unpack the archive
    - `tar -xzf ten-point-zero.tar.gz`
2. Go to the installation scripts
   - `cd ten-point-zero/install/bin`
3. Install or configure PostgreSQL (other SQL dbs, ie. MySQL, may work -- untested)
   - Install PostgreSQL: `sudo ./install_pg.sh`
   - OR configure existing installation: `sudo ./config_pg.sh`
4. Create the `tpz` database as the superuser (postgres)
   - `sudo -u postgres ./setup_database.sh`
5. Insert competition data as the superuser
   - `sudo -u postgres psql -d tpz --file=competition.sql`

## Recommended Hardware and Setup

- Wired connections for each computer OR a wireless router per ring

## Competitions

This software has been used at the following competitions:

- Terpwushu 13th University Wushu Games 2017
- Terpwushu 14th University Wushu Games 2018
- Terpwushu 15th University Wushu Games 2019
- Terpwushu Intercollege Wushu Games 2022

## Usability Statistics

### 14th UWG (2018)

Time per competitor (seconds):

- average: 135.5
- median: 136.7
- stdev: 32.2

Time to produce score (seconds):

- average: 31.4
- median: 28.6

stdev: 13.0

## Build

- Run `go mod tidy` to pull the necessary dependencies
- Build scripts target Linux as the platform
- Alternatively: build manually from the project home with `go build [-tags <TAG> [,TAG2 ...]] -o main.go .`
  - Example: `go build -tags debug,nodb -o tpz.exe .`

### Build Tags

Build the binary with these tags to alter normal behavior

- `debug`: enable debug output
- `nodb`: use a mock (in-memory) database for testing
- `pg`: use PostgreSQL database (default)

### Windows

- Run the powershell script `powershell .\make.ps1`

## Develop

- Install code generators
  - Install the Go stringer tool: `go get golang.org/x/tools/cmd/stringer`
- Generate code (must be run any time respective definitions are changed)
  - Generate string enumerations: `go generate ./...`

### Layout

- `app/` - client-side files and server code that create the views for the user.
  - `tpz.html` defines the main template
  - Go code points to the file and provides values to be used with the template
  - Other views are organized in their own subdirectories
- `cmd/` - defines commandline options and flags available for the binary
- `config/` - parses and monitors the configuration file
- `data/` - models, current state, and interfaces with the underlying database
- `install/` - files to assist with installing the software
- `reference/` - official documents relevant to the sport for reference
- `server/` - routes for requests and connection management
  - Requests for views are controlled here
- `tools/` - convenience apps
- `vendor/` - Saved third-party dependencies

### Authentication

User passwords are hashed first with SHA-512 and followed by bcrypt

### Known Issues

- Excessive websockets connections lost / general slow response when router is overburdened
