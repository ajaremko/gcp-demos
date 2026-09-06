FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS builder
WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev --extra gcp
COPY . .
RUN uv sync --frozen --no-dev --extra gcp

FROM python:3.12-slim-bookworm
WORKDIR /app
COPY --from=litestream/litestream:0.5 /usr/local/bin/litestream /usr/local/bin/litestream
COPY --from=builder /app /app
ENV PATH="/app/.venv/bin:$PATH"
ENTRYPOINT ["/app/entrypoint.sh"]
