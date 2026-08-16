FROM python:3.12-slim

WORKDIR /app

# Copy dependencies and source code
COPY pyproject.toml README.md ./
COPY src/ ./src/

# Install python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --timeout 100 --retries 10 .

EXPOSE 8001

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8001"]
