FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt
COPY server.py .
RUN useradd --create-home app
USER app
ENV HF_HOME=/home/app/.cache/huggingface
EXPOSE 8001
CMD ["python", "server.py", "--host", "0.0.0.0"]
