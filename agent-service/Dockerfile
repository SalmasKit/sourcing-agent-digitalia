FROM python:3.12-slim

WORKDIR /app

# Copy dependency files
COPY pyproject.toml README.md ./
COPY src/ ./src/

# Install PyTorch CPU lightweight build first to avoid downloading 2GB CUDA wheels
RUN pip install --no-cache-dir --default-timeout=1000 torch --index-url https://download.pytorch.org/whl/cpu

# Install remaining package dependencies
RUN pip install --no-cache-dir --default-timeout=1000 --retries 10 .

EXPOSE 8001

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8001"]
