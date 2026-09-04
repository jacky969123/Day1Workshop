# Snip CLI

A zero-dependency Node.js command-line client for the Snip URL shortener
backend.

## Usage

```
snip add <url>    Shorten a URL, prints the returned shortUrl
snip ls           List all links as an aligned code/hits/url table
snip open <code>  Resolve a short code and open it in your browser
snip help         Show usage text
```

Running `snip` with no arguments shows the same usage text.

## Configuration

Set `SNIP_API` to point at a non-default backend:

```
SNIP_API=https://snip.example.com snip ls
```

Defaults to `http://localhost:3000`.

## Errors

Bad input, unknown short codes, and unreachable backends all print a
message to stderr and exit with status code 1.

## Install

```
npm install -g .
```

This registers the `snip` bin (see `cli.js`, `package.json`). Platform
wrapper scripts (`snip`, `snip.cmd`, `snip.ps1`) are also provided for
running the CLI directly without a global npm install.
